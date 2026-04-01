from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list, moderate_message, mask_sensitive_content
from auth import get_current_user

messages_router = APIRouter(prefix="/conversations", tags=["messages"])

class ConversationCreate(BaseModel):
    participant_id: str
    order_id: Optional[str] = None

class MessageCreate(BaseModel):
    content: str

class CustomOfferCreate(BaseModel):
    price: float
    delivery_days: int
    description: str

@messages_router.post("/{conversation_id}/offer")
async def send_custom_offer(conversation_id: str, body: CustomOfferCreate, request: Request):
    """Send a custom offer within a conversation."""
    user = await get_current_user(request)
    db = get_db()
    conv = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not conv:
        raise HTTPException(404, "Conversation not found")
    if user["id"] not in conv["participants"]:
        raise HTTPException(403, "Not authorized")

    offer_doc = {
        "conversation_id": conversation_id,
        "sender_id": user["id"],
        "sender_name": user["name"],
        "content": f"Özel Teklif: ₺{body.price:.2f} — {body.delivery_days} gün teslim",
        "message_type": "custom_offer",
        "offer_price": body.price,
        "offer_days": body.delivery_days,
        "offer_description": body.description,
        "offer_status": "pending",
        "is_flagged": False,
        "flag_reason": None,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.messages.insert_one(offer_doc)
    offer_doc["_id"] = result.inserted_id
    await db.conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {"last_message": offer_doc["content"][:100], "last_message_at": offer_doc["created_at"]}}
    )
    return doc_to_dict(offer_doc)

