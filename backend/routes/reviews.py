from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user

reviews_router = APIRouter(prefix="/reviews", tags=["reviews"])

class ReviewSubmit(BaseModel):
    order_id: Optional[str] = None
    reservation_id: Optional[str] = None
    reviewee_id: str
    rating: int  # 1-5
    comment: str
    reviewer_role: str  # buyer | seller | renter | owner

@reviews_router.post("/submit")
async def submit_review(body: ReviewSubmit, request: Request):
    user = await get_current_user(request)
    db = get_db()

    if not (1 <= body.rating <= 5):
        raise HTTPException(400, "Rating must be between 1 and 5")

    # Verify the reviewer is part of the order/reservation
    ref_id = body.order_id or body.reservation_id
    collection = "orders" if body.order_id else "studio_reservations"

    if ref_id:
        doc = await db[collection].find_one({"_id": ObjectId(ref_id)})
        if not doc:
            raise HTTPException(404, "Order/reservation not found")
        buyer_key = "buyer_id" if body.order_id else "renter_id"
        seller_key = "seller_id" if body.order_id else "owner_id"
        if doc.get(buyer_key) != user["id"] and doc.get(seller_key) != user["id"]:
            raise HTTPException(403, "You are not part of this order")

    # Prevent duplicate reviews
    existing_query = {
        "reviewer_id": user["id"],
        "reviewee_id": body.reviewee_id,
    }
    if body.order_id:
        existing_query["order_id"] = body.order_id
    elif body.reservation_id:
        existing_query["reservation_id"] = body.reservation_id

    if await db.mutual_reviews.find_one(existing_query):
        raise HTTPException(400, "You have already reviewed this person for this order")

    review_doc = {
        "reviewer_id": user["id"],
        "reviewer_name": user["name"],
        "reviewer_role": body.reviewer_role,
        "reviewee_id": body.reviewee_id,
        "order_id": body.order_id,
        "reservation_id": body.reservation_id,
        "rating": body.rating,
        "comment": body.comment,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.mutual_reviews.insert_one(review_doc)
    review_doc["_id"] = result.inserted_id

    # Update reviewee's aggregate buyer/seller rating
    await _update_aggregate_rating(db, body.reviewee_id, body.reviewer_role)

    return doc_to_dict(review_doc)

async def _update_aggregate_rating(db, user_id: str, reviewer_role: str):
    """Recalculate and cache the user's aggregate rating as a buyer or seller."""
    try:
        reviews = await db.mutual_reviews.find({"reviewee_id": user_id}).to_list(1000)
        if not reviews:
            return
        avg = sum(r["rating"] for r in reviews) / len(reviews)
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "avg_rating": round(avg, 1),
                "total_reviews_received": len(reviews)
            }}
        )
    except Exception:
        pass

@reviews_router.get("/pending")
async def get_pending_reviews(request: Request):
    """Get orders/reservations that are completed but not yet reviewed by this user."""
    user = await get_current_user(request)
    db = get_db()

    pending = []

    # Completed orders where user hasn't reviewed the other party
    orders_cursor = db.orders.find({
        "$or": [{"buyer_id": user["id"]}, {"seller_id": user["id"]}],
        "status": "completed",
    })
    for order in await orders_cursor.to_list(50):
        other_id = order["seller_id"] if order["buyer_id"] == user["id"] else order["buyer_id"]
        already = await db.mutual_reviews.find_one({"reviewer_id": user["id"], "order_id": str(order["_id"])})
        if not already:
            pending.append({
                "type": "order",
                "id": str(order["_id"]),
                "title": order.get("gig_title", "Sipariş"),
                "other_party_id": other_id,
                "other_party_name": order["seller_name"] if order["buyer_id"] == user["id"] else order["buyer_name"],
                "reviewer_role": "buyer" if order["buyer_id"] == user["id"] else "seller",
                "completed_at": order.get("completed_at", ""),
            })

    # Completed reservations
    res_cursor = db.studio_reservations.find({
        "$or": [{"renter_id": user["id"]}, {"owner_id": user["id"]}],
        "status": "completed",
    })
    for res in await res_cursor.to_list(20):
        other_id = res["owner_id"] if res["renter_id"] == user["id"] else res["renter_id"]
        already = await db.mutual_reviews.find_one({"reviewer_id": user["id"], "reservation_id": str(res["_id"])})
        if not already:
            pending.append({
                "type": "reservation",
                "id": str(res["_id"]),
                "title": res.get("studio_name", "Stüdyo Rezervasyonu"),
                "other_party_id": other_id,
                "other_party_name": res["owner_name"] if res["renter_id"] == user["id"] else res["renter_name"],
                "reviewer_role": "renter" if res["renter_id"] == user["id"] else "owner",
                "completed_at": res.get("created_at", ""),
            })

    return pending

@reviews_router.get("/user/{user_id}")
async def get_user_reviews(user_id: str):
    """Get all reviews received by a user — shown on public profile."""
    db = get_db()
    cursor = db.mutual_reviews.find({"reviewee_id": user_id}).sort("created_at", -1).limit(20)
    reviews = docs_to_list(await cursor.to_list(20))
    avg = sum(r["rating"] for r in reviews) / len(reviews) if reviews else 0
    return {
        "reviews": reviews,
        "avg_rating": round(avg, 1),
        "total": len(reviews)
    }
