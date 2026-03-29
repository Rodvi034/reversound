from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
from typing import Optional

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user

analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])

TIER_REQUIRED = {"pro", "enterprise", "admin"}

async def _check_tier(user: dict):
    tier = user.get("subscription_tier", "free")
    role = user.get("role", "buyer")
    if tier not in TIER_REQUIRED and role != "admin":
        raise HTTPException(403, "Pro veya Enterprise plan gereklidir. Analitik paneline erişmek için planını yükselt.")

@analytics_router.get("/overview")
async def overview(request: Request):
    user = await get_current_user(request)
    await _check_tier(user)
    db = get_db()
    uid = user["id"]

    total_revenue = 0.0
    completed = await db.orders.find({"seller_id": uid, "status": "completed"}).to_list(1000)
    for o in completed:
        total_revenue += o.get("price", 0) * 0.9

    total_beats = await db.beats.count_documents({"producer_id": uid})
    total_plays = 0
    async for beat in db.beats.find({"producer_id": uid}, {"plays": 1}):
        total_plays += beat.get("plays", 0)

    total_gigs = await db.gigs.count_documents({"seller_id": uid})
    total_orders = await db.orders.count_documents({"seller_id": uid})
    purchases = await db.purchases.count_documents({"producer_id": uid})

    return {
        "total_revenue": round(total_revenue, 2),
        "total_beats": total_beats,
        "total_plays": total_plays,
        "total_gigs": total_gigs,
        "total_orders": total_orders,
        "beat_purchases": purchases,
        "avg_order_value": round(total_revenue / max(len(completed), 1), 2),
    }

@analytics_router.get("/revenue")
async def revenue_chart(request: Request):
    """Monthly revenue for the last 12 months."""
    user = await get_current_user(request)
    await _check_tier(user)
    db = get_db()

    pipeline = [
        {"$match": {"seller_id": user["id"], "status": "completed"}},
        {"$group": {
            "_id": {
                "year": {"$year": "$created_at"},
                "month": {"$month": "$created_at"}
            },
            "gross": {"$sum": "$price"},
            "net": {"$sum": {"$multiply": ["$price", 0.9]}},
            "orders": {"$sum": 1}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}},
        {"$limit": 12}
    ]
    results = await db.orders.aggregate(pipeline).to_list(12)
    months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]

    data = [{"month": f"{months[r['_id']['month']-1]} {r['_id']['year']}", "gross": round(r["gross"],2), "net": round(r["net"],2), "orders": r["orders"]} for r in results]

    # Beat purchase revenue too
    beat_pipeline = [
        {"$match": {"producer_id": user["id"]}},
        {"$group": {
            "_id": {"year": {"$year": "$purchased_at"}, "month": {"$month": "$purchased_at"}},
            "beat_revenue": {"$sum": {"$multiply": ["$price", 0.8]}}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}},
        {"$limit": 12}
    ]
    beat_results = await db.purchases.aggregate(beat_pipeline).to_list(12)
    beat_map = {f"{r['_id']['year']}-{r['_id']['month']}": round(r["beat_revenue"], 2) for r in beat_results}

    for d in data:
        key_parts = d["month"].split(" ")
        m_idx = months.index(key_parts[0]) + 1 if key_parts[0] in months else 0
        y = int(key_parts[1]) if len(key_parts) > 1 else 2026
        d["beat_revenue"] = beat_map.get(f"{y}-{m_idx}", 0)
        d["total"] = round(d["net"] + d["beat_revenue"], 2)

    return data

@analytics_router.get("/beats/heatmap")
async def beats_heatmap(request: Request):
    """Play count heatmap: hour (0-23) x day_of_week (0-6)."""
    user = await get_current_user(request)
    await _check_tier(user)
    db = get_db()

    pipeline = [
        {"$match": {"producer_id": user["id"]}},
        {"$group": {
            "_id": {"hour": "$hour", "day": "$day_of_week"},
            "plays": {"$sum": 1}
        }}
    ]
    results = await db.play_events.aggregate(pipeline).to_list(200)

    # Build sparse map
    data = {}
    for r in results:
        key = f"{r['_id']['day']}-{r['_id']['hour']}"
        data[key] = r["plays"]

    # If no real data, generate synthetic from beat play counts
    if not data:
        beats = await db.beats.find({"producer_id": user["id"]}, {"plays": 1}).to_list(50)
        total = sum(b.get("plays", 0) for b in beats)
        if total > 0:
            import random
            random.seed(42)
            for day in range(7):
                for hour in range(24):
                    # Peak hours: 14-22, weekend peak
                    weight = (1.5 if day in [5, 6] else 1.0) * (2.0 if 14 <= hour <= 22 else 0.5)
                    plays = int(random.gauss(total / 168 * weight, 1))
                    if plays > 0:
                        data[f"{day}-{hour}"] = plays

    rows = []
    day_names = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
    for day in range(7):
        for hour in range(24):
            rows.append({"day": day, "day_name": day_names[day], "hour": hour, "plays": data.get(f"{day}-{hour}", 0)})
    return rows

