from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user

playlists_router = APIRouter(prefix="/playlists", tags=["playlists"])

class SubmissionCreate(BaseModel):
    track_url: Optional[str] = None  # URL or upload path
    beat_id: Optional[str] = None
    title: str
    genre: str
    description: Optional[str] = ""

@playlists_router.get("")
async def list_playlists():
    """Public playlists — no auth required"""
    db = get_db()
    cursor = db.playlists.find({"is_public": True}).sort("created_at", -1)
    playlists = docs_to_list(await cursor.to_list(50))
    # Enrich with track count
    for p in playlists:
        p["track_count"] = len(p.get("tracks", []))
    return playlists

@playlists_router.get("/{playlist_id}")
async def get_playlist(playlist_id: str):
    db = get_db()
    playlist = await db.playlists.find_one({"_id": ObjectId(playlist_id), "is_public": True})
    if not playlist:
        raise HTTPException(404, "Playlist not found")
    result = doc_to_dict(playlist)
    # Enrich tracks with beat info
    enriched_tracks = []
    for track in result.get("tracks", []):
        if track.get("beat_id"):
            try:
                beat = await db.beats.find_one({"_id": ObjectId(track["beat_id"])})
                if beat:
                    track["beat_info"] = {
                        "title": beat.get("title"),
                        "producer_name": beat.get("producer_name"),
                        "genre": beat.get("genre"),
                        "bpm": beat.get("bpm"),
                        "cover_url": beat.get("cover_url"),
                        "audio_url": beat.get("audio_url"),
                    }
            except Exception:
                pass
        enriched_tracks.append(track)
    result["tracks"] = enriched_tracks
    return result

@playlists_router.post("/submit")
async def submit_track(body: SubmissionCreate, request: Request):
    user = await get_current_user(request)
    db = get_db()

    if not body.track_url and not body.beat_id:
        raise HTTPException(400, "Provide track_url or beat_id")

    # Check for duplicate submission
    existing = await db.submissions.find_one({
        "artist_id": user["id"],
        "title": body.title,
        "status": {"$in": ["pending", "approved"]}
    })
    if existing:
        raise HTTPException(400, "You already submitted this track")

    sub_doc = {
        "artist_id": user["id"],
        "artist_name": user["name"],
        "track_url": body.track_url or "",
        "beat_id": body.beat_id or "",
        "title": body.title,
        "genre": body.genre,
        "description": body.description,
        "status": "pending",
        "curator_notes": "",
        "playlist_id": None,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.submissions.insert_one(sub_doc)
    sub_doc["_id"] = result.inserted_id
    return doc_to_dict(sub_doc)

@playlists_router.get("/my/submissions")
async def my_submissions(request: Request):
    user = await get_current_user(request)
    db = get_db()
    cursor = db.submissions.find({"artist_id": user["id"]}).sort("created_at", -1)
    return docs_to_list(await cursor.to_list(50))
