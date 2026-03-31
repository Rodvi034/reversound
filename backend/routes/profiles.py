from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from typing import Optional

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user

profiles_router = APIRouter(prefix="/profiles", tags=["profiles"])

@profiles_router.get("/{username}")
async def get_public_profile(username: str):
    """Public profile — no auth required."""
    db = get_db()
    user = await db.users.find_one(
        {"username": username.lower(), "is_banned": {"$ne": True}},
        {"password_hash": 0}
    )
    if not user:
        raise HTTPException(404, "Profile not found")

    uid = str(user["_id"])

    # Top beats
    beats_cursor = db.beats.find(
        {"producer_id": uid, "status": "approved"},
        {"password_hash": 0}
    ).sort("plays", -1).limit(6)
    beats = docs_to_list(await beats_cursor.to_list(6))

    # Active gigs
    gigs_cursor = db.gigs.find({"seller_id": uid, "status": "approved"}).sort("rating", -1).limit(6)
    gigs = docs_to_list(await gigs_cursor.to_list(6))

    # Sound packs
    packs_cursor = db.beats.find(
        {"producer_id": uid, "status": "approved", "item_type": "pack"}
    ).sort("created_at", -1).limit(4)
    packs = docs_to_list(await packs_cursor.to_list(4))

    # Stats
    total_plays = sum(b.get("plays", 0) for b in beats)
    completed_orders = await db.orders.count_documents({"seller_id": uid, "status": "completed"})
    beat_sales = await db.purchases.count_documents({"producer_id": uid})
    avg_rating = 0.0
    if gigs:
        rated = [g for g in gigs if g.get("rating", 0) > 0]
        if rated:
            avg_rating = round(sum(g["rating"] for g in rated) / len(rated), 1)

    profile = doc_to_dict(user)
    profile.pop("password_hash", None)
    profile.pop("wallet_balance", None)
    profile.pop("escrow_balance", None)
    profile.pop("email", None)

    return {
        "profile": profile,
        "beats": beats,
        "gigs": gigs,
        "packs": packs,
        "stats": {
            "total_plays": total_plays,
            "completed_orders": completed_orders,
            "beat_sales": beat_sales,
            "avg_rating": avg_rating,
            "total_beats": len(beats),
            "total_gigs": len(gigs),
        }
    }

@profiles_router.get("/{username}/beats")
async def get_profile_beats(username: str, page: int = 1, limit: int = 12):
    db = get_db()
    user = await db.users.find_one({"username": username.lower()}, {"_id": 1})
    if not user:
        raise HTTPException(404, "Profile not found")
    uid = str(user["_id"])
    skip = (page - 1) * limit
    total = await db.beats.count_documents({"producer_id": uid, "status": "approved"})
    cursor = db.beats.find({"producer_id": uid, "status": "approved"}).sort("plays", -1).skip(skip).limit(limit)
    beats = docs_to_list(await cursor.to_list(limit))
    return {"beats": beats, "total": total}
