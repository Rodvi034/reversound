from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from bson import ObjectId

from database import get_db
from utils import doc_to_dict
from auth import get_current_user

subscriptions_router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

PLANS = {
    "free": {
        "name": "Free",
        "price": 0,
        "credits_monthly": 0,
        "features": [
            "Upload 2 beats/month",
            "Create 1 gig",
            "Basic messaging",
            "Browse marketplace"
        ]
    },
    "starter": {
        "name": "Starter",
        "price": 99,
        "credits_monthly": 200,
        "features": [
            "Upload 10 beats/month",
            "Create 3 gigs",
            "200 monthly credits",
            "AI Career Coach (10 sessions)",
            "Priority support",
            "Basic analytics"
        ]
    },
    "pro": {
        "name": "Pro",
        "price": 249,
        "credits_monthly": 600,
        "features": [
            "Unlimited beat uploads",
            "Unlimited gigs",
            "600 monthly credits",
            "AI Career Coach (unlimited)",
            "Advanced analytics",
            "Featured listings",
            "Playlist submission priority",
            "0% platform fee on first 5 orders"
        ]
    },
    "enterprise": {
        "name": "Enterprise",
        "price": 599,
        "credits_monthly": 2000,
        "features": [
            "Everything in Pro",
            "2000 monthly credits",
            "White-label distribution",
            "Dedicated account manager",
            "Custom analytics dashboard",
            "API access",
            "0% platform fee"
        ]
    }
}

@subscriptions_router.get("/plans")
async def get_plans():
    return PLANS

@subscriptions_router.post("/subscribe")
async def subscribe(tier: str, request: Request):
    user = await get_current_user(request)
    if tier not in PLANS:
        raise HTTPException(400, "Invalid subscription tier")

    db = get_db()
    plan = PLANS[tier]

    if plan["price"] > 0:
        buyer = await db.users.find_one({"_id": ObjectId(user["id"])})
        if buyer["wallet_balance"] < plan["price"]:
            raise HTTPException(400, f"Insufficient balance. Need {plan['price']} credits.")
        await db.users.update_one(
            {"_id": ObjectId(user["id"])},
            {"$inc": {"wallet_balance": -plan["price"]}}
        )

    # Add monthly credits
    if plan["credits_monthly"] > 0:
        await db.users.update_one(
            {"_id": ObjectId(user["id"])},
            {"$inc": {"wallet_balance": plan["credits_monthly"]}}
        )

    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {"subscription_tier": tier}}
    )

    # Record subscription
    await db.subscriptions.insert_one({
        "user_id": user["id"],
        "tier": tier,
        "price": plan["price"],
        "features": plan["features"],
        "started_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
        "is_active": True
    })

    return {
        "message": f"Successfully subscribed to {plan['name']} plan",
        "tier": tier,
        "credits_added": plan["credits_monthly"]
    }

@subscriptions_router.get("/my")
async def get_my_subscription(request: Request):
    user = await get_current_user(request)
    db = get_db()
    sub = await db.subscriptions.find_one(
        {"user_id": user["id"], "is_active": True},
        sort=[("started_at", -1)]
    )
    return doc_to_dict(sub) if sub else {"tier": "free", "is_active": True}
