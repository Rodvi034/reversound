"""
Real Iyzico Payment Gateway Integration
Architecture: Live-ready with sandbox default.
Set IYZICO_API_KEY + IYZICO_SECRET_KEY in .env to go live.
IYZICO_BASE_URL defaults to sandbox endpoint.
"""
import os, hashlib, hmac, base64, json, random, string, uuid, logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user

payment_router = APIRouter(prefix="/payment", tags=["payment"])
logger = logging.getLogger(__name__)

PLATFORM_COMMISSION = 0.10
SELLER_SHARE = 0.90

def _keys_set() -> bool:
    return bool(os.environ.get("IYZICO_API_KEY") and os.environ.get("IYZICO_SECRET_KEY"))

def _api_key() -> str: return os.environ.get("IYZICO_API_KEY", "")
def _secret() -> str: return os.environ.get("IYZICO_SECRET_KEY", "")
def _base() -> str: return os.environ.get("IYZICO_BASE_URL", "https://sandbox-api.iyzipay.com")

def _rnd(n=12): return ''.join(random.choices(string.ascii_letters + string.digits, k=n))

def _sign(body: dict) -> tuple[str, str]:
    rnd = _rnd()
    body_str = json.dumps(body, ensure_ascii=False, separators=(',', ':'))
    msg = _api_key() + rnd + _secret() + body_str
    sig = base64.b64encode(
        hmac.new(_secret().encode(), msg.encode(), hashlib.sha256).digest()
    ).decode()
    return rnd, f"IYZWS {_api_key()}:{sig}"

def _headers(body: dict) -> dict:
    rnd, auth = _sign(body)
    return {"Content-Type": "application/json", "Accept": "application/json",
            "x-iyzi-rnd": rnd, "Authorization": auth}

async def _iyzico_post(endpoint: str, payload: dict) -> dict:
    """Make authenticated POST to Iyzico API."""
    import aiohttp
    url = f"{_base()}{endpoint}"
    headers = _headers(payload)
    async with aiohttp.ClientSession() as sess:
        async with sess.post(url, json=payload, headers=headers, timeout=30) as resp:
            return await resp.json()

# ── Checkout Form (Wallet Top-up) ───────────────────────────────────────────────

class CheckoutInitRequest(BaseModel):
    amount: float
    currency: str = "TRY"
    basket_items: Optional[list] = None

