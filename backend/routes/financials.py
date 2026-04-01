from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import require_admin

financials_router = APIRouter(prefix="/admin/financials", tags=["admin_financials"])

MONTHS = ["Oca", "Sub", "Mar", "Nis", "May", "Haz", "Tem", "Agu", "Eyl", "Eki", "Kas", "Ara"]

@financials_router.get("")
async def get_financial_overview(request: Request):
    await require_admin(request)
    db = get_db()

    # ── Gig Orders ──────────────────────────────────────────────────────────
    gmv_pipe = [{"$match": {"status": "completed"}}, {"$group": {"_id": None, "total": {"$sum": "$price"}, "count": {"$sum": 1}}}]
    gmv = (await db.orders.aggregate(gmv_pipe).to_list(1) or [{"total": 0, "count": 0}])[0]

    payout_pipe = [{"$group": {"_id": None, "total_fees": {"$sum": "$platform_fee"}, "total_seller": {"$sum": "$seller_amount"}}}]
    payouts = (await db.payouts.aggregate(payout_pipe).to_list(1) or [{"total_fees": 0}])[0]

    # ── Beat Purchases ──────────────────────────────────────────────────────
    beat_pipe = [{"$group": {"_id": None, "total": {"$sum": "$price"}, "count": {"$sum": 1}}}]
    beats_gmv = (await db.purchases.aggregate(beat_pipe).to_list(1) or [{"total": 0, "count": 0}])[0]
    beat_platform_rev = beats_gmv.get("total", 0) * 0.20

    # ── Studio Rentals ──────────────────────────────────────────────────────
    studio_pipe = [
        {"$match": {"status": "confirmed"}},
        {"$group": {"_id": None, "gmv": {"$sum": "$total"}, "commission": {"$sum": "$commission"}, "count": {"$sum": 1}}}
    ]
    studio_data = (await db.studio_reservations.aggregate(studio_pipe).to_list(1) or [{"gmv": 0, "commission": 0, "count": 0}])[0]

    # ── Gear Marketplace ────────────────────────────────────────────────────
    gear_pipe = [{"$match": {"status": "sold"}}, {"$group": {"_id": None, "total": {"$sum": "$price"}, "count": {"$sum": 1}}}]
    gear_data = (await db.gear_listings.aggregate(gear_pipe).to_list(1) or [{"total": 0, "count": 0}])[0]
    gear_platform_rev = gear_data.get("total", 0) * 0.05  # 5% listing fee on sold items

    # ── Total Platform Revenue ──────────────────────────────────────────────
    total_rev = round(
        payouts.get("total_fees", 0) +
        beat_platform_rev +
        studio_data.get("commission", 0) +
        gear_platform_rev, 2
    )

    # ── Pending Escrow ──────────────────────────────────────────────────────
    escrow_pipe = [{"$match": {"escrow_status": "held"}}, {"$group": {"_id": None, "total": {"$sum": "$price"}, "count": {"$sum": 1}}}]
    escrow = (await db.orders.aggregate(escrow_pipe).to_list(1) or [{"total": 0, "count": 0}])[0]

    studio_escrow_pipe = [{"$match": {"escrow_status": "held"}}, {"$group": {"_id": None, "total": {"$sum": "$total"}}}]
    studio_escrow = (await db.studio_reservations.aggregate(studio_escrow_pipe).to_list(1) or [{"total": 0}])[0]

    total_escrow = escrow.get("total", 0) + studio_escrow.get("total", 0)

    # ── Disputes ────────────────────────────────────────────────────────────
    disputes = await db.orders.count_documents({"status": "disputed"})
    dispute_pipe = [{"$match": {"status": "disputed"}}, {"$group": {"_id": None, "total": {"$sum": "$price"}}}]
    dispute_v = (await db.orders.aggregate(dispute_pipe).to_list(1) or [{"total": 0}])[0]["total"]

    # ── Monthly Revenue (last 6 months, all categories) ─────────────────────
    six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)

    # Gig orders monthly
    gig_monthly_pipe = [
        {"$match": {"status": "completed", "created_at": {"$gte": six_months_ago}}},
        {"$group": {"_id": {"y": {"$year": "$created_at"}, "m": {"$month": "$created_at"}}, "revenue": {"$sum": "$price"}}},
        {"$sort": {"_id.y": 1, "_id.m": 1}}
    ]
    gig_monthly = await db.orders.aggregate(gig_monthly_pipe).to_list(6)
    gig_map = {f"{r['_id']['y']}-{r['_id']['m']}": round(r["revenue"], 2) for r in gig_monthly}

    # Studio monthly
    studio_monthly_pipe = [
        {"$match": {"status": "confirmed", "created_at": {"$gte": six_months_ago}}},
        {"$group": {"_id": {"y": {"$year": "$created_at"}, "m": {"$month": "$created_at"}}, "revenue": {"$sum": "$total"}}},
        {"$sort": {"_id.y": 1, "_id.m": 1}}
    ]
    studio_monthly = await db.studio_reservations.aggregate(studio_monthly_pipe).to_list(6)
    studio_map = {f"{r['_id']['y']}-{r['_id']['m']}": round(r["revenue"], 2) for r in studio_monthly}

    # Beat monthly
    beat_monthly_pipe = [
        {"$match": {"purchased_at": {"$gte": six_months_ago}}},
        {"$group": {"_id": {"y": {"$year": "$purchased_at"}, "m": {"$month": "$purchased_at"}}, "revenue": {"$sum": "$price"}}},
        {"$sort": {"_id.y": 1, "_id.m": 1}}
    ]
    beat_monthly = await db.purchases.aggregate(beat_monthly_pipe).to_list(6)
    beat_map = {f"{r['_id']['y']}-{r['_id']['m']}": round(r["revenue"], 2) for r in beat_monthly}

    # Merge all months
    all_months = set(list(gig_map.keys()) + list(studio_map.keys()) + list(beat_map.keys()))
    monthly_data = []
    for key in sorted(all_months)[-6:]:
        y, m = map(int, key.split("-"))
        monthly_data.append({
            "month": f"{MONTHS[m-1]} {y}",
            "gigs": gig_map.get(key, 0),
            "studios": studio_map.get(key, 0),
            "beats": beat_map.get(key, 0),
            "total": round(gig_map.get(key, 0) + studio_map.get(key, 0) + beat_map.get(key, 0), 2),
        })

    # ── Category Revenue Breakdown ──────────────────────────────────────────
    category_breakdown = [
        {"category": "Gig Siparis", "revenue": round(payouts.get("total_fees", 0), 2), "color": "#8b5cf6"},
        {"category": "Beat Satisi", "revenue": round(beat_platform_rev, 2), "color": "#10b981"},
        {"category": "Studyo Kirala", "revenue": round(studio_data.get("commission", 0), 2), "color": "#f59e0b"},
        {"category": "Gear Market", "revenue": round(gear_platform_rev, 2), "color": "#ec4899"},
    ]

    # ── Commission Tier Distribution ────────────────────────────────────────
    tier_pipe = [
        {"$match": {"role": {"$in": ["producer", "engineer", "designer", "artist"]}}},
        {"$group": {"_id": {
            "$switch": {"branches": [
                {"case": {"$gte": ["$lifetime_gig_sales", 51]}, "then": "Elite (5%)"},
                {"case": {"$gte": ["$lifetime_gig_sales", 11]}, "then": "Pro (7.5%)"},
            ], "default": "Starter (10%)"}
        }, "count": {"$sum": 1}}}
    ]
    tiers = [{"tier": t["_id"], "count": t["count"]} for t in await db.users.aggregate(tier_pipe).to_list(10)]

    # ── Recent Transactions ─────────────────────────────────────────────────
    recent_cursor = db.payouts.find({}).sort("created_at", -1).limit(10)
    recent = docs_to_list(await recent_cursor.to_list(10))

    return {
        # GMV
        "gmv": round(gmv.get("total", 0), 2),
        "order_count": gmv.get("count", 0),
        "studio_gmv": round(studio_data.get("gmv", 0), 2),
        "studio_reservation_count": studio_data.get("count", 0),
        "beats_gmv": round(beats_gmv.get("total", 0), 2),
        "beat_purchase_count": beats_gmv.get("count", 0),
        "gear_gmv": round(gear_data.get("total", 0), 2),
        "total_gmv": round(
            gmv.get("total", 0) + studio_data.get("gmv", 0) +
            beats_gmv.get("total", 0) + gear_data.get("total", 0), 2
        ),
        # Platform Revenue
        "platform_revenue_gigs": round(payouts.get("total_fees", 0), 2),
        "platform_revenue_beats": round(beat_platform_rev, 2),
        "platform_revenue_studios": round(studio_data.get("commission", 0), 2),
        "platform_revenue_gear": round(gear_platform_rev, 2),
        "total_platform_revenue": total_rev,
        # Escrow
        "pending_escrow": round(total_escrow, 2),
        "pending_escrow_orders": escrow.get("count", 0),
        # Disputes
        "active_disputes": disputes,
        "disputed_value": round(dispute_v, 2),
        # Charts
        "monthly_revenue": monthly_data,
        "category_breakdown": category_breakdown,
        "seller_tier_distribution": tiers,
        "recent_transactions": recent,
    }

@financials_router.post("/seed-demo")
async def trigger_demo_seed(force: bool = False, request: Request = None):
    """Admin: Seed demo marketplace data (studios + gear)."""
    if request:
        await require_admin(request)
    db = get_db()
    from seed_demo_marketplaces import seed_demo_marketplaces
    results = await seed_demo_marketplaces(db, force=force)
    return {"message": "Demo verileri yüklendi", **results}
