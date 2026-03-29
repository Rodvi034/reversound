import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, List
from bson import ObjectId

import jwt
import os
from database import get_db
from utils import doc_to_dict, moderate_message

logger = logging.getLogger(__name__)
ws_router = APIRouter(tags=["websocket"])

class ConversationManager:
    def __init__(self):
        self._rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, ws: WebSocket, conv_id: str):
        await ws.accept()
        self._rooms.setdefault(conv_id, []).append(ws)

    def disconnect(self, ws: WebSocket, conv_id: str):
        room = self._rooms.get(conv_id, [])
        if ws in room:
            room.remove(ws)

    async def broadcast(self, conv_id: str, payload: dict):
        for ws in list(self._rooms.get(conv_id, [])):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                self._rooms.get(conv_id, []).remove(ws)

manager = ConversationManager()

def _verify_ws_token(token: str) -> dict | None:
    try:
        secret = os.environ["JWT_SECRET"]
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        if payload.get("type") != "access":
            return None
        return payload
    except Exception:
        return None

@ws_router.websocket("/ws/conversations/{conversation_id}")
async def ws_conversation(
    websocket: WebSocket,
    conversation_id: str,
    token: str = Query(None)
):
    # Auth
    payload = _verify_ws_token(token) if token else None
    if not payload:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    user_id = payload["sub"]
    user_email = payload.get("email", "")

    db = get_db()

    # Verify conversation participation
    try:
        conv = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    except Exception:
        await websocket.close(code=4004, reason="Not found")
        return

    if not conv or user_id not in conv.get("participants", []):
        await websocket.close(code=4003, reason="Forbidden")
        return

    # Get user name
    user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    user_name = user_doc.get("name", "User") if user_doc else "User"

    await manager.connect(websocket, conversation_id)
    logger.info(f"WS connected: user={user_id} conv={conversation_id}")

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            content = data.get("content", "").strip()
            if not content:
                continue

            # Moderation
            is_flagged, flag_reason = moderate_message(content)

            msg_doc = {
                "conversation_id": conversation_id,
                "sender_id": user_id,
                "sender_name": user_name,
                "content": content if not is_flagged else "[Message blocked by moderation]",
                "is_flagged": is_flagged,
                "flag_reason": flag_reason if is_flagged else None,
                "created_at": datetime.now(timezone.utc)
            }
            result = await db.messages.insert_one(msg_doc)
            msg_doc["_id"] = result.inserted_id

            # Update conversation
            await db.conversations.update_one(
                {"_id": ObjectId(conversation_id)},
                {"$set": {
                    "last_message": msg_doc["content"][:100],
                    "last_message_at": msg_doc["created_at"]
                }}
            )

            broadcast_payload = doc_to_dict(msg_doc)
            if is_flagged:
                broadcast_payload["warning"] = flag_reason

            await manager.broadcast(conversation_id, broadcast_payload)

    except WebSocketDisconnect:
        manager.disconnect(websocket, conversation_id)
        logger.info(f"WS disconnected: user={user_id} conv={conversation_id}")