@analytics_router.get("/gigs/conversion")
async def gig_conversion(request: Request):
    """Gig views vs orders per category."""
    user = await get_current_user(request)
    await _check_tier(user)
    db = get_db()

    gigs = await db.gigs.find({"seller_id": user["id"]}).to_list(50)
    data = []
    for g in gigs:
        orders = g.get("total_orders", 0)
        views = g.get("total_views", max(orders * 8, 1))
        rate = round((orders / views) * 100, 1) if views > 0 else 0
        data.append({
            "id": str(g["_id"]),
            "title": g.get("title", "")[:30],
            "category": g.get("category", ""),
            "views": views,
            "orders": orders,
            "conversion_rate": rate,
            "rating": g.get("rating", 0)
        })
    return sorted(data, key=lambda x: x["orders"], reverse=True)

@analytics_router.get("/audience")
async def audience_demographics(request: Request):
    """Buyer demographics: role distribution, top genres, geography."""
    user = await get_current_user(request)
    await _check_tier(user)
    db = get_db()

    # Beat purchases: buyer roles
    pipeline = [
        {"$match": {"producer_id": user["id"]}},
        {"$lookup": {"from": "users", "let": {"bid": "$buyer_id"}, "pipeline": [
            {"$match": {"$expr": {"$eq": [{"$toString": "$_id"}, "$$bid"]}}}
        ], "as": "buyer_doc"}},
        {"$unwind": {"path": "$buyer_doc", "preserveNullAndEmptyArrays": True}},
        {"$group": {"_id": {"$ifNull": ["$buyer_doc.role", "unknown"]}, "count": {"$sum": 1}}}
    ]
    role_data = await db.purchases.aggregate(pipeline).to_list(20)

    # Top genres sold
    genre_pipeline = [
        {"$match": {"producer_id": user["id"]}},
        {"$lookup": {"from": "beats", "let": {"bid": "$beat_id"}, "pipeline": [
            {"$match": {"$expr": {"$eq": [{"$toString": "$_id"}, "$$bid"]}}}
        ], "as": "beat_doc"}},
        {"$unwind": {"path": "$beat_doc", "preserveNullAndEmptyArrays": True}},
        {"$group": {"_id": {"$ifNull": ["$beat_doc.genre", "Other"]}, "count": {"$sum": 1}}}
    ]
    genre_data = await db.purchases.aggregate(genre_pipeline).to_list(20)

    ROLE_LABEL = {"buyer": "Alıcı", "producer": "Prodüktör", "artist": "Sanatçı", "engineer": "Mühendis", "designer": "Tasarımcı"}
    roles = [{"role": ROLE_LABEL.get(r["_id"], r["_id"]), "count": r["count"]} for r in role_data if r["_id"]]
    genres = [{"genre": r["_id"], "count": r["count"]} for r in genre_data if r["_id"]]

    return {"roles": sorted(roles, key=lambda x: x["count"], reverse=True), "genres": sorted(genres, key=lambda x: x["count"], reverse=True)[:8]}

@analytics_router.get("/beats/performance")
async def beats_performance(request: Request):
    """Top performing beats by plays and purchases."""
    user = await get_current_user(request)
    await _check_tier(user)
    db = get_db()
    cursor = db.beats.find({"producer_id": user["id"]}).sort("plays", -1).limit(10)
    beats = await cursor.to_list(10)
    return [{"id": str(b["_id"]), "title": b.get("title"), "genre": b.get("genre"), "plays": b.get("plays", 0), "purchases": b.get("purchases", 0), "bpm": b.get("bpm"), "key": b.get("key")} for b in beats]
