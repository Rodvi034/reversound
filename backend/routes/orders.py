from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user

orders_router = APIRouter(prefix="/orders", tags=["orders"])

class OrderCreate(BaseModel):
    gig_id: str
    tier: str  # basic, standard, premium
    requirements: str

class DisputeRequest(BaseModel):
    reason: str

class RevisionRequest(BaseModel):
    reason: str

class AttachmentAdd(BaseModel):
    file_url: str
    filename: str
    file_type: str  # audio | image | document

@orders_router.post("/{order_id}/start")
async def start_order(order_id: str, request: Request):
    """Seller marks order as in_progress"""
    user = await get_current_user(request)
    db = get_db()
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["seller_id"] != user["id"]:
        raise HTTPException(403, "Only the seller can start the order")
    if order["status"] != "funded":
        raise HTTPException(400, f"Cannot start order in status: {order['status']}")
    await db.orders.update_one({"_id": ObjectId(order_id)}, {"$set": {"status": "in_progress", "started_at": datetime.now(timezone.utc)}})
    return {"message": "Order started"}

@orders_router.post("/{order_id}/revision")
async def request_revision(order_id: str, body: RevisionRequest, request: Request):
    """Buyer requests a revision"""
    user = await get_current_user(request)
    db = get_db()
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["buyer_id"] != user["id"]:
        raise HTTPException(403, "Only the buyer can request revisions")
    if order["status"] != "delivered":
        raise HTTPException(400, "Can only request revision on delivered orders")

    revisions_used = order.get("revisions_used", 0)
    max_revisions = order.get("revisions", 0)
    if revisions_used >= max_revisions:
        raise HTTPException(400, f"No revisions remaining ({max_revisions} used)")

    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "in_progress", "revision_reason": body.reason},
         "$inc": {"revisions_used": 1}}
    )
    return {"message": f"Revision requested ({revisions_used + 1}/{max_revisions})", "revisions_remaining": max_revisions - revisions_used - 1}

@orders_router.post("/{order_id}/attachments")
async def add_attachment(order_id: str, body: AttachmentAdd, request: Request):
    """Add file attachment to order"""
    user = await get_current_user(request)
    db = get_db()
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["buyer_id"] != user["id"] and order["seller_id"] != user["id"]:
        raise HTTPException(403, "Not authorized")

    attachment = {
        "file_url": body.file_url,
        "filename": body.filename,
        "file_type": body.file_type,
        "uploaded_by": user["id"],
        "uploader_name": user["name"],
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.update_one({"_id": ObjectId(order_id)}, {"$push": {"attachments": attachment}})
    return {"message": "Attachment added", "attachment": attachment}

class DeliveryRequest(BaseModel):
    delivery_note: str
    delivery_url: Optional[str] = ""

@orders_router.get("")
async def list_orders(request: Request, role: Optional[str] = None):
    user = await get_current_user(request)
    db = get_db()
    if role == "seller":
        query = {"seller_id": user["id"]}
    elif role == "buyer":
        query = {"buyer_id": user["id"]}
    else:
        query = {"$or": [{"buyer_id": user["id"]}, {"seller_id": user["id"]}]}
    cursor = db.orders.find(query).sort("created_at", -1)
    return docs_to_list(await cursor.to_list(100))

@orders_router.get("/{order_id}")
async def get_order(order_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["buyer_id"] != user["id"] and order["seller_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    return doc_to_dict(order)

@orders_router.post("")
async def create_order(body: OrderCreate, request: Request):
    """Create order and initiate escrow: deduct from buyer wallet -> hold in platform escrow"""
    user = await get_current_user(request)
    db = get_db()

    gig = await db.gigs.find_one({"_id": ObjectId(body.gig_id)})
    if not gig:
        raise HTTPException(404, "Gig not found")
    if gig["status"] != "approved":
        raise HTTPException(400, "Gig not available")
    if gig["seller_id"] == user["id"]:
        raise HTTPException(400, "You cannot order your own gig")

    tier_data = gig.get("tiers", {}).get(body.tier)
    if not tier_data:
        raise HTTPException(400, f"Invalid tier: {body.tier}")

    price = float(tier_data["price"])
    delivery_days = int(tier_data["delivery_days"])
    revisions = int(tier_data["revisions"])

    buyer = await db.users.find_one({"_id": ObjectId(user["id"])})
    if buyer["wallet_balance"] < price:
        raise HTTPException(400, f"Insufficient balance. Need {price} credits, have {buyer['wallet_balance']}.")

    # ESCROW: Deduct from buyer wallet
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$inc": {"wallet_balance": -price, "escrow_balance": price}}
    )

    due_date = datetime.now(timezone.utc) + timedelta(days=delivery_days)
    order_doc = {
        "buyer_id": user["id"],
        "buyer_name": user["name"],
        "seller_id": gig["seller_id"],
        "seller_name": gig["seller_name"],
        "gig_id": body.gig_id,
        "gig_title": gig["title"],
        "tier": body.tier,
        "tier_description": tier_data.get("description", ""),
        "price": price,
        "delivery_days": delivery_days,
        "revisions": revisions,
        "requirements": body.requirements,
        "status": "funded",           # pending_payment -> funded (escrow held)
        "escrow_status": "held",
        "due_date": due_date,
        "revisions_used": 0,
        "attachments": [],
        "started_at": None,
        "delivered_at": None,
        "completed_at": None,
        "delivery_note": "",
        "delivery_url": "",
        "dispute_reason": "",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.orders.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id

    # Record escrow transaction
    await db.escrow_transactions.insert_one({
        "order_id": str(result.inserted_id),
        "buyer_id": user["id"],
        "seller_id": gig["seller_id"],
        "amount": price,
        "status": "held",
        "created_at": datetime.now(timezone.utc)
    })

    await db.gigs.update_one({"_id": ObjectId(body.gig_id)}, {"$inc": {"total_orders": 1}})

    # Trigger notifications
    try:
        import notification_service as ns
        order_doc["_id"] = result.inserted_id
        await ns.notify_order_event(db, order_doc, "funded")
    except Exception:
        pass

    return doc_to_dict(order_doc)

@orders_router.post("/{order_id}/deliver")
async def deliver_order(order_id: str, body: DeliveryRequest, request: Request):
    """Seller marks order as delivered"""
    user = await get_current_user(request)
    db = get_db()
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["seller_id"] != user["id"]:
        raise HTTPException(403, "Only the seller can deliver")
    if order["status"] not in ("funded", "in_progress"):
        raise HTTPException(400, f"Cannot deliver order in status: {order['status']}")

    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "delivered", "delivery_note": body.delivery_note, "delivery_url": body.delivery_url, "delivered_at": datetime.now(timezone.utc)}}
    )
    # Notify buyer
    try:
        import notification_service as ns
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        await ns.notify_order_event(db, order, "delivered")
    except Exception:
        pass
    return {"message": "Order marked as delivered. Awaiting buyer approval."}

