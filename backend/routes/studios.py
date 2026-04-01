from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId
import math

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user, require_admin

studios_router = APIRouter(prefix="/studios", tags=["studios"])

PLATFORM_COMMISSION = 0.15

class StudioCreate(BaseModel):
    name: str
    description: str
    address: str
    city: str
    country: str = "Türkiye"
    lat: float
    lng: float
    photos: List[str] = []
    hourly_rate: float
    amenities: List[str] = []
    equipment: List[str] = []
    max_capacity: int = 5
    rules: Optional[str] = ""

class ReservationCreate(BaseModel):
    studio_id: str
    start_datetime: str
    end_datetime: str
    requirements: Optional[str] = ""

class BlockSlot(BaseModel):
    studio_id: str
    start_datetime: str
    end_datetime: str
    reason: Optional[str] = "Kapalı / Bakım"

@studios_router.get("")
async def list_studios(city: str = None, search: str = None, min_rate: float = None, max_rate: float = None, page: int = 1, limit: int = 20):
    db = get_db()
    query = {"status": "active"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"description": {"$regex": search, "$options": "i"}}]
    if min_rate:
        query.setdefault("hourly_rate", {})["$gte"] = float(min_rate)
    if max_rate:
        query.setdefault("hourly_rate", {})["$lte"] = float(max_rate)
    skip = (page - 1) * limit
    total = await db.studios.count_documents(query)
    cursor = db.studios.find(query).sort("rating", -1).skip(skip).limit(limit)
    studios = docs_to_list(await cursor.to_list(limit))
    return {"studios": studios, "total": total, "page": page}

@studios_router.get("/map")
async def studios_map(lat: float = 41.0082, lng: float = 28.9784, radius_km: float = 800):
    db = get_db()
    all_studios = docs_to_list(await db.studios.find({"status": "active"}).to_list(500))
    nearby = []
    for s in all_studios:
        if s.get("lat") and s.get("lng"):
            d = _haversine(lat, lng, s["lat"], s["lng"])
            if d <= radius_km:
                s["distance_km"] = round(d, 1)
                nearby.append(s)
    nearby.sort(key=lambda x: x.get("distance_km", 999))
    return nearby[:50]

@studios_router.get("/reservations/my")
async def my_reservations(request: Request):
    user = await get_current_user(request)
    db = get_db()
    cursor = db.studio_reservations.find(
        {"$or": [{"renter_id": user["id"]}, {"owner_id": user["id"]}]}
    ).sort("start_datetime", -1)
    return docs_to_list(await cursor.to_list(100))

