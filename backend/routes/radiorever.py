from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
import random

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user

radiorever_router = APIRouter(prefix="/radiorever", tags=["radiorever"])

GENRE_MAP = {
    "Trap": ["Trap", "Drill"],
    "Drill": ["Drill", "Trap"],
    "Hip-Hop": ["Hip-Hop", "Boom Bap", "Trap"],
    "R&B": ["R&B", "Soul", "Pop"],
    "Pop": ["Pop", "R&B", "Lo-Fi"],
    "Lo-Fi": ["Lo-Fi", "Hip-Hop", "Chillhop"],
    "Techno": ["Techno", "EDM", "Electronic"],
    "EDM": ["EDM", "Techno", "Electronic"],
}

def _expand_genres(genres: list) -> list:
    """Expand genres to include related ones for better matching."""
    expanded = set()
    for g in genres:
        g_clean = g.split('/')[0].strip()
        expanded.add(g_clean)
        related = GENRE_MAP.get(g_clean, [])
        expanded.update(related)
    return list(expanded)

@radiorever_router.get("/daily-mix")
async def get_daily_mix(request: Request):
    """
    Generate personalized daily mix using user's coach_profile and play history.
    70% preferred genres + 30% discovery.
    """
    user = await get_current_user(request)
    db = get_db()

    # Extract user preferences
    coach_profile = user.get("coach_profile", {})
    raw_styles = coach_profile.get("musical_style", user.get("genres", []))
    if isinstance(raw_styles, str):
        raw_styles = [raw_styles]
    expanded_genres = _expand_genres(raw_styles) if raw_styles else []

    # Get recently played beats (exclude in "discovery" not "preferred")
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent_ids = set()
    try:
        recent_plays = await db.play_events.distinct(
            "beat_id", {"user_id": user["id"], "played_at": {"$gte": thirty_days_ago}}
        )
        recent_ids = {str(bid) for bid in recent_plays if bid and bid != "demo"}
    except Exception:
        pass

    base_query = {"status": "approved", "audio_url": {"$exists": True, "$ne": ""}}

    tracks = []
    if expanded_genres:
        # Preferred genres (up to 10 tracks)
        genre_or = [{"genre": {"$regex": f"^{g}", "$options": "i"}} for g in expanded_genres[:4]]
        preferred_docs = await db.beats.find(
            {**base_query, "$or": genre_or}
        ).sort("plays", -1).limit(12).to_list(12)
        preferred = docs_to_list(preferred_docs)

        # Discovery — different genres (up to 5 tracks)
        pref_ids = {p["id"] for p in preferred}
        disc_docs = await db.beats.find(
            {**base_query, "$nor": genre_or}
        ).sort("plays", -1).limit(6).to_list(6)
        discovery = [d for d in docs_to_list(disc_docs) if d["id"] not in pref_ids][:5]

        tracks = preferred + discovery
    else:
        # No preferences — return trending
        docs = await db.beats.find(base_query).sort("plays", -1).limit(15).to_list(15)
        tracks = docs_to_list(docs)

    # Shuffle for freshness
    random.shuffle(tracks)
    final = tracks[:15]

    return {
        "tracks": final,
        "total": len(final),
        "mix_type": "personalized" if expanded_genres else "trending",
        "genres_used": expanded_genres[:4] if expanded_genres else [],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

@radiorever_router.post("/track-play")
async def track_radio_play(request: Request):
    """
    Record a verified play event from RadioRever.
    Called after 15+ seconds of continuous listening.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return {"message": "Not authenticated"}

    body = await request.json()
    beat_id = body.get("beat_id", "")
    producer_id = body.get("producer_id", "")

    if not beat_id:
        raise HTTPException(400, "beat_id required")

    db = get_db()
    now = datetime.now(timezone.utc)

    # Prevent duplicate logging (same user + beat within 2 minutes)
    two_min_ago = now - timedelta(minutes=2)
    existing = await db.play_events.find_one({
        "beat_id": beat_id,
        "user_id": user["id"],
        "source": "radio_rever",
        "played_at": {"$gte": two_min_ago}
    })
    if existing:
        return {"message": "Already tracked"}

    await db.play_events.insert_one({
        "beat_id": beat_id,
        "producer_id": producer_id,
        "user_id": user["id"],
        "hour": now.hour,
        "day_of_week": now.weekday(),
        "source": "radio_rever",
        "played_at": now,
    })

    # Increment beat plays (counts as genuine engagement)
    try:
        await db.beats.update_one({"_id": ObjectId(beat_id)}, {"$inc": {"plays": 1}})
    except Exception:
        pass

    return {"message": "Play tracked"}

@radiorever_router.get("/stats")
async def radiorever_stats(request: Request):
    """Get RadioRever stats (admin: global, producer: own beats)."""
    user = await get_current_user(request)
    db = get_db()

    query = {"source": "radio_rever"}

    if user["role"] == "admin":
        total = await db.play_events.count_documents(query)
        unique_beats = len(await db.play_events.distinct("beat_id", query))
        unique_listeners = len(await db.play_events.distinct("user_id", query))

        # Top 10 beats by radio plays
        pipeline = [
            {"$match": query},
            {"$group": {"_id": "$beat_id", "radio_plays": {"$sum": 1}}},
            {"$sort": {"radio_plays": -1}},
            {"$limit": 10}
        ]
        top_beats = await db.play_events.aggregate(pipeline).to_list(10)

        # Enrich with beat info
        enriched = []
        for item in top_beats:
            try:
                beat = await db.beats.find_one({"_id": ObjectId(item["_id"])}, {"title": 1, "producer_name": 1, "genre": 1})
                enriched.append({
                    "beat_id": item["_id"],
                    "radio_plays": item["radio_plays"],
                    "title": beat.get("title") if beat else "Unknown",
                    "producer_name": beat.get("producer_name") if beat else "",
                    "genre": beat.get("genre") if beat else "",
                })
            except Exception:
                pass

        return {
            "total_radio_plays": total,
            "unique_beats": unique_beats,
            "unique_listeners": unique_listeners,
            "top_beats": enriched,
        }
    else:
        # Producer stats — only their own beats
        prod_query = {**query, "producer_id": user["id"]}
        total = await db.play_events.count_documents(prod_query)
        unique_users = len(await db.play_events.distinct("user_id", prod_query))
        unique_beats = len(await db.play_events.distinct("beat_id", prod_query))
        return {
            "total_radio_plays": total,
            "unique_listeners": unique_users,
            "unique_beats_discovered": unique_beats,
        }
