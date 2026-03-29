from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import require_admin

admin_router = APIRouter(prefix="/admin", tags=["admin"])

class UserUpdateRequest(BaseModel):
    is_banned: Optional[bool] = None
    is_verified: Optional[bool] = None
    role: Optional[str] = None
    subscription_tier: Optional[str] = None

class ContentStatusRequest(BaseModel):
    status: str  # approved | rejected
    reason: Optional[str] = None

class SubmissionCreate(BaseModel):
    track_url: str
    title: str
    genre: str
    description: Optional[str] = ""

class PlaylistCreate(BaseModel):
    name: str
    description: str
    genre: str
    cover_url: Optional[str] = ""

class DisputeResolveRequest(BaseModel):
    resolution: str  # release_to_seller | refund_to_buyer
    admin_note: str

@admin_router.get("/stats")
async def get_stats(request: Request):
    await require_admin(request)
    db = get_db()
    stats = {
        "total_users": await db.users.count_documents({}),
        "total_beats": await db.beats.count_documents({}),
        "pending_beats": await db.beats.count_documents({"status": "pending"}),
        "total_gigs": await db.gigs.count_documents({}),
        "pending_gigs": await db.gigs.count_documents({"status": "pending"}),
        "total_orders": await db.orders.count_documents({}),
        "active_orders": await db.orders.count_documents({"status": {"$in": ["funded", "in_progress", "delivered"]}}),
        "disputed_orders": await db.orders.count_documents({"status": "disputed"}),
        "total_submissions": await db.submissions.count_documents({}),
        "pending_submissions": await db.submissions.count_documents({"status": "pending"}),
    }
    return stats

@admin_router.get("/users")
async def list_users(request: Request, page: int = 1, limit: int = 20, search: Optional[str] = None):
    await require_admin(request)
    db = get_db()
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"username": {"$regex": search, "$options": "i"}}
        ]
    skip = (page - 1) * limit
    total = await db.users.count_documents(query)
    cursor = db.users.find(query, {"password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit)
    users = docs_to_list(await cursor.to_list(limit))
    return {"users": users, "total": total}

@admin_router.patch("/users/{user_id}")
async def update_user(user_id: str, body: UserUpdateRequest, request: Request):
    await require_admin(request)
    db = get_db()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No updates provided")
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    updated = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    return doc_to_dict(updated)

@admin_router.get("/beats")
async def list_all_beats(request: Request, status: Optional[str] = None, page: int = 1, limit: int = 20):
    await require_admin(request)
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    skip = (page - 1) * limit
    total = await db.beats.count_documents(query)
    cursor = db.beats.find(query).sort("created_at", -1).skip(skip).limit(limit)
    return {"beats": docs_to_list(await cursor.to_list(limit)), "total": total}

@admin_router.patch("/beats/{beat_id}/status")
async def update_beat_status(beat_id: str, body: ContentStatusRequest, request: Request):
    await require_admin(request)
    db = get_db()
    if body.status not in ("approved", "rejected"):
        raise HTTPException(400, "Invalid status")
    await db.beats.update_one(
        {"_id": ObjectId(beat_id)},
        {"$set": {"status": body.status, "moderation_note": body.reason}}
    )
    return {"message": f"Beat {body.status}"}

@admin_router.get("/gigs")
async def list_all_gigs(request: Request, status: Optional[str] = None, page: int = 1, limit: int = 20):
    await require_admin(request)
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    skip = (page - 1) * limit
    total = await db.gigs.count_documents(query)
    cursor = db.gigs.find(query).sort("created_at", -1).skip(skip).limit(limit)
    return {"gigs": docs_to_list(await cursor.to_list(limit)), "total": total}

@admin_router.patch("/gigs/{gig_id}/status")
async def update_gig_status(gig_id: str, body: ContentStatusRequest, request: Request):
    await require_admin(request)
    db = get_db()
    if body.status not in ("approved", "rejected"):
        raise HTTPException(400, "Invalid status")
    await db.gigs.update_one(
        {"_id": ObjectId(gig_id)},
        {"$set": {"status": body.status, "moderation_note": body.reason}}
    )
    return {"message": f"Gig {body.status}"}

@admin_router.get("/submissions")
async def list_submissions(request: Request, status: Optional[str] = "pending"):
    await require_admin(request)
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    cursor = db.submissions.find(query).sort("created_at", -1)
    return docs_to_list(await cursor.to_list(100))

@admin_router.patch("/submissions/{sub_id}")
async def review_submission(sub_id: str, body: ContentStatusRequest, request: Request):
    user = await require_admin(request)
    db = get_db()
    if body.status not in ("approved", "rejected"):
        raise HTTPException(400, "Invalid status")
    await db.submissions.update_one(
        {"_id": ObjectId(sub_id)},
        {"$set": {
            "status": body.status,
            "curator_notes": body.reason,
            "reviewed_by": user["id"],
            "reviewed_at": datetime.now(timezone.utc)
        }}
    )
    return {"message": f"Submission {body.status}"}

@admin_router.get("/playlists")
async def list_playlists(request: Request):
    await require_admin(request)
    db = get_db()
    cursor = db.playlists.find({}).sort("created_at", -1)
    return docs_to_list(await cursor.to_list(100))

@admin_router.post("/playlists")
async def create_playlist(body: PlaylistCreate, request: Request):
    user = await require_admin(request)
    db = get_db()
    playlist_doc = {
        **body.model_dump(),
        "tracks": [],
        "created_by": user["id"],
        "is_public": True,
        "plays": 0,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.playlists.insert_one(playlist_doc)
    playlist_doc["_id"] = result.inserted_id
    return doc_to_dict(playlist_doc)

@admin_router.post("/disputes/{order_id}/resolve")
async def resolve_dispute(order_id: str, body: DisputeResolveRequest, request: Request):
    await require_admin(request)
    db = get_db()
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order or order["status"] != "disputed":
        raise HTTPException(400, "Order not in disputed state")

    price = order["price"]
    if body.resolution == "release_to_seller":
        platform_fee = price * 0.1
        seller_amount = price - platform_fee
        await db.users.update_one({"_id": ObjectId(order["buyer_id"])}, {"$inc": {"escrow_balance": -price}})
        await db.users.update_one({"_id": ObjectId(order["seller_id"])}, {"$inc": {"wallet_balance": seller_amount}})
        await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": "completed", "escrow_status": "released", "admin_note": body.admin_note}}
        )
    elif body.resolution == "refund_to_buyer":
        await db.users.update_one({"_id": ObjectId(order["buyer_id"])},
                                   {"$inc": {"wallet_balance": price, "escrow_balance": -price}})
        await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": "refunded", "escrow_status": "refunded", "admin_note": body.admin_note}}
        )
    return {"message": f"Dispute resolved: {body.resolution}"}

# Public submission endpoint (for artists)
@admin_router.post("/submissions")
async def create_submission(body: SubmissionCreate, request: Request):
    from auth import get_current_user
    user = await get_current_user(request)
    db = get_db()
    sub_doc = {
        **body.model_dump(),
        "artist_id": user["id"],
        "artist_name": user["name"],
        "status": "pending",
        "curator_notes": "",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.submissions.insert_one(sub_doc)
    sub_doc["_id"] = result.inserted_id
    return doc_to_dict(sub_doc)