@payment_router.post("/checkout/init")
async def init_checkout(body: CheckoutInitRequest, request: Request):
    """
    Initialize Iyzico checkout form for wallet top-up.
    Returns checkoutFormContent (embeddable HTML) or mock form.
    """
    user = await get_current_user(request)
    if body.amount <= 0 or body.amount > 50000:
        raise HTTPException(400, "Invalid amount (1 - 50,000 TRY)")

    payment_id = str(uuid.uuid4())
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    callback_url = f"{frontend_url}/payment/callback"

    db = get_db()
    user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})

    if _keys_set():
        # Real Iyzico API call
        payload = {
            "locale": "tr",
            "conversationId": payment_id,
            "price": str(body.amount),
            "paidPrice": str(body.amount),
            "currency": body.currency,
            "basketId": payment_id,
            "paymentGroup": "PRODUCT",
            "callbackUrl": callback_url,
            "buyer": {
                "id": user["id"],
                "name": (user.get("name", "") + " ").split()[0],
                "surname": (user.get("name", "") + " Unknown").split()[-1],
                "gsmNumber": "+905350000000",
                "email": user_doc.get("email", "user@reversound.com"),
                "identityNumber": "74300864791",
                "registrationAddress": "Istanbul",
                "city": "Istanbul",
                "country": "Turkey",
                "ip": request.client.host if request.client else "85.34.78.112"
            },
            "shippingAddress": {"contactName": user.get("name", ""), "city": "Istanbul", "country": "Turkey", "address": "Istanbul"},
            "billingAddress": {"contactName": user.get("name", ""), "city": "Istanbul", "country": "Turkey", "address": "Istanbul"},
            "basketItems": body.basket_items or [{
                "id": "wallet-topup",
                "name": "ReverSound Kredi",
                "category1": "Dijital",
                "category2": "Kredi",
                "itemType": "VIRTUAL",
                "price": str(body.amount)
            }]
        }
        try:
            result = await _iyzico_post("/payment/iyzipos/checkoutform/initialize/auth/ecommerce", payload)
            if result.get("status") == "success":
                await db.payments.insert_one({
                    "payment_id": payment_id,
                    "user_id": user["id"],
                    "amount": body.amount,
                    "type": "wallet_topup",
                    "status": "pending",
                    "provider": "iyzico",
                    "iyzico_token": result.get("token"),
                    "created_at": datetime.now(timezone.utc)
                })
                return {
                    "payment_id": payment_id,
                    "checkout_form_content": result.get("checkoutFormContent", ""),
                    "token": result.get("token"),
                    "provider": "iyzico_live",
                    "callback_url": callback_url
                }
            else:
                raise HTTPException(502, f"Iyzico error: {result.get('errorMessage')}")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Iyzico init error: {e}")
            raise HTTPException(502, "Ödeme başlatılamadı. Lütfen tekrar deneyin.")
    else:
        # Sandbox form (keys not set)
        await db.payments.insert_one({
            "payment_id": payment_id,
            "user_id": user["id"],
            "amount": body.amount,
            "type": "wallet_topup",
            "status": "pending",
            "provider": "iyzico_sandbox_mock",
            "created_at": datetime.now(timezone.utc)
        })
        checkout_html = _sandbox_form_html(payment_id, body.amount, callback_url)
        return {
            "payment_id": payment_id,
            "checkout_form_content": checkout_html,
            "token": payment_id,
            "provider": "iyzico_sandbox",
            "sandbox_mode": True,
            "test_card": {"number": "5528790000000008", "expiry": "12/30", "cvv": "123"}
        }

@payment_router.get("/callback")
@payment_router.post("/callback")
async def payment_callback(request: Request, token: Optional[str] = None):
    """Handle Iyzico payment callback after 3DS redirect."""
    db = get_db()
    form = await request.form() if request.method == "POST" else {}
    token = token or form.get("token") or request.query_params.get("token")
    if not token:
        return HTMLResponse("<h1>Gecersiz callback</h1>")

    if _keys_set():
        payload = {"locale": "tr", "token": token}
        try:
            result = await _iyzico_post("/payment/iyzipos/checkoutform/auth/ecommerce/detail", payload)
            if result.get("paymentStatus") == "SUCCESS":
                await _complete_payment(db, token, "iyzico")
        except Exception as e:
            logger.error(f"Callback error: {e}")
    else:
        # Sandbox: auto-approve
        await _complete_payment(db, token, "iyzico_sandbox")

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    return HTMLResponse(f"""
    <html><head><meta charset='utf-8'>
    <meta http-equiv='refresh' content='2;url={frontend_url}/wallet'>
    <style>body{{background:#0d0d0f;color:#fff;font-family:Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}}</style>
    </head><body><div style='text-align:center'>
    <h2 style='color:#10b981'>Odeme Basarili!</h2>
    <p style='color:#a1a1aa'>Cuzdaniniza yonlendiriliyorsunuz...</p>
    </div></body></html>""")

@payment_router.get("/mock-approve/{payment_id}")
async def mock_approve(payment_id: str):
    """Sandbox: Simulate successful payment (for testing without real card)."""
    db = get_db()
    await _complete_payment(db, payment_id, "mock_approved")
    return {"message": "Odeme onaylandi (sandbox)", "payment_id": payment_id}

