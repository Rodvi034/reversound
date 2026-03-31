from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
from database import get_db
from utils import doc_to_dict
from auth import get_current_user

studio_router = APIRouter(prefix="/studio", tags=["rever_studio"])

STUDIO_PLANS = {
    "studio_basic":   {"name": "Studio Basic",   "price": 149, "features": ["5 GB cloud storage", "Basic stem separation", "AI mastering (5/mo)", "Online mixing tools"], "color": "#a1a1aa"},
    "studio_pro":     {"name": "Studio Pro",     "price": 399, "features": ["50 GB cloud storage", "Advanced stem separation", "AI mastering (unlimited)", "Real-time collaboration", "Version history", "DAW plugin integration"], "color": "#8b5cf6"},
    "studio_elite":   {"name": "Studio Elite",   "price": 799, "features": ["Unlimited storage", "Professional stem separation", "Priority AI mastering", "White-label studio", "API access", "Dedicated support"], "color": "#ec4899"},
}

@studio_router.get("/plans")
async def get_studio_plans():
    return STUDIO_PLANS

@studio_router.post("/subscribe")
async def subscribe_studio(tier: str, request: Request):
    user = await get_current_user(request)
    db = get_db()

    if tier not in STUDIO_PLANS:
        raise HTTPException(400, f"Invalid studio plan. Options: {', '.join(STUDIO_PLANS.keys())}")

    plan = STUDIO_PLANS[tier]
    price = plan["price"]

    user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not user_doc:
        raise HTTPException(404, "User not found")

    if user_doc.get("wallet_balance", 0) < price:
        raise HTTPException(400, f"Insufficient balance. Need ₺{price}, have ₺{user_doc.get('wallet_balance', 0):.2f}. Please top up your wallet.")

    # Deduct from wallet
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$inc": {"wallet_balance": -price}, "$set": {"studio_tier": tier}}
    )

    # Record subscription
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    sub_doc = {
        "user_id": user["id"],
        "tier": tier,
        "plan_name": plan["name"],
        "price": price,
        "status": "active",
        "features": plan["features"],
        "started_at": datetime.now(timezone.utc),
        "expires_at": expires_at,
    }
    result = await db.studio_subscriptions.insert_one(sub_doc)
    sub_doc["_id"] = result.inserted_id

    # Record wallet transaction
    await db.wallet_transactions.insert_one({
        "user_id": user["id"],
        "type": "studio_subscription",
        "amount": -price,
        "description": f"Rever {plan['name']} Monthly Subscription",
        "created_at": datetime.now(timezone.utc)
    })

    return {
        "message": f"Rever {plan['name']} activated successfully!",
        "tier": tier,
        "expires_at": expires_at.isoformat(),
        "new_balance": user_doc.get("wallet_balance", 0) - price,
    }

@studio_router.get("/my")
async def get_my_studio_sub(request: Request):
    user = await get_current_user(request)
    db = get_db()
    sub = await db.studio_subscriptions.find_one(
        {"user_id": user["id"], "status": "active"},
        sort=[("started_at", -1)]
    )
    if not sub:
        return {"tier": None, "active": False}
    result = doc_to_dict(sub)
    result["active"] = sub.get("expires_at", datetime.now(timezone.utc)) > datetime.now(timezone.utc)
    return result
