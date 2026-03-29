from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user

wallet_router = APIRouter(prefix="/wallet", tags=["wallet"])

class TopupRequest(BaseModel):
    amount: float
    payment_method: str = "mock"  # mock | iyzico | paytr

@wallet_router.get("")
async def get_wallet(request: Request):
    user = await get_current_user(request)
    db = get_db()
    user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    return {
        "wallet_balance": user_doc.get("wallet_balance", 0.0),
        "escrow_balance": user_doc.get("escrow_balance", 0.0),
        "total_balance": user_doc.get("wallet_balance", 0.0) + user_doc.get("escrow_balance", 0.0)
    }

@wallet_router.post("/topup")
async def topup_wallet(body: TopupRequest, request: Request):
    user = await get_current_user(request)
    if body.amount <= 0 or body.amount > 10000:
        raise HTTPException(400, "Invalid amount (1 - 10,000 credits)")

    db = get_db()

    # MOCK escrow: In production, redirect to Iyzico/PayTR payment gateway
    # For now, simulate successful payment
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$inc": {"wallet_balance": body.amount}}
    )

    # Record transaction
    await db.wallet_transactions.insert_one({
        "user_id": user["id"],
        "type": "topup",
        "amount": body.amount,
        "payment_method": body.payment_method,
        "status": "completed",
        "reference": f"TOPUP-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "created_at": datetime.now(timezone.utc)
    })

    user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    return {
        "message": f"Successfully added {body.amount} credits",
        "new_balance": user_doc.get("wallet_balance", 0.0)
    }

@wallet_router.get("/transactions")
async def get_transactions(request: Request):
    user = await get_current_user(request)
    db = get_db()
    cursor = db.wallet_transactions.find(
        {"user_id": user["id"]}
    ).sort("created_at", -1).limit(50)
    return docs_to_list(await cursor.to_list(50))
