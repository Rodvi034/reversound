from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import require_admin

financials_router = APIRouter(prefix="/admin/financials", tags=["admin_financials"])

@financials_router.get("")
async def get_financial_overview(request: Request):
    await require_admin(request)
    db = get_db()

    # GMV — total gross value of completed orders
    gmv_pipeline = [{"$match": {"status": "completed"}}, {"$group": {"_id": None, "total": {"$sum": "$price"}, "count": {"$sum": 1}}}]
    gmv_result = await db.orders.aggregate(gmv_pipeline).to_list(1)
    gmv = gmv_result[0] if gmv_result else {"total": 0, "count": 0}

    # Platform revenue from payouts (fees collected)
    payout_pipeline = [{"$group": {"_id": None, "total_fees": {"$sum": "$platform_fee"}, "total_seller": {"$sum": "$seller_amount"}}}]
    payout_result = await db.payouts.aggregate(payout_pipeline).to_list(1)
    payouts = payout_result[0] if payout_result else {"total_fees": 0, "total_seller": 0}

    # Beat purchase revenue (80% to producer, 20% platform)
    beat_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$price"}, "count": {"$sum": 1}}}]
    beat_result = await db.purchases.aggregate(beat_pipeline).to_list(1)
    beats_gmv = beat_result[0] if beat_result else {"total": 0, "count": 0}
    beat_platform_rev = beats_gmv.get("total", 0) * 0.20

    # Pending escrow
    escrow_pipeline = [{"$match": {"escrow_status": "held"}}, {"$group": {"_id": None, "total": {"$sum": "$price"}, "count": {"$sum": 1}}}]
    escrow_result = await db.orders.aggregate(escrow_pipeline).to_list(1)
    escrow = escrow_result[0] if escrow_result else {"total": 0, "count": 0}

    # Disputes
    disputes = await db.orders.count_documents({"status": "disputed"})
    dispute_pipeline = [{"$match": {"status": "disputed"}}, {"$group": {"_id": None, "total": {"$sum": "$price"}}}]
    dispute_value = await db.orders.aggregate(dispute_pipeline).to_list(1)
    dispute_v = dispute_value[0]["total"] if dispute_value else 0

    # Monthly revenue (last 6 months)
    six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)
    monthly_pipeline = [
        {"$match": {"status": "completed", "created_at": {"$gte": six_months_ago}}},
        {"$group": {"_id": {"y": {"$year": "$created_at"}, "m": {"$month": "$created_at"}},
                    "gmv": {"$sum": "$price"}, "orders": {"$sum": 1}}},
        {"$sort": {"_id.y": 1, "_id.m": 1}}
    ]
    monthly = await db.orders.aggregate(monthly_pipeline).to_list(6)
    months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]
    monthly_data = [{"month": f"{months[r['_id']['m']-1]} {r['_id']['y']}", "gmv": round(r["gmv"],2), "orders": r["orders"]} for r in monthly]

    # Commission tier distribution of sellers
    tier_pipeline = [
        {"$match": {"role": {"$in": ["producer", "engineer", "designer", "artist"]}}},
        {"$group": {"_id": {
            "$switch": {"branches": [
                {"case": {"$gte": ["$lifetime_gig_sales", 51]}, "then": "Elite (5%)"},
                {"case": {"$gte": ["$lifetime_gig_sales", 11]}, "then": "Pro (7.5%)"},
            ], "default": "Starter (10%)"}
        }, "count": {"$sum": 1}}}
    ]
    tiers = await db.users.aggregate(tier_pipeline).to_list(10)
    tier_data = [{"tier": t["_id"], "count": t["count"]} for t in tiers]

    # Recent transactions
    recent_cursor = db.payouts.find({}).sort("created_at", -1).limit(10)
    recent = docs_to_list(await recent_cursor.to_list(10))

    return {
        "gmv": round(gmv.get("total", 0), 2),
        "order_count": gmv.get("count", 0),
        "platform_revenue_gigs": round(payouts.get("total_fees", 0), 2),
        "platform_revenue_beats": round(beat_platform_rev, 2),
        "total_platform_revenue": round(payouts.get("total_fees", 0) + beat_platform_rev, 2),
        "beats_gmv": round(beats_gmv.get("total", 0), 2),
        "beat_purchase_count": beats_gmv.get("count", 0),
        "pending_escrow": round(escrow.get("total", 0), 2),
        "pending_escrow_orders": escrow.get("count", 0),
        "active_disputes": disputes,
        "disputed_value": round(dispute_v, 2),
        "monthly_revenue": monthly_data,
        "seller_tier_distribution": tier_data,
        "recent_transactions": recent,
    }
