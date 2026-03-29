"""
Mock Iyzico Marketplace Payment Gateway
Implements the key Iyzico API flows for:
  - Sub-merchant registration
  - Checkout form initialization (preauth escrow)
  - Escrow approval with platform commission split
  - Refund / cancellation
"""
import uuid
import hashlib
import base64
import os
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user

payment_router = APIRouter(prefix="/payment", tags=["payment"])

PLATFORM_COMMISSION = 0.10  # 10%
SELLER_SHARE = 1.0 - PLATFORM_COMMISSION

# Mock Iyzico constants
MOCK_IYZICO_BASE = "https://sandbox-api.iyzipay.com"

def _mock_payment_token(payment_id: str) -> str:
    """Generate a deterministic mock token."""
    return base64.b64encode(f"iyzipay-{payment_id}".encode()).decode()[:32]

class CheckoutInitRequest(BaseModel):
    order_id: str
    return_url: Optional[str] = None

class PaymentCallbackRequest(BaseModel):
    payment_id: str
    status: str  # SUCCESS | FAILURE
    mock_token: str

class SubMerchantCreate(BaseModel):
    name: str
    email: str
    iban: str = "TR000000000000000000000000"
    identity_number: str = "11111111111"

@payment_router.post("/submerchants/register")
async def register_submerchant(body: SubMerchantCreate, request: Request):
    """Register user as Iyzico sub-merchant."""
    user = await get_current_user(request)
    db = get_db()

    existing = await db.submerchants.find_one({"user_id": user["id"]})
    if existing:
        return doc_to_dict(existing)

    sub_key = f"SM-{str(uuid.uuid4())[:8].upper()}"
    merchant_doc = {
        "user_id": user["id"],
        "name": body.name or user["name"],
        "email": body.email or user.get("email", ""),
        "iban": body.iban,
        "identity_number": body.identity_number,
        "sub_merchant_key": sub_key,
        "status": "approved",
        "provider": "iyzico_mock",
        "registered_at": datetime.now(timezone.utc)
    }
    result = await db.submerchants.insert_one(merchant_doc)
    merchant_doc["_id"] = result.inserted_id
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"sub_merchant_key": sub_key, "is_submerchant": True}})
    return doc_to_dict(merchant_doc)

