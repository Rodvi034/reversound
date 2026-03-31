"""
Admin CMS — Dynamic Homepage Content Management
Allows admins to edit hero text, genre images, partner logos,
featured content, and announcement banners without code changes.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId

from database import get_db
from utils import doc_to_dict
from auth import get_current_user, require_admin

cms_router = APIRouter(prefix="/cms", tags=["cms"])

DEFAULT_CMS = {
    "hero": {
        "title": "İLK HİTİN BURADA BAŞLIYOR",
        "subtitle": "Beat satın al, gig yayınla, escrow güvencesiyle sipariş ver. Türkiye'nin en güvenli müzik ekosistemi.",
        "badge_text": "Türkiye'nin Müzik Platformu",
        "cta_primary_text": "Hemen Başla",
        "cta_secondary_text": "Rever Studio",
        "background_video_url": "",
    },
    "stats": {
        "beats": "12K+",
        "producers": "3.4K+",
        "freelancers": "850+",
        "satisfaction": "98%"
    },
    "genres": [
        {"name": "TRAP", "color": "#8b5cf6", "image_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=300&fit=crop"},
        {"name": "HIP-HOP", "color": "#10b981", "image_url": "https://images.unsplash.com/photo-1571974599782-87624638275b?w=200&h=300&fit=crop"},
        {"name": "R&B", "color": "#f59e0b", "image_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=200&h=300&fit=crop"},
        {"name": "POP", "color": "#ec4899", "image_url": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=300&fit=crop"},
        {"name": "DRILL", "color": "#ef4444", "image_url": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=300&fit=crop"},
        {"name": "LO-FI", "color": "#06b6d4", "image_url": "https://images.unsplash.com/photo-1483090467739-f32e1aa22c9e?w=200&h=300&fit=crop"},
    ],
    "partners": [
        {"name": "Universal Music"}, {"name": "Sony Music"}, {"name": "Warner Music"},
        {"name": "Atlantic Records"}, {"name": "Columbia Records"}, {"name": "Def Jam"},
        {"name": "Capitol Music"}, {"name": "Interscope"}, {"name": "Republic Records"},
    ],
    "announcement": {
        "enabled": False,
        "text": "",
        "color": "#8b5cf6",
        "link_url": "",
        "link_text": ""
    },
    "testimonials": [
        {"quote": "ReverSound sayesinde müzik üretimimi bir iş haline getirebildim.", "name": "Murat K.", "role": "Prodüktör", "avatar": "M"},
        {"quote": "AI kariyer koçu bana Spotify'da büyüme stratejisi hazırladı. 3 ayda 10x artış.", "name": "Selin A.", "role": "Sanatçı", "avatar": "S"},
        {"quote": "Fiverr'dan çok daha güvenilir. Escrow sistemi mükemmel.", "name": "Kerem Y.", "role": "Mix Engineer", "avatar": "K"},
    ],
    "featured_beat_ids": [],
    "featured_gig_ids": [],
}


async def get_cms(db) -> dict:
    doc = await db.cms_content.find_one({"_id": "homepage"})
    if not doc:
        return DEFAULT_CMS.copy()
    doc.pop("_id", None)
    return doc


@cms_router.get("")
async def get_homepage_content():
    """Public — read homepage CMS content."""
    db = get_db()
    return await get_cms(db)


@cms_router.put("")
async def update_homepage_content(request: Request):
    """Admin only — full replace of CMS content."""
    await require_admin(request)
    db = get_db()
    body = await request.json()

    # Remove _id if present
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.cms_content.replace_one(
        {"_id": "homepage"},
        {"_id": "homepage", **body},
        upsert=True
    )
    return {"message": "CMS updated successfully"}


@cms_router.patch("/section/{section}")
async def update_cms_section(section: str, request: Request):
    """Admin — update a specific CMS section."""
    await require_admin(request)
    db = get_db()
    body = await request.json()

    await db.cms_content.update_one(
        {"_id": "homepage"},
        {"$set": {section: body, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": f"Section '{section}' updated"}


@cms_router.post("/reset")
async def reset_cms(request: Request):
    """Admin — reset CMS to defaults."""
    await require_admin(request)
    db = get_db()
    await db.cms_content.replace_one(
        {"_id": "homepage"},
        {"_id": "homepage", **DEFAULT_CMS},
        upsert=True
    )
    return {"message": "CMS reset to defaults"}