@orders_router.post("/{order_id}/approve")
async def approve_order(order_id: str, request: Request):
    """Buyer approves -> releases escrow to seller"""
    user = await get_current_user(request)
    db = get_db()
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["buyer_id"] != user["id"]:
        raise HTTPException(403, "Only the buyer can approve")
    if order["status"] not in ("delivered", "funded"):
        raise HTTPException(400, f"Cannot approve order in status: {order['status']}")

    price = order["price"]

    # Dynamic commission based on seller's lifetime sales
    from commission_service import get_seller_lifetime_sales, get_commission_fee, get_tier, increment_lifetime_sales
    lifetime_sales = await get_seller_lifetime_sales(db, order["seller_id"])
    fee_rate = get_commission_fee(lifetime_sales)
    tier = get_tier(lifetime_sales)
    platform_fee = round(price * fee_rate, 2)
    seller_amount = round(price - platform_fee, 2)

    # ESCROW RELEASE: Move from buyer escrow -> seller wallet
    await db.users.update_one(
        {"_id": ObjectId(order["buyer_id"])},
        {"$inc": {"escrow_balance": -price}}
    )
    await db.users.update_one(
        {"_id": ObjectId(order["seller_id"])},
        {"$inc": {"wallet_balance": seller_amount}}
    )

    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {
            "status": "completed",
            "escrow_status": "released",
            "completed_at": datetime.now(timezone.utc)
        }}
    )
    await db.escrow_transactions.update_one({"order_id": order_id}, {"$set": {"status": "released"}})
    # Increment lifetime sales counter for commission tracking
    try:
        await increment_lifetime_sales(db, order["seller_id"])
    except Exception:
        pass
    # Notify + email
    try:
        import notification_service as ns
        order_updated = await db.orders.find_one({"_id": ObjectId(order_id)})
        await ns.notify_order_event(db, order_updated, "completed")
        # Send escrow released email
        import email_service as es
        seller_doc = await db.users.find_one({"_id": ObjectId(order["seller_id"])}, {"email": 1, "name": 1})
        if seller_doc:
            await es.send_escrow_released(
                seller_doc.get("email", ""), seller_doc.get("name", ""),
                order.get("gig_title", ""), price, seller_amount, platform_fee,
                fee_rate, tier["name"], order_id, db
            )
    except Exception:
        pass
    return {"message": "Order completed. Payment released to seller.", "seller_credited": seller_amount, "platform_fee": platform_fee, "commission_tier": tier["name"], "fee_rate": fee_rate}

@orders_router.post("/{order_id}/dispute")
async def dispute_order(order_id: str, body: DisputeRequest, request: Request):
    """Buyer opens a dispute — funds stay locked until admin resolves"""
    user = await get_current_user(request)
    db = get_db()
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["buyer_id"] != user["id"]:
        raise HTTPException(403, "Only the buyer can open a dispute")
    if order["status"] not in ("delivered", "funded", "in_progress"):
        raise HTTPException(400, "Cannot dispute this order")

    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "disputed", "dispute_reason": body.reason}}
    )
    return {"message": "Dispute opened. Admin will review within 24 hours."}

@orders_router.post("/{order_id}/cancel")
async def cancel_order(order_id: str, request: Request):
    """Cancel unfunded/funded order and refund buyer"""
    user = await get_current_user(request)
    db = get_db()
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["buyer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    if order["status"] in ("completed", "cancelled"):
        raise HTTPException(400, "Order cannot be cancelled")

    # Refund: move from buyer escrow back to buyer wallet
    await db.users.update_one(
        {"_id": ObjectId(order["buyer_id"])},
        {"$inc": {"wallet_balance": order["price"], "escrow_balance": -order["price"]}}
    )
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "cancelled", "escrow_status": "refunded"}}
    )
    return {"message": "Order cancelled and refund processed."}
