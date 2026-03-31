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
