from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list, moderate_message
from auth import get_current_user

messages_router = APIRouter(prefix="/conversations", tags=["messages"])

class ConversationCreate(BaseModel):
    participant_id: str
    order_id: Optional[str] = None

class MessageCreate(BaseModel):
    content: str

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

    # Moderation check
    is_flagged, flag_reason = moderate_message(body.content)

    msg_doc = {
        "conversation_id": conversation_id,
        "sender_id": user["id"],
        "sender_name": user["name"],
        "content": body.content if not is_flagged else "[Message blocked by moderation]",
        "is_flagged": is_flagged,
        "flag_reason": flag_reason if is_flagged else None,
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