async def _complete_payment(db, token_or_id: str, provider: str):
    """Complete payment: update DB, credit wallet."""
    payment = await db.payments.find_one({"$or": [{"payment_id": token_or_id}, {"iyzico_token": token_or_id}]})
    if not payment or payment.get("status") == "completed":
        return
    amount = payment.get("amount", 0)
    user_id = payment.get("user_id", "")
    if user_id:
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$inc": {"wallet_balance": amount}})
        await db.wallet_transactions.insert_one({
            "user_id": user_id,
            "type": "topup",
            "amount": amount,
            "payment_method": provider,
            "status": "completed",
            "reference": f"PAY-{token_or_id[-8:].upper()}",
            "created_at": datetime.now(timezone.utc)
        })
    await db.payments.update_one(
        {"payment_id": payment["payment_id"]},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc), "provider": provider}}
    )
    logger.info(f"Payment completed: {payment['payment_id']} | {amount} TRY | {provider}")

def _sandbox_form_html(payment_id: str, amount: float, callback_url: str) -> str:
    """Premium sandbox Iyzico form for testing."""
    return f"""
<div style="font-family:'Manrope',Arial,sans-serif;max-width:420px;margin:auto;padding:24px;background:#141416;border-radius:12px;border:1px solid rgba(255,255,255,0.1);color:#fff;">
  <div style="text-align:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.08);">
    <div style="color:#8b5cf6;font-size:13px;font-family:monospace;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px;">IYZICO SANDBOX</div>
    <div style="color:#a1a1aa;font-size:12px;">Gerçek ödeme yapmayın — Test ortamı</div>
  </div>
  <div style="background:#0d0d0f;border-radius:8px;padding:12px;margin-bottom:16px;display:flex;justify-content:space-between;">
    <span style="color:#a1a1aa;font-size:13px;">Yüklenecek Tutar</span>
    <span style="color:#10b981;font-weight:bold;font-size:16px;">₺{amount:.2f}</span>
  </div>
  <div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.2);border-radius:8px;padding:10px;margin-bottom:16px;">
    <div style="color:#8b5cf6;font-size:11px;font-weight:bold;margin-bottom:6px;">TEST KARTI</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;color:#a1a1aa;">
      <span>Kart: <strong style="color:#fff">5528 7900 0000 0008</strong></span>
      <span>CVV: <strong style="color:#fff">123</strong></span>
      <span>Son Kullanma: <strong style="color:#fff">12/30</strong></span>
      <span>3DS: <strong style="color:#fff">123456</strong></span>
    </div>
  </div>
  <div style="margin-bottom:12px;">
    <input type="text" value="5528 7900 0000 0008" readonly placeholder="Kart Numarasi" 
      style="width:100%;padding:10px 12px;background:#0d0d0f;border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#fff;font-size:13px;box-sizing:border-box;margin-bottom:8px;"/>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <input type="text" value="12/30" readonly placeholder="AA/YY" 
        style="padding:10px 12px;background:#0d0d0f;border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#fff;font-size:13px;"/>
      <input type="text" value="123" readonly placeholder="CVV" 
        style="padding:10px 12px;background:#0d0d0f;border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#fff;font-size:13px;"/>
    </div>
  </div>
  <a href="/api/payment/mock-approve/{payment_id}" style="display:block;background:#8b5cf6;color:#fff;padding:14px;text-align:center;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;margin-bottom:8px;">
    Odemeyi Tamamla — ₺{amount:.2f}
  </a>
  <div style="text-align:center;color:#6b7280;font-size:11px;">
    Gerçek kart bilgisi girmeyin • Sadece test amaçlı
  </div>
</div>"""

# ── Sub-merchant registration ───────────────────────────────────────────────────
class SubMerchantCreate(BaseModel):
    name: str
    iban: str = "TR000000000000000000000000"
    identity_number: str = "11111111111"

