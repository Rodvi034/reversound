import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, Set
import jwt
import os

logger = logging.getLogger(__name__)
liveroom_router = APIRouter(tags=["liveroom"])

class LiveRoom:
    def __init__(self, room_id: str, host_id: str):
        self.room_id = room_id
        self.host_id = host_id
        self.guests: Dict[str, WebSocket] = {}
        self.current_track = None
        self.is_playing = False
        self.current_time = 0.0
        self.created_at = datetime.now(timezone.utc).isoformat()

rooms: Dict[str, LiveRoom] = {}

def _verify_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
        return payload if payload.get("type") == "access" else None
    except Exception:
        return None

@liveroom_router.websocket("/ws/liveroom/{room_id}")
async def liveroom_ws(
    websocket: WebSocket,
    room_id: str,
    token: str = Query(None),
    role: str = Query("guest")  # host | guest
):
    payload = _verify_token(token) if token else None
    if not payload:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    user_id = payload["sub"]
    user_email = payload.get("email", user_id[:8])

    await websocket.accept()

    # Create room if host
    if role == "host":
        rooms[room_id] = LiveRoom(room_id, user_id)
        logger.info(f"LiveRoom created: {room_id} by {user_id}")

    # Get or reject
    room = rooms.get(room_id)
    if not room:
        await websocket.send_text(json.dumps({"type": "error", "message": "Room not found"}))
        await websocket.close()
        return

    room.guests[user_id] = websocket

    # Send current state to new joiner
    await websocket.send_text(json.dumps({
        "type": "room_state",
        "host_id": room.host_id,
        "current_track": room.current_track,
        "is_playing": room.is_playing,
        "current_time": room.current_time,
        "listener_count": len(room.guests)
    }))

    # Notify others
    await _broadcast(room, {
        "type": "user_joined",
        "user_id": user_id,
        "listener_count": len(room.guests)
    }, exclude=user_id)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")

            # Only host can control playback
            if user_id != room.host_id and msg_type in ("play", "pause", "seek", "load_track", "stop"):
                continue

            if msg_type == "load_track":
                room.current_track = data.get("track")
                room.is_playing = False
                room.current_time = 0.0
            elif msg_type == "play":
                room.is_playing = True
                room.current_time = data.get("time", room.current_time)
            elif msg_type == "pause":
                room.is_playing = False
                room.current_time = data.get("time", room.current_time)
            elif msg_type == "seek":
                room.current_time = data.get("time", 0.0)
            elif msg_type == "chat":
                pass  # Chat messages broadcast as-is

            # Broadcast to all guests
            await _broadcast(room, {**data, "sender_id": user_id}, exclude=None)

    except WebSocketDisconnect:
        room.guests.pop(user_id, None)
        logger.info(f"User {user_id} left room {room_id}")
        if user_id == room.host_id and not room.guests:
            rooms.pop(room_id, None)
            logger.info(f"Room {room_id} closed")
        else:
            await _broadcast(room, {
                "type": "user_left",
                "user_id": user_id,
                "listener_count": len(room.guests)
            }, exclude=None)

async def _broadcast(room: LiveRoom, payload: dict, exclude: str | None):
    dead = []
    for uid, ws in list(room.guests.items()):
        if uid == exclude:
            continue
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            dead.append(uid)
    for uid in dead:
        room.guests.pop(uid, None)

# HTTP endpoint to get room info
from fastapi import APIRouter
liveroom_http_router = APIRouter(prefix="/liverooms", tags=["liverooms"])

@liveroom_http_router.get("/{room_id}")
async def get_room_info(room_id: str):
    room = rooms.get(room_id)
    if not room:
        return {"exists": False}
    return {
        "exists": True,
        "room_id": room_id,
        "host_id": room.host_id,
        "current_track": room.current_track,
        "is_playing": room.is_playing,
        "listener_count": len(room.guests),
        "created_at": room.created_at
    }
