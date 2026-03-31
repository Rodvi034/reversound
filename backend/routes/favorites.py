from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user

favorites_router = APIRouter(prefix="/favorites", tags=["favorites"])

@favorites_router.get("")
async def get_favorites(request: Request, item_type: str = None):
    user = await get_current_user(request)
    db = get_db()
    query = {"user_id": user["id"]}
    if item_type:
        query["item_type"] = item_type
    cursor = db.favorites.find(query).sort("created_at", -1)
    favs = docs_to_list(await cursor.to_list(200))

    # Enrich with item details
    enriched = []
    for fav in favs:
        item = None
        if fav.get("item_type") == "beat":
            doc = await db.beats.find_one({"_id": ObjectId(fav["item_id"])})
            if doc:
                item = doc_to_dict(doc)
        elif fav.get("item_type") == "gig":
            doc = await db.gigs.find_one({"_id": ObjectId(fav["item_id"])})
            if doc:
                item = doc_to_dict(doc)
        if item:
            fav["item"] = item
            enriched.append(fav)
    return enriched

@favorites_router.post("/{item_type}/{item_id}")
async def toggle_favorite(item_type: str, item_id: str, request: Request):
    user = await get_current_user(request)
    if item_type not in ("beat", "gig"):
        raise HTTPException(400, "item_type must be beat or gig")
    db = get_db()
    existing = await db.favorites.find_one({"user_id": user["id"], "item_id": item_id, "item_type": item_type})
    if existing:
        await db.favorites.delete_one({"_id": existing["_id"]})
        return {"favorited": False}
    await db.favorites.insert_one({
        "user_id": user["id"],
        "item_id": item_id,
        "item_type": item_type,
        "created_at": datetime.now(timezone.utc)
    })
    return {"favorited": True}

@favorites_router.get("/check/{item_type}/{item_id}")
async def check_favorite(item_type: str, item_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    exists = await db.favorites.find_one({"user_id": user["id"], "item_id": item_id, "item_type": item_type})
    return {"favorited": bool(exists)}

@favorites_router.get("/ids")
async def get_favorite_ids(request: Request):
    """Get all favorited item IDs for quick client-side check."""
    user = await get_current_user(request)
    db = get_db()
    cursor = db.favorites.find({"user_id": user["id"]}, {"item_id": 1, "item_type": 1})
    favs = await cursor.to_list(500)
    return [{"id": f["item_id"], "type": f["item_type"]} for f in favs]