@payment_router.post("/submerchants/register")
async def register_submerchant(body: SubMerchantCreate, request: Request):
    user = await get_current_user(request)
    db = get_db()
    existing = await db.submerchants.find_one({"user_id": user["id"]})
    if existing:
        return doc_to_dict(existing)
    sub_key = f"SM-{str(uuid.uuid4())[:8].upper()}"
    if _keys_set():
        payload = {
            "locale": "tr",
            "conversationId": str(uuid.uuid4()),
            "subMerchantExternalId": user["id"],
            "subMerchantType": "PERSONAL",
            "address": "Istanbul, Türkiye",
            "taxOffice": "Istanbul",
            "legalCompanyTitle": body.name,
            "iban": body.iban,
            "contactName": user.get("name", body.name).split()[0] if user.get("name") else body.name,
            "contactSurname": (user.get("name", body.name).split()[-1] if len((user.get("name", body.name) or "").split()) > 1 else "Kullanici"),
            "email": user.get("email", "seller@reversound.com"),
            "gsmNumber": "+905350000000",
            "identityNumber": body.identity_number,
            "currency": "TRY",
        }
        try:
            result = await _iyzico_post("/v1/submerchants", payload)
            if result.get("status") == "success":
                sub_key = result.get("subMerchantKey", sub_key)
        except Exception as e:
            logger.error(f"Submerchant error: {e}")

    doc = {
        "user_id": user["id"],
        "name": body.name,
        "iban": body.iban,
        "sub_merchant_key": sub_key,
        "status": "approved",
        "provider": "iyzico" if _keys_set() else "iyzico_sandbox",
        "registered_at": datetime.now(timezone.utc)
    }
    result = await db.submerchants.insert_one(doc)
    doc["_id"] = result.inserted_id
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"sub_merchant_key": sub_key, "is_submerchant": True}})
    return doc_to_dict(doc)

# ── Escrow release with real Iyzico approval ────────────────────────────────────
@payment_router.post("/escrow/release/{order_id}")
async def release_escrow(order_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["buyer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    if order["status"] not in ("delivered", "funded"):
        raise HTTPException(400, f"Cannot release escrow: {order['status']}")

    from commission_service import get_seller_lifetime_sales, get_commission_fee, get_tier
    lifetime = await get_seller_lifetime_sales(db, order["seller_id"])
    fee_rate = get_commission_fee(lifetime)
    tier = get_tier(lifetime)
    price = order["price"]
    fee = round(price * fee_rate, 2)
    seller_amount = round(price - fee, 2)

    if _keys_set():
        payment_data = await db.payments.find_one({"order_id": order_id, "status": "completed"})
        if payment_data and payment_data.get("iyzico_payment_id"):
            try:
                payload = {"locale": "tr", "conversationId": str(uuid.uuid4()),
                           "paymentId": payment_data["iyzico_payment_id"], "ip": "85.34.78.112"}
                result = await _iyzico_post("/v1/payment/approve", payload)
                logger.info(f"Iyzico escrow approved: {result}")
            except Exception as e:
                logger.error(f"Iyzico approve error: {e}")

    await db.users.update_one({"_id": ObjectId(order["buyer_id"])}, {"$inc": {"escrow_balance": -price}})
    await db.users.update_one({"_id": ObjectId(order["seller_id"])}, {"$inc": {"wallet_balance": seller_amount}})
    await db.orders.update_one({"_id": ObjectId(order_id)}, {"$set": {"status": "completed", "escrow_status": "released", "completed_at": datetime.now(timezone.utc)}})
    return {"message": "Escrow released", "seller_credited": seller_amount, "platform_fee": fee, "tier": tier["name"]}

@payment_router.get("/history")
async def payment_history(request: Request):
    user = await get_current_user(request)
    db = get_db()
    cursor = db.payments.find({"user_id": user["id"]}).sort("created_at", -1).limit(20)
    return docs_to_list(await cursor.to_list(20))

@payment_router.get("/status")
async def payment_status():
    return {
        "mode": "live" if _keys_set() else "sandbox",
        "provider": "iyzico",
        "base_url": _base(),
        "keys_configured": _keys_set(),
    }
