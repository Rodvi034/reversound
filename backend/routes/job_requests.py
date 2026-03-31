from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user

job_requests_router = APIRouter(prefix="/job-requests", tags=["job_requests"])

CATEGORIES = ["Mixing & Mastering", "Beat Production", "Vocal Production", "Cover Art", "Music Video", "Songwriting", "Distribution", "Other"]

class JobRequestCreate(BaseModel):
    title: str
    description: str
    category: str
    budget_min: float
    budget_max: float
    delivery_days: int
    genres: List[str] = []
    attachments: List[str] = []

class ProposalCreate(BaseModel):
    message: str
    price: float
    delivery_days: int
    gig_id: Optional[str] = None  # optional reference to seller's gig

@job_requests_router.get("")
async def list_job_requests(
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    status: str = "open"
):
    db = get_db()
    query = {"status": status}
    if category and category != "All":
        query["category"] = {"$regex": category, "$options": "i"}
    skip = (page - 1) * limit
    total = await db.job_requests.count_documents(query)
    cursor = db.job_requests.find(query).sort("created_at", -1).skip(skip).limit(limit)
    requests = docs_to_list(await cursor.to_list(limit))
    return {"requests": requests, "total": total}

@job_requests_router.post("")
async def create_job_request(body: JobRequestCreate, request: Request):
    user = await get_current_user(request)
    db = get_db()
    doc = {
        **body.model_dump(),
        "buyer_id": user["id"],
        "buyer_name": user["name"],
        "buyer_username": user.get("username", ""),
        "status": "open",
        "proposals_count": 0,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.job_requests.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc_to_dict(doc)

@job_requests_router.get("/{request_id}")
async def get_job_request(request_id: str, request: Request = None):
    db = get_db()
    job = await db.job_requests.find_one({"_id": ObjectId(request_id)})
    if not job:
        raise HTTPException(404, "Job request not found")
    result = doc_to_dict(job)
    # Include proposals if owner or authenticated
    proposals_cursor = db.proposals.find({"job_request_id": request_id}).sort("created_at", -1)
    proposals = docs_to_list(await proposals_cursor.to_list(50))
    result["proposals"] = proposals
    return result

@job_requests_router.post("/{request_id}/proposals")
async def submit_proposal(request_id: str, body: ProposalCreate, request: Request):
    user = await get_current_user(request)
    db = get_db()
    job = await db.job_requests.find_one({"_id": ObjectId(request_id)})
    if not job:
        raise HTTPException(404, "Job request not found")
    if job["status"] != "open":
        raise HTTPException(400, "Job request is closed")
    if job["buyer_id"] == user["id"]:
        raise HTTPException(400, "Cannot propose on your own job request")

    # Prevent duplicate proposals
    existing = await db.proposals.find_one({"job_request_id": request_id, "seller_id": user["id"]})
    if existing:
        raise HTTPException(400, "Already submitted a proposal")

    proposal_doc = {
        "job_request_id": request_id,
        "seller_id": user["id"],
        "seller_name": user["name"],
        "seller_username": user.get("username", ""),
        "message": body.message,
        "price": body.price,
        "delivery_days": body.delivery_days,
        "gig_id": body.gig_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.proposals.insert_one(proposal_doc)
    proposal_doc["_id"] = result.inserted_id
    await db.job_requests.update_one({"_id": ObjectId(request_id)}, {"$inc": {"proposals_count": 1}})
    return doc_to_dict(proposal_doc)

@job_requests_router.post("/{request_id}/proposals/{proposal_id}/accept")
async def accept_proposal(request_id: str, proposal_id: str, request: Request):
    """Buyer accepts a proposal → creates an escrow order."""
    user = await get_current_user(request)
    db = get_db()

    job = await db.job_requests.find_one({"_id": ObjectId(request_id)})
    if not job:
        raise HTTPException(404, "Job request not found")
    if job["buyer_id"] != user["id"]:
        raise HTTPException(403, "Only the buyer can accept proposals")
    if job["status"] != "open":
        raise HTTPException(400, "Job request is not open")

    proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id), "job_request_id": request_id})
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    if proposal["status"] != "pending":
        raise HTTPException(400, f"Proposal is already {proposal['status']}")

    price = proposal["price"]
    buyer_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    if buyer_doc.get("wallet_balance", 0) < price:
        raise HTTPException(400, f"Insufficient balance. Need ₺{price:.2f}, have ₺{buyer_doc.get('wallet_balance', 0):.2f}")

    seller_doc = await db.users.find_one({"_id": ObjectId(proposal["seller_id"])})
    seller_name = seller_doc.get("name", "") if seller_doc else ""

    # Deduct escrow
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$inc": {"wallet_balance": -price, "escrow_balance": price}})

    from datetime import timedelta
    due_date = datetime.now(timezone.utc) + timedelta(days=proposal["delivery_days"])
    order_doc = {
        "buyer_id": user["id"],
        "buyer_name": buyer_doc.get("name", ""),
        "seller_id": proposal["seller_id"],
        "seller_name": seller_name,
        "gig_id": proposal.get("gig_id"),
        "gig_title": f"İş Talebi: {job['title'][:50]}",
        "tier": "custom",
        "tier_description": proposal["message"][:100],
        "price": price,
        "delivery_days": proposal["delivery_days"],
        "revisions": 1,
        "requirements": job.get("description", ""),
        "status": "funded",
        "escrow_status": "held",
        "due_date": due_date,
        "revisions_used": 0,
        "attachments": [],
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.orders.insert_one(order_doc)
    order_id = str(result.inserted_id)

    # Update proposal and job status
    await db.proposals.update_one({"_id": ObjectId(proposal_id)}, {"$set": {"status": "accepted"}})
    await db.proposals.update_many(
        {"job_request_id": request_id, "_id": {"$ne": ObjectId(proposal_id)}},
        {"$set": {"status": "declined"}}
    )
    await db.job_requests.update_one({"_id": ObjectId(request_id)}, {"$set": {"status": "closed"}})

    return {"message": "Teklif kabul edildi. Escrow oluşturuldu.", "order_id": order_id}

@job_requests_router.patch("/{request_id}/close")
async def close_job_request(request_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    job = await db.job_requests.find_one({"_id": ObjectId(request_id)})
    if not job:
        raise HTTPException(404, "Not found")
    if job["buyer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    await db.job_requests.update_one({"_id": ObjectId(request_id)}, {"$set": {"status": "closed"}})
    return {"message": "Job request closed"}