@payment_router.post("/checkout/init")
async def init_checkout(body: CheckoutInitRequest, request: Request):
    """
    Initialize Iyzico preauth checkout form.
    Buyer pays → funds held in Iyzico escrow (our platform wallet).
    Mimics: POST /payment/iyzipos/checkoutform/initialize/preauth
    """
    user = await get_current_user(request)
    db = get_db()

    order = await db.orders.find_one({"_id": ObjectId(body.order_id)})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["buyer_id"] != user["id"]:
        raise HTTPException(403, "Not authorized")
    if order["status"] != "funded":
        raise HTTPException(400, f"Order already in status: {order['status']}")

    payment_id = str(uuid.uuid4())
    mock_token = _mock_payment_token(payment_id)
    frontend_url = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")[0]
    return_url = body.return_url or f"{frontend_url}/orders/{body.order_id}?payment_status=success"

    payment_doc = {
        "payment_id": payment_id,
        "order_id": body.order_id,
        "buyer_id": user["id"],
        "seller_id": order["seller_id"],
        "amount": order["price"],
        "currency": "TRY",
        "status": "pending",
        "mock_token": mock_token,
        "checkout_form_content": _build_mock_form(payment_id, order["price"], mock_token, return_url),
        "return_url": return_url,
        "provider": "iyzico_mock",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.payments.insert_one(payment_doc)
    payment_doc["_id"] = result.inserted_id

    return {
        "payment_id": payment_id,
        "status": "initialized",
        "checkout_form_content": payment_doc["checkout_form_content"],
        "token": mock_token,
        "mock_approve_url": f"/api/payment/mock-approve/{payment_id}",
        "message": "MOCK MODE: Use mock_approve_url to simulate payment success"
    }

def _build_mock_form(payment_id: str, amount: float, token: str, return_url: str) -> str:
    """Build a mock HTML checkout form."""
    return f"""
    <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:20px;background:#1a1a1f;border-radius:8px;color:white;">
      <h3 style="color:#8b5cf6;margin:0 0 15px">ReverSound Güvenli Ödeme</h3>
      <p style="color:#a1a1aa;font-size:13px">Tutar: <strong style="color:#10b981">₺{amount:.2f}</strong></p>
      <p style="color:#a1a1aa;font-size:12px">Iyzico Sandbox — Test Modu</p>
      <p style="color:#f59e0b;font-size:11px;background:#f59e0b11;padding:8px;border-radius:4px;">
        Bu bir sandbox ortamıdır. Gerçek ödeme işlemi gerçekleşmez.
      </p>
      <input type="text" value="4111111111111111" style="width:100%;padding:8px;margin:8px 0;background:#0d0d0f;border:1px solid #333;color:white;border-radius:4px;" placeholder="Kart Numarası (Test: 4111...)" readonly />
      <a href="/api/payment/mock-approve/{payment_id}" style="display:block;background:#8b5cf6;color:white;padding:12px;text-align:center;border-radius:4px;text-decoration:none;margin-top:10px;font-weight:bold;">
        Ödemeyi Tamamla (Mock)
      </a>
    </div>
    """

@payment_router.get("/mock-approve/{payment_id}")
async def mock_approve_payment(payment_id: str):
    """Simulate Iyzico payment callback (SUCCESS)."""
    db = get_db()
    payment = await db.payments.find_one({"payment_id": payment_id})
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment["status"] != "pending":
        return {"message": "Already processed", "status": payment["status"]}

    await db.payments.update_one(
        {"payment_id": payment_id},
        {"$set": {"status": "approved", "approved_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Payment approved (mock)", "payment_id": payment_id, "redirect": f"/orders/{payment['order_id']}"}

@payment_router.post("/escrow/release/{order_id}")
async def release_escrow(order_id: str, request: Request):
    """
    Approve escrow release after buyer confirms delivery.
    Mimics: POST /v1/payment/approve (Iyzico Marketplace)
    Split: 90% → seller sub-merchant, 10% → platform
    """
    user = await get_current_user(request)
    db = get_db()

    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["buyer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    if order["status"] not in ("delivered", "funded"):
        raise HTTPException(400, f"Cannot release escrow for status: {order['status']}")

    price = order["price"]
    platform_fee = round(price * PLATFORM_COMMISSION, 2)
    seller_amount = round(price * SELLER_SHARE, 2)

    # Sub-merchant transfer
    seller_sm = await db.submerchants.find_one({"user_id": order["seller_id"]})
    transaction_id = f"TXN-{str(uuid.uuid4())[:8].upper()}"

    iyzico_response = {
        "status": "success",
        "transactionId": transaction_id,
        "paymentId": f"PAY-{str(uuid.uuid4())[:8].upper()}",
        "paidPrice": price,
        "sellerAmount": seller_amount,
        "platformFee": platform_fee,
        "currency": "TRY",
        "subMerchantKey": seller_sm.get("sub_merchant_key", "UNREGISTERED") if seller_sm else "UNREGISTERED",
        "processedAt": datetime.now(timezone.utc).isoformat()
    }

    # Update wallets
    await db.users.update_one({"_id": ObjectId(order["buyer_id"])}, {"$inc": {"escrow_balance": -price}})
    await db.users.update_one({"_id": ObjectId(order["seller_id"])}, {"$inc": {"wallet_balance": seller_amount}})

    # Update order
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "completed", "escrow_status": "released", "completed_at": datetime.now(timezone.utc), "iyzico_transaction": iyzico_response}}
    )

    # Record payout
    await db.payouts.insert_one({
        "order_id": order_id,
        "seller_id": order["seller_id"],
        "buyer_id": order["buyer_id"],
        "gross_amount": price,
        "seller_amount": seller_amount,
        "platform_fee": platform_fee,
        "transaction_id": transaction_id,
        "provider": "iyzico_mock",
        "status": "completed",
        "created_at": datetime.now(timezone.utc)
    })

    return {"message": "Escrow released", "seller_credited": seller_amount, "platform_fee": platform_fee, "transaction_id": transaction_id}

@payment_router.get("/history")
async def payment_history(request: Request):
    user = await get_current_user(request)
    db = get_db()
    cursor = db.payments.find({"$or": [{"buyer_id": user["id"]}, {"seller_id": user["id"]}]}).sort("created_at", -1).limit(20)
    return docs_to_list(await cursor.to_list(20))
