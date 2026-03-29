import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request, Query
from bson import ObjectId
import jwt
import os

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user
import notification_service as ns

logger = logging.getLogger(__name__)
notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])

@notifications_router.get("")
async def list_notifications(request: Request, limit: int = 30, unread_only: bool = False):
    user = await get_current_user(request)
    db = get_db()
    query = {"user_id": user["id"]}
    if unread_only:
        query["is_read"] = False
    cursor = db.notifications.find(query).sort("created_at", -1).limit(limit)
    return docs_to_list(await cursor.to_list(limit))

@notifications_router.get("/unread-count")
async def unread_count(request: Request):
    user = await get_current_user(request)
    db = get_db()
    count = await db.notifications.count_documents({"user_id": user["id"], "is_read": False})
    return {"count": count}

@notifications_router.post("/{notif_id}/read")
async def mark_read(notif_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    await db.notifications.update_one(
        {"_id": ObjectId(notif_id), "user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "Marked as read"}

@notifications_router.post("/read-all")
async def mark_all_read(request: Request):
    user = await get_current_user(request)
    db = get_db()
    result = await db.notifications.update_many(
        {"user_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"updated": result.modified_count}

@notifications_router.delete("/{notif_id}")
async def delete_notification(notif_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    await db.notifications.delete_one({"_id": ObjectId(notif_id), "user_id": user["id"]})
    return {"message": "Deleted"}

# ── WebSocket for real-time push ────────────────────────────────────────────────
notif_ws_router = APIRouter(tags=["notifications_ws"])

@notif_ws_router.websocket("/ws/notifications")
async def notifications_ws(websocket: WebSocket, token: str = Query(None)):
    if not token:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
        if payload.get("type") != "access":
            await websocket.close(code=4001); return
        user_id = payload["sub"]
    except Exception:
        await websocket.close(code=4001, reason="Invalid token"); return

    await websocket.accept()
    ns.register_ws(user_id, websocket)

    # Send unread count on connect
    db = get_db()
    count = await db.notifications.count_documents({"user_id": user_id, "is_read": False})
    await websocket.send_text(json.dumps({"event": "unread_count", "count": count}))

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                if data.get("action") == "mark_all_read":
                    await db.notifications.update_many(
                        {"user_id": user_id, "is_read": False},
                        {"$set": {"is_read": True}}
                    )
                    await websocket.send_text(json.dumps({"event": "all_read"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ns.unregister_ws(user_id)
