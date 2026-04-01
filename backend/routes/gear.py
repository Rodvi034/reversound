from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user

gear_router = APIRouter(prefix="/gear", tags=["gear"])

CATEGORIES = {
    "guitars": ["Elektro Gitar", "Akustik Gitar", "Bas Gitar", "Klasik Gitar"],
    "synths": ["Synthesizer", "MIDI Klavye", "Davul Makinesi", "Sampler", "Groovebox"],
    "microphones": ["Condenser Mikrofon", "Dynamic Mikrofon", "Ribbon Mikrofon", "USB Mikrofon"],
    "studio": ["Ses Kartı", "Mixing Console", "Monitor Hoparlor", "Kulaklık", "Preamp", "Compressor"],
    "effects": ["Gitar Pedalı", "Rack Efekt", "Plugin/Yazılım"],
    "drums": ["Akustik Davul", "Elektronik Davul", "Zil Seti", "Pad Set"],
    "dj": ["DJ Controller", "Turntable", "CDJ", "DJ Mixer"],
    "other": ["Diğer Ekipman"],
}
CONDITIONS = ["Sıfır", "Sıfır Gibi", "İyi", "Orta", "Parça İçin"]

class GearListingCreate(BaseModel):
    title: str
    description: str
    price: float
    category: str
    subcategory: Optional[str] = ""
    brand: str
    condition: str
    images: List[str] = []
    city: str
    is_negotiable: bool = True

class GearListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    images: Optional[List[str]] = None
    is_negotiable: Optional[bool] = None
    status: Optional[str] = None

@gear_router.get("/categories")
async def get_categories():
    return CATEGORIES

@gear_router.get("")
async def list_gear(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    condition: Optional[str] = None,
    city: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    db = get_db()
    query = {"status": "active"}
    if category and category != "All":
        query["category"] = {"$regex": category, "$options": "i"}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"brand": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    if min_price is not None:
        query.setdefault("price", {})["$gte"] = min_price
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price
    if condition:
        query["condition"] = condition
    if city:
        query["city"] = {"$regex": city, "$options": "i"}

    skip = (page - 1) * limit
    total = await db.gear_listings.count_documents(query)
    cursor = db.gear_listings.find(query).sort("created_at", -1).skip(skip).limit(limit)
    listings = docs_to_list(await cursor.to_list(limit))
    return {"listings": listings, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@gear_router.get("/my")
async def my_listings(request: Request):
    user = await get_current_user(request)
    db = get_db()
    cursor = db.gear_listings.find({"seller_id": user["id"]}).sort("created_at", -1)
    return docs_to_list(await cursor.to_list(100))

@gear_router.get("/{listing_id}")
async def get_listing(listing_id: str):
    db = get_db()
    listing = await db.gear_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(404, "İlan bulunamadı")
    await db.gear_listings.update_one({"_id": ObjectId(listing_id)}, {"$inc": {"views": 1}})
    return doc_to_dict(listing)

@gear_router.post("")
async def create_listing(body: GearListingCreate, request: Request):
    user = await get_current_user(request)
    db = get_db()
    doc = {
        **body.model_dump(),
        "seller_id": user["id"],
        "seller_name": user["name"],
        "seller_username": user.get("username", ""),
        "status": "active",
        "views": 0,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.gear_listings.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc_to_dict(doc)

@gear_router.patch("/{listing_id}")
async def update_listing(listing_id: str, body: GearListingUpdate, request: Request):
    user = await get_current_user(request)
    db = get_db()
    listing = await db.gear_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(404, "İlan bulunamadı")
    if listing["seller_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Yetkisiz")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.gear_listings.update_one({"_id": ObjectId(listing_id)}, {"$set": updates})
    updated = await db.gear_listings.find_one({"_id": ObjectId(listing_id)})
    return doc_to_dict(updated)

@gear_router.delete("/{listing_id}")
async def delete_listing(listing_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    listing = await db.gear_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(404, "İlan bulunamadı")
    if listing["seller_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Yetkisiz")
    await db.gear_listings.delete_one({"_id": ObjectId(listing_id)})
    return {"message": "İlan silindi"}