@messages_router.post("/{conversation_id}/offer/{message_id}/accept")
async def accept_custom_offer(conversation_id: str, message_id: str, requirements: str = "Custom offer accepted", request: Request = None):
    """Buyer accepts a custom offer → creates an escrow order."""
    user = await get_current_user(request)
    db = get_db()
    msg = await db.messages.find_one({"_id": ObjectId(message_id), "conversation_id": conversation_id, "message_type": "custom_offer"})
    if not msg:
        raise HTTPException(404, "Offer not found")
    if msg["offer_status"] != "pending":
        raise HTTPException(400, f"Offer already {msg['offer_status']}")
    if msg["sender_id"] == user["id"]:
        raise HTTPException(400, "Cannot accept your own offer")

    # Get conversation participants to identify buyer/seller
    conv = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    seller_id = msg["sender_id"]
    buyer_id = user["id"]

    # Check buyer balance
    buyer = await db.users.find_one({"_id": ObjectId(buyer_id)})
    price = msg["offer_price"]
    if buyer.get("wallet_balance", 0) < price:
        raise HTTPException(400, f"Insufficient balance. Need ₺{price:.2f}")

    # Get seller name
    seller = await db.users.find_one({"_id": ObjectId(seller_id)})
    seller_name = seller.get("name", "") if seller else ""

    # Deduct escrow
    await db.users.update_one({"_id": ObjectId(buyer_id)}, {"$inc": {"wallet_balance": -price, "escrow_balance": price}})

    from datetime import timedelta
    due_date = datetime.now(timezone.utc) + timedelta(days=msg["offer_days"])
    order_doc = {
        "buyer_id": buyer_id,
        "buyer_name": buyer.get("name", "") if buyer else "",
        "seller_id": seller_id,
        "seller_name": seller_name,
        "gig_id": None,
        "gig_title": f"Özel Teklif: {msg['offer_description'][:50]}",
        "tier": "custom",
        "tier_description": msg["offer_description"],
        "price": price,
        "delivery_days": msg["offer_days"],
        "revisions": 1,
        "requirements": requirements,
        "status": "funded",
        "escrow_status": "held",
        "due_date": due_date,
        "revisions_used": 0,
        "attachments": [],
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.orders.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id

    await db.messages.update_one({"_id": ObjectId(message_id)}, {"$set": {"offer_status": "accepted"}})

    return {"message": "Teklif kabul edildi. Escrow oluşturuldu.", "order_id": str(result.inserted_id)}

@messages_router.post("/{conversation_id}/offer/{message_id}/decline")
async def decline_offer(conversation_id: str, message_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    await db.messages.update_one(
        {"_id": ObjectId(message_id), "conversation_id": conversation_id},
        {"$set": {"offer_status": "declined"}}
    )
    return {"message": "Teklif reddedildi"}

@messages_router.get("")
async def list_conversations(request: Request):
    user = await get_current_user(request)
    db = get_db()
    cursor = db.conversations.find(
        {"participants": user["id"]}
    ).sort("last_message_at", -1)
    conversations = docs_to_list(await cursor.to_list(50))

    # Enrich with participant info
    for conv in conversations:
        other_id = next((p for p in conv.get("participants", []) if p != user["id"]), None)
        if other_id:
            other_user = await db.users.find_one({"_id": ObjectId(other_id)})
            if other_user:
                conv["other_user"] = {
                    "id": str(other_user["_id"]),
                    "name": other_user.get("name", ""),
                    "username": other_user.get("username", ""),
                    "avatar_url": other_user.get("avatar_url", ""),
                    "role": other_user.get("role", "")
                }
    return conversations

@messages_router.post("")
async def get_or_create_conversation(body: ConversationCreate, request: Request):
    user = await get_current_user(request)
    db = get_db()

    if body.participant_id == user["id"]:
        raise HTTPException(400, "Cannot create conversation with yourself")

    # Check other user exists
    other_user = await db.users.find_one({"_id": ObjectId(body.participant_id)})
    if not other_user:
        raise HTTPException(404, "User not found")

    # Find existing conversation
    participants = sorted([user["id"], body.participant_id])
    existing = await db.conversations.find_one({"participants": {"$all": participants}})
    if existing:
        return doc_to_dict(existing)

    # Create new
    conv_doc = {
        "participants": participants,
        "order_id": body.order_id,
        "last_message": None,
        "last_message_at": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.conversations.insert_one(conv_doc)
    conv_doc["_id"] = result.inserted_id
    return doc_to_dict(conv_doc)

@messages_router.get("/{conversation_id}/messages")
async def get_messages(conversation_id: str, request: Request, page: int = 1, limit: int = 50):
    user = await get_current_user(request)
    db = get_db()
    conv = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not conv:
        raise HTTPException(404, "Conversation not found")
    if user["id"] not in conv["participants"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")

    skip = (page - 1) * limit
    total = await db.messages.count_documents({"conversation_id": conversation_id})
    cursor = db.messages.find(
        {"conversation_id": conversation_id}
    ).sort("created_at", 1).skip(skip).limit(limit)
    messages = docs_to_list(await cursor.to_list(limit))
    return {"messages": messages, "total": total}

@messages_router.post("/{conversation_id}/messages")
async def send_message(conversation_id: str, body: MessageCreate, request: Request):
    user = await get_current_user(request)
    db = get_db()
    conv = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not conv:
        raise HTTPException(404, "Conversation not found")
    if user["id"] not in conv["participants"]:
        raise HTTPException(403, "Not authorized")

    # Stage 1: Hard block (extreme content — stays as is)
    is_flagged, flag_reason = moderate_message(body.content)

    # Stage 2: DLP masking (contact info → replace placeholders)
    content_to_store = body.content
    dlp_masked = False
    dlp_reason = ""
    if not is_flagged:
        content_to_store, dlp_masked, dlp_reason = mask_sensitive_content(body.content)

    msg_doc = {
        "conversation_id": conversation_id,
        "sender_id": user["id"],
        "sender_name": user["name"],
        "content": "[Message blocked by moderation]" if is_flagged else content_to_store,
        "original_content_masked": dlp_masked,
        "is_flagged": is_flagged,
        "flag_reason": flag_reason if is_flagged else (dlp_reason if dlp_masked else None),
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.messages.insert_one(msg_doc)
    msg_doc["_id"] = result.inserted_id

    # Update conversation last message
    await db.conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {
            "last_message": msg_doc["content"][:100],
            "last_message_at": msg_doc["created_at"]
        }}
    )

    result_dict = doc_to_dict(msg_doc)
    if is_flagged:
        result_dict["warning"] = flag_reason

    return result_dict

@messages_router.get("/{conversation_id}")
async def get_conversation(conversation_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    conv = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not conv:
        raise HTTPException(404, "Conversation not found")
    if user["id"] not in conv["participants"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    return doc_to_dict(conv)
