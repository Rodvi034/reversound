from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user

support_router = APIRouter(prefix="/support", tags=["support"])

CATEGORIES = ["payment", "moderation", "technical", "account", "order", "other"]

class TicketCreate(BaseModel):
    subject: str
    category: str
    description: str
    order_id: Optional[str] = None

class TicketReply(BaseModel):
    message: str

@support_router.post("/tickets")
async def create_ticket(body: TicketCreate, request: Request):
    user = await get_current_user(request)
    db = get_db()
    if body.category not in CATEGORIES:
        raise HTTPException(400, f"Category must be one of: {', '.join(CATEGORIES)}")
    ticket_doc = {
        "user_id": user["id"],
        "user_name": user["name"],
        "user_email": user.get("email", ""),
        "subject": body.subject,
        "category": body.category,
        "description": body.description,
        "order_id": body.order_id,
        "status": "open",       # open | in_progress | resolved | closed
        "priority": "normal",
        "messages": [
            {
                "sender_id": user["id"],
                "sender_name": user["name"],
                "is_admin": False,
                "content": body.description,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    result = await db.support_tickets.insert_one(ticket_doc)
    ticket_doc["_id"] = result.inserted_id
    return doc_to_dict(ticket_doc)

@support_router.get("/tickets")
async def list_tickets(request: Request):
    user = await get_current_user(request)
    db = get_db()
    if user["role"] == "admin":
        cursor = db.support_tickets.find({}).sort("created_at", -1)
    else:
        cursor = db.support_tickets.find({"user_id": user["id"]}).sort("created_at", -1)
    return docs_to_list(await cursor.to_list(100))

@support_router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    ticket = await db.support_tickets.find_one({"_id": ObjectId(ticket_id)})
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    if ticket["user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    return doc_to_dict(ticket)

@support_router.post("/tickets/{ticket_id}/reply")
async def reply_to_ticket(ticket_id: str, body: TicketReply, request: Request):
    user = await get_current_user(request)
    db = get_db()
    ticket = await db.support_tickets.find_one({"_id": ObjectId(ticket_id)})
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    if ticket["user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    if ticket["status"] == "closed":
        raise HTTPException(400, "Ticket is closed")

    message = {
        "sender_id": user["id"],
        "sender_name": user["name"],
        "is_admin": user["role"] == "admin",
        "content": body.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    new_status = "in_progress" if user["role"] == "admin" and ticket["status"] == "open" else ticket["status"]
    await db.support_tickets.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$push": {"messages": message}, "$set": {"updated_at": datetime.now(timezone.utc), "status": new_status}}
    )
    return {"message": "Reply sent", "new_status": new_status}

@support_router.patch("/tickets/{ticket_id}/status")
async def update_ticket_status(ticket_id: str, status: str, request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    db = get_db()
    valid_statuses = {"open", "in_progress", "resolved", "closed"}
    if status not in valid_statuses:
        raise HTTPException(400, f"Invalid status. Use: {', '.join(valid_statuses)}")
    await db.support_tickets.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": f"Ticket {status}"}

@support_router.get("/stats")
async def support_stats(request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    db = get_db()
    return {
        "total": await db.support_tickets.count_documents({}),
        "open": await db.support_tickets.count_documents({"status": "open"}),
        "in_progress": await db.support_tickets.count_documents({"status": "in_progress"}),
        "resolved": await db.support_tickets.count_documents({"status": "resolved"}),
    }