@studios_router.get("/{studio_id}/calendar")
async def get_calendar_events(studio_id: str, year: int = None, month: int = None):
    """
    Get all calendar events for a studio in a given month.
    Returns: booked reservations + owner-blocked slots in calendar event format.
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    y = year or now.year
    m = month or now.month

    # Build month range
    start_of_month = datetime(y, m, 1, tzinfo=timezone.utc)
    if m == 12:
        end_of_month = datetime(y + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_of_month = datetime(y, m + 1, 1, tzinfo=timezone.utc)

    events = []

    # Booked reservations
    cursor = db.studio_reservations.find({
        "studio_id": studio_id,
        "status": {"$in": ["confirmed", "pending"]},
        "start_datetime": {"$gte": start_of_month, "$lt": end_of_month}
    })
    reservations = docs_to_list(await cursor.to_list(500))
    for r in reservations:
        events.append({
            "id": r["id"],
            "title": f"Rezerve — {r.get('renter_name', 'Kiracı')}",
            "start": r["start_datetime"],
            "end": r["end_datetime"],
            "type": "booked",
            "color": "#ef4444",
            "hours": r.get("total_hours", 0),
        })

    # Owner-blocked slots
    cursor = db.studio_blocked_slots.find({
        "studio_id": studio_id,
        "start_datetime": {"$gte": start_of_month, "$lt": end_of_month}
    })
    blocked = docs_to_list(await cursor.to_list(200))
    for b in blocked:
        events.append({
            "id": b["id"],
            "title": b.get("reason", "Kapalı"),
            "start": b["start_datetime"],
            "end": b["end_datetime"],
            "type": "blocked",
            "color": "#6b7280",
        })

    return {
        "events": events,
        "studio_id": studio_id,
        "year": y,
        "month": m,
        "total_booked": len(reservations),
        "total_blocked": len(blocked),
    }

@studios_router.get("/{studio_id}/availability")
async def get_availability(studio_id: str):
    db = get_db()
    cursor = db.studio_reservations.find(
        {"studio_id": studio_id, "status": {"$in": ["confirmed", "pending"]}},
        {"start_datetime": 1, "end_datetime": 1, "status": 1}
    )
    bookings = docs_to_list(await cursor.to_list(200))
    # Also include blocked slots
    blocked_cursor = db.studio_blocked_slots.find({"studio_id": studio_id}, {"start_datetime": 1, "end_datetime": 1})
    blocked = docs_to_list(await blocked_cursor.to_list(200))
    return {
        "booked_slots": bookings,
        "blocked_slots": blocked,
    }

@studios_router.get("/{studio_id}")
async def get_studio(studio_id: str):
    db = get_db()
    studio = await db.studios.find_one({"_id": ObjectId(studio_id)})
    if not studio:
        raise HTTPException(404, "Stüdyo bulunamadı")
    await db.studios.update_one({"_id": ObjectId(studio_id)}, {"$inc": {"total_views": 1}})
    reviews_cursor = db.studio_reviews.find({"studio_id": studio_id}).sort("created_at", -1).limit(10)
    reviews = docs_to_list(await reviews_cursor.to_list(10))
    result = doc_to_dict(studio)
    result["reviews"] = reviews
    return result

@studios_router.post("")
async def create_studio(body: StudioCreate, request: Request):
    user = await get_current_user(request)
    db = get_db()
    total_rate = round(body.hourly_rate * (1 + PLATFORM_COMMISSION), 2)
    doc = {
        **body.model_dump(),
        "owner_id": user["id"],
        "owner_name": user["name"],
        "total_rate": total_rate,
        "commission_rate": PLATFORM_COMMISSION,
        "status": "active",
        "rating": 0.0,
        "total_reviews": 0,
        "total_views": 0,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.studios.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc_to_dict(doc)

@studios_router.post("/block")
async def block_slot(body: BlockSlot, request: Request):
    """Owner blocks a time slot (maintenance/unavailable)."""
    user = await get_current_user(request)
    db = get_db()
    studio = await db.studios.find_one({"_id": ObjectId(body.studio_id)})
    if not studio:
        raise HTTPException(404, "Stüdyo bulunamadı")
    if studio["owner_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Sadece stüdyo sahibi blok ekleyebilir")

    start = datetime.fromisoformat(body.start_datetime.replace("Z", "+00:00"))
    end = datetime.fromisoformat(body.end_datetime.replace("Z", "+00:00"))

    block_doc = {
        "studio_id": body.studio_id,
        "owner_id": user["id"],
        "start_datetime": start,
        "end_datetime": end,
        "reason": body.reason,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.studio_blocked_slots.insert_one(block_doc)
    block_doc["_id"] = result.inserted_id
    return doc_to_dict(block_doc)

@studios_router.delete("/block/{block_id}")
async def unblock_slot(block_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    block = await db.studio_blocked_slots.find_one({"_id": ObjectId(block_id)})
    if not block:
        raise HTTPException(404, "Blok bulunamadı")
    if block["owner_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Yetkisiz")
    await db.studio_blocked_slots.delete_one({"_id": ObjectId(block_id)})
    return {"message": "Blok kaldırıldı"}

@studios_router.post("/reserve")
async def create_reservation(body: ReservationCreate, request: Request):
    user = await get_current_user(request)
    db = get_db()
    studio = await db.studios.find_one({"_id": ObjectId(body.studio_id)})
    if not studio:
        raise HTTPException(404, "Stüdyo bulunamadı")
    if studio["owner_id"] == user["id"]:
        raise HTTPException(400, "Kendi stüdyonuzu kiralayamazsınız")

    start = datetime.fromisoformat(body.start_datetime.replace("Z", "+00:00"))
    end = datetime.fromisoformat(body.end_datetime.replace("Z", "+00:00"))
    if end <= start:
        raise HTTPException(400, "Bitiş tarihi başlangıçtan sonra olmalı")
    hours = (end - start).total_seconds() / 3600
    if hours < 1:
        raise HTTPException(400, "Minimum 1 saatlik kiralama")

    hourly = studio.get("total_rate", studio.get("hourly_rate", 0))
    subtotal = round(hourly * hours, 2)
    commission = round(subtotal * PLATFORM_COMMISSION, 2)

    buyer = await db.users.find_one({"_id": ObjectId(user["id"])})
    if buyer.get("wallet_balance", 0) < subtotal:
        raise HTTPException(400, f"Yetersiz bakiye. {subtotal:.2f} TRY gerekli.")

    # Check both reservations and blocked slots for conflicts
    conflict_query = {
        "studio_id": body.studio_id,
        "$or": [
            {"start_datetime": {"$lt": end, "$gte": start}},
            {"end_datetime": {"$gt": start, "$lte": end}},
            {"start_datetime": {"$lte": start}, "end_datetime": {"$gte": end}},
        ]
    }
    reservation_conflict = await db.studio_reservations.find_one({**conflict_query, "status": {"$in": ["confirmed", "pending"]}})
    blocked_conflict = await db.studio_blocked_slots.find_one(conflict_query)

    if reservation_conflict or blocked_conflict:
        raise HTTPException(400, "Bu tarih/saat dilimi dolu veya kapalı")

    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$inc": {"wallet_balance": -subtotal, "escrow_balance": subtotal}})

    reservation_doc = {
        "studio_id": body.studio_id,
        "studio_name": studio["name"],
        "renter_id": user["id"],
        "renter_name": user["name"],
        "owner_id": studio["owner_id"],
        "owner_name": studio.get("owner_name", ""),
        "start_datetime": start,
        "end_datetime": end,
        "total_hours": round(hours, 2),
        "hourly_rate": hourly,
        "subtotal": subtotal,
        "commission": commission,
        "total": subtotal,
        "requirements": body.requirements,
        "status": "confirmed",
        "escrow_status": "held",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.studio_reservations.insert_one(reservation_doc)
    reservation_doc["_id"] = result.inserted_id
    return doc_to_dict(reservation_doc)

def _haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
