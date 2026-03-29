from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user

beats_router = APIRouter(prefix="/beats", tags=["beats"])

class LicenseTier(BaseModel):
    type: str
    price: float
    rights: str

class BeatCreate(BaseModel):
    title: str
    genre: str
    bpm: int
    key: str
    tags: List[str] = []
    description: Optional[str] = ""
    audio_url: Optional[str] = ""       # legacy URL or storage path
    cover_url: Optional[str] = ""
    licenses: List[LicenseTier]
    item_type: str = "beat"             # beat | pack
    pack_file_url: Optional[str] = ""  # .zip for packs
    preview_tracks: Optional[List[dict]] = []  # [{title, url, duration}] for packs

class BeatUpdate(BaseModel):
    title: Optional[str] = None
    genre: Optional[str] = None
    bpm: Optional[int] = None
    key: Optional[str] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    audio_url: Optional[str] = None
    licenses: Optional[List[LicenseTier]] = None

@beats_router.get("")
async def list_beats(
    genre: Optional[str] = None,
    bpm_min: Optional[int] = None,
    bpm_max: Optional[int] = None,
    key: Optional[str] = None,
    search: Optional[str] = None,
    item_type: Optional[str] = None,    # beat | pack | All
    page: int = 1,
    limit: int = 20
):
    db = get_db()
    query = {"status": "approved"}
    if genre and genre != "All":
        query["genre"] = {"$regex": genre, "$options": "i"}
    if bpm_min is not None:
        query.setdefault("bpm", {})["$gte"] = bpm_min
    if bpm_max is not None:
        query.setdefault("bpm", {})["$lte"] = bpm_max
    if key:
        query["key"] = {"$regex": key, "$options": "i"}
    if item_type and item_type.lower() != "all":
        if item_type.lower() == "beat":
            query["$or"] = [{"item_type": "beat"}, {"item_type": {"$exists": False}}]
        else:
            query["item_type"] = item_type.lower()
    if search:
        search_filter = [
            {"title": {"$regex": search, "$options": "i"}},
            {"producer_name": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
        if "$or" in query:
            # Combine: (item_type OR) AND (search OR)
            type_or = query.pop("$or")
            query["$and"] = [{"$or": type_or}, {"$or": search_filter}]
        else:
            query["$or"] = search_filter

    skip = (page - 1) * limit
    total = await db.beats.count_documents(query)
    cursor = db.beats.find(query).sort("created_at", -1).skip(skip).limit(limit)
    beats = docs_to_list(await cursor.to_list(limit))
    return {"beats": beats, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@beats_router.get("/my")
async def my_beats(request: Request):
    user = await get_current_user(request)
    db = get_db()
    cursor = db.beats.find({"producer_id": user["id"]}).sort("created_at", -1)
    return docs_to_list(await cursor.to_list(100))

@beats_router.get("/{beat_id}")
async def get_beat(beat_id: str):
    db = get_db()
    beat = await db.beats.find_one({"_id": ObjectId(beat_id)})
    if not beat:
        raise HTTPException(404, "Beat not found")
    return doc_to_dict(beat)

@beats_router.post("")
async def create_beat(body: BeatCreate, request: Request):
    user = await get_current_user(request)
    if user["role"] not in ("producer", "admin"):
        raise HTTPException(403, "Only producers can upload beats")
    db = get_db()
    beat_doc = {
        **body.model_dump(),
        "producer_id": user["id"],
        "producer_name": user["name"],
        "producer_username": user.get("username", ""),
        "item_type": body.item_type or "beat",
        "plays": 0,
        "purchases": 0,
        "status": "approved" if user["role"] == "admin" else "pending",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.beats.insert_one(beat_doc)
    beat_doc["_id"] = result.inserted_id
    return doc_to_dict(beat_doc)

@beats_router.patch("/{beat_id}")
async def update_beat(beat_id: str, body: BeatUpdate, request: Request):
    user = await get_current_user(request)
    db = get_db()
    beat = await db.beats.find_one({"_id": ObjectId(beat_id)})
    if not beat:
        raise HTTPException(404, "Beat not found")
    if str(beat["producer_id"]) != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.beats.update_one({"_id": ObjectId(beat_id)}, {"$set": updates})
    updated = await db.beats.find_one({"_id": ObjectId(beat_id)})
    return doc_to_dict(updated)

@beats_router.delete("/{beat_id}")
async def delete_beat(beat_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    beat = await db.beats.find_one({"_id": ObjectId(beat_id)})
    if not beat:
        raise HTTPException(404, "Beat not found")
    if str(beat["producer_id"]) != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    await db.beats.delete_one({"_id": ObjectId(beat_id)})
    return {"message": "Beat deleted"}

@beats_router.post("/{beat_id}/play")
async def increment_play(beat_id: str, request: Request):
    db = get_db()
    beat = await db.beats.find_one({"_id": ObjectId(beat_id)}, {"producer_id": 1})
    if not beat:
        return {"message": "Beat not found"}
    await db.beats.update_one({"_id": ObjectId(beat_id)}, {"$inc": {"plays": 1}})
    # Track play event for heatmap analytics
    now = datetime.now(timezone.utc)
    await db.play_events.insert_one({
        "beat_id": beat_id,
        "producer_id": str(beat.get("producer_id", "")),
        "hour": now.hour,
        "day_of_week": now.weekday(),
        "played_at": now
    })
    return {"message": "Play recorded"}

@beats_router.post("/{beat_id}/purchase")
async def purchase_beat(beat_id: str, request: Request, license_type: str = "basic"):
    user = await get_current_user(request)
    db = get_db()
    beat = await db.beats.find_one({"_id": ObjectId(beat_id)})
    if not beat:
        raise HTTPException(404, "Beat not found")
    if beat["status"] != "approved":
        raise HTTPException(400, "Beat not available for purchase")

    license = next((l for l in beat.get("licenses", []) if l["type"] == license_type), None)
    if not license:
        raise HTTPException(400, "Invalid license type")

    price = license["price"]
    buyer = await db.users.find_one({"_id": ObjectId(user["id"])})
    if buyer["wallet_balance"] < price:
        raise HTTPException(400, f"Insufficient balance. Need {price} credits.")

    # Check if already purchased
    existing = await db.purchases.find_one({"buyer_id": user["id"], "beat_id": beat_id, "license_type": license_type})
    if existing:
        raise HTTPException(400, "You already own this license")

    # Deduct from buyer, credit to producer
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$inc": {"wallet_balance": -price}})
    if beat["producer_id"] != "demo":
        await db.users.update_one({"_id": ObjectId(beat["producer_id"])}, {"$inc": {"wallet_balance": price * 0.8}})

    # Record purchase
    purchase_doc = {
        "buyer_id": user["id"],
        "buyer_name": user["name"],
        "beat_id": beat_id,
        "beat_title": beat["title"],
        "producer_id": beat["producer_id"],
        "license_type": license_type,
        "price": price,
        "rights": license["rights"],
        "purchased_at": datetime.now(timezone.utc)
    }
    await db.purchases.insert_one(purchase_doc)
    await db.beats.update_one({"_id": ObjectId(beat_id)}, {"$inc": {"purchases": 1}})

    return {"message": f"Beat purchased successfully ({license_type} license)", "rights": license["rights"]}
