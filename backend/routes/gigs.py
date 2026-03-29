from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user

gigs_router = APIRouter(prefix="/gigs", tags=["gigs"])

SELLER_ROLES = {"producer", "artist", "engineer", "designer", "admin"}

class GigTier(BaseModel):
    price: float
    delivery_days: int
    description: str
    revisions: int
    features: List[str] = []

class GigCreate(BaseModel):
    title: str
    description: str
    category: str
    cover_url: Optional[str] = ""
    tags: List[str] = []
    tiers: Dict[str, Any]  # basic, standard, premium

class GigUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    cover_url: Optional[str] = None
    tags: Optional[List[str]] = None
    tiers: Optional[Dict[str, Any]] = None

class ReviewCreate(BaseModel):
    rating: int
    comment: str
    order_id: str

@gigs_router.get("")
async def list_gigs(
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    db = get_db()
    query = {"status": "approved"}
    if category and category != "All":
        query["category"] = {"$regex": category, "$options": "i"}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"seller_name": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
    skip = (page - 1) * limit
    total = await db.gigs.count_documents(query)
    cursor = db.gigs.find(query).sort("created_at", -1).skip(skip).limit(limit)
    gigs = docs_to_list(await cursor.to_list(limit))
    return {"gigs": gigs, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@gigs_router.get("/my")
async def my_gigs(request: Request):
    user = await get_current_user(request)
    db = get_db()
    cursor = db.gigs.find({"seller_id": user["id"]}).sort("created_at", -1)
    return docs_to_list(await cursor.to_list(100))

@gigs_router.get("/{gig_id}")
async def get_gig(gig_id: str):
    db = get_db()
    gig = await db.gigs.find_one({"_id": ObjectId(gig_id)})
    if not gig:
        raise HTTPException(404, "Gig not found")
    await db.gigs.update_one({"_id": ObjectId(gig_id)}, {"$inc": {"total_views": 1}})
    # Enrich with reviews
    reviews_cursor = db.reviews.find({"gig_id": gig_id}).sort("created_at", -1).limit(10)
    reviews = docs_to_list(await reviews_cursor.to_list(10))
    result = doc_to_dict(gig)
    result["reviews"] = reviews
    return result

@gigs_router.post("")
async def create_gig(body: GigCreate, request: Request):
    user = await get_current_user(request)
    if user["role"] not in SELLER_ROLES:
        raise HTTPException(403, "Only sellers (producers, engineers, designers, artists) can create gigs")
    db = get_db()
    gig_doc = {
        **body.model_dump(),
        "seller_id": user["id"],
        "seller_name": user["name"],
        "seller_username": user.get("username", ""),
        "seller_avatar": user.get("avatar_url", ""),
        "rating": 0.0,
        "total_reviews": 0,
        "total_orders": 0,
        "status": "approved" if user["role"] == "admin" else "pending",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.gigs.insert_one(gig_doc)
    gig_doc["_id"] = result.inserted_id
    return doc_to_dict(gig_doc)

@gigs_router.patch("/{gig_id}")
async def update_gig(gig_id: str, body: GigUpdate, request: Request):
    user = await get_current_user(request)
    db = get_db()
    gig = await db.gigs.find_one({"_id": ObjectId(gig_id)})
    if not gig:
        raise HTTPException(404, "Gig not found")
    if str(gig["seller_id"]) != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.gigs.update_one({"_id": ObjectId(gig_id)}, {"$set": updates})
    updated = await db.gigs.find_one({"_id": ObjectId(gig_id)})
    return doc_to_dict(updated)

@gigs_router.delete("/{gig_id}")
async def delete_gig(gig_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    gig = await db.gigs.find_one({"_id": ObjectId(gig_id)})
    if not gig:
        raise HTTPException(404, "Gig not found")
    if str(gig["seller_id"]) != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    await db.gigs.delete_one({"_id": ObjectId(gig_id)})
    return {"message": "Gig deleted"}

@gigs_router.post("/{gig_id}/review")
async def add_review(gig_id: str, body: ReviewCreate, request: Request):
    user = await get_current_user(request)
    db = get_db()

    # Verify order exists and is completed by this buyer
    order = await db.orders.find_one({
        "_id": ObjectId(body.order_id),
        "buyer_id": user["id"],
        "gig_id": gig_id,
        "status": "completed"
    })
    if not order:
        raise HTTPException(400, "You can only review completed orders")

    # Prevent duplicate reviews
    if await db.reviews.find_one({"order_id": body.order_id, "reviewer_id": user["id"]}):
        raise HTTPException(400, "Already reviewed this order")

    if not (1 <= body.rating <= 5):
        raise HTTPException(400, "Rating must be 1-5")

    review_doc = {
        "gig_id": gig_id,
        "order_id": body.order_id,
        "reviewer_id": user["id"],
        "reviewer_name": user["name"],
        "rating": body.rating,
        "comment": body.comment,
        "created_at": datetime.now(timezone.utc)
    }
    await db.reviews.insert_one(review_doc)

    # Recalculate rating
    all_reviews = await db.reviews.find({"gig_id": gig_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
    await db.gigs.update_one(
        {"_id": ObjectId(gig_id)},
        {"$set": {"rating": round(avg_rating, 1)}, "$inc": {"total_reviews": 1}}
    )
    return doc_to_dict(review_doc)
