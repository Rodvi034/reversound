"""
Redis-Ready Live Room Manager.
Uses Redis when available (REDIS_URL env var), falls back to MongoDB + in-memory.
Provides persistent room state across server restarts when Redis is configured.
"""
import json
import logging
import os
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, Optional
import jwt

logger = logging.getLogger(__name__)
liveroom_router = APIRouter(tags=["liveroom"])
liveroom_http_router = APIRouter(prefix="/liverooms", tags=["liverooms"])


class RoomStateManager:
    """
    Dual-backend room state manager.
    Primary: Redis (when REDIS_URL is set and Redis is reachable)
    Fallback: In-memory dict + MongoDB persistence
    """

    def __init__(self):
        self._redis = None
        self._local: Dict[str, dict] = {}          # In-memory fallback
        self._websockets: Dict[str, Dict[str, WebSocket]] = {}  # room_id -> {user_id -> ws}

    async def init(self):
        redis_url = os.environ.get("REDIS_URL", "")
        if not redis_url:
            logger.info("REDIS_URL not set — LiveRoom using in-memory state (single-instance)")
            return
        try:
            import redis.asyncio as aioredis
            client = aioredis.from_url(redis_url, decode_responses=True)
            await client.ping()
            self._redis = client
            logger.info("LiveRoom: Redis connected")
        except Exception as e:
            logger.warning(f"Redis unavailable: {e} — using in-memory state")
            self._redis = None

    # ── State operations ────────────────────────────────────────────────────────
    async def create_room(self, room_id: str, host_id: str) -> dict:
        state = {
            "room_id": room_id, "host_id": host_id, "current_track": None,
            "is_playing": False, "current_time": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        if self._redis:
            await self._redis.hset(f"rs:room:{room_id}", mapping={k: json.dumps(v) for k, v in state.items()})
            await self._redis.expire(f"rs:room:{room_id}", 86400)
        else:
            self._local[room_id] = state
        return state

    async def get_room(self, room_id: str) -> Optional[dict]:
        if self._redis:
            raw = await self._redis.hgetall(f"rs:room:{room_id}")
            if not raw:
                return None
            return {k: json.loads(v) for k, v in raw.items()}
        return self._local.get(room_id)

    async def update_room(self, room_id: str, **kwargs):
        if self._redis:
            await self._redis.hset(f"rs:room:{room_id}", mapping={k: json.dumps(v) for k, v in kwargs.items()})
        elif room_id in self._local:
            self._local[room_id].update(kwargs)

    async def delete_room(self, room_id: str):
        if self._redis:
            await self._redis.delete(f"rs:room:{room_id}")
        self._local.pop(room_id, None)

    # ── WebSocket management ────────────────────────────────────────────────────
    def add_ws(self, room_id: str, user_id: str, ws: WebSocket):
        self._websockets.setdefault(room_id, {})[user_id] = ws

    def remove_ws(self, room_id: str, user_id: str):
        self._websockets.get(room_id, {}).pop(user_id, None)

    def get_listener_count(self, room_id: str) -> int:
        return len(self._websockets.get(room_id, {}))

    async def broadcast(self, room_id: str, payload: dict, exclude: str = None):
        dead = []
        for uid, ws in list(self._websockets.get(room_id, {}).items()):
            if uid == exclude:
                continue
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.remove_ws(room_id, uid)


room_manager = RoomStateManager()


def _verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
        return payload if payload.get("type") == "access" else None
    except Exception:
        return None


@liveroom_router.websocket("/ws/liveroom/{room_id}")
async def liveroom_ws(websocket: WebSocket, room_id: str, token: str = Query(None), role: str = Query("guest")):
    payload = _verify_token(token) if token else None
    if not payload:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    user_id = payload["sub"]
    await websocket.accept()

    # Host creates the room
    if role == "host":
        await room_manager.create_room(room_id, user_id)
        logger.info(f"LiveRoom created: {room_id} by {user_id}")

    room = await room_manager.get_room(room_id)
    if not room:
        await websocket.send_text(json.dumps({"type": "error", "message": "Room not found"}))
        await websocket.close()
        return

    room_manager.add_ws(room_id, user_id, websocket)
    listener_count = room_manager.get_listener_count(room_id)

    # Send current state
    await websocket.send_text(json.dumps({
        "type": "room_state",
        "host_id": room["host_id"],
        "current_track": room.get("current_track"),
        "is_playing": room.get("is_playing", False),
        "current_time": room.get("current_time", 0.0),
        "listener_count": listener_count,
        "backend": "redis" if room_manager._redis else "memory"
    }))

    await room_manager.broadcast(room_id, {
        "type": "user_joined", "user_id": user_id, "listener_count": listener_count
    }, exclude=user_id)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")

            # Only host controls playback
            if user_id != room["host_id"] and msg_type in ("play", "pause", "seek", "load_track", "stop"):
                continue

            if msg_type == "load_track":
                await room_manager.update_room(room_id, current_track=data.get("track"), is_playing=False, current_time=0.0)
                room = await room_manager.get_room(room_id)
            elif msg_type == "play":
                t = float(data.get("time", room.get("current_time", 0)))
                await room_manager.update_room(room_id, is_playing=True, current_time=t)
            elif msg_type == "pause":
                t = float(data.get("time", room.get("current_time", 0)))
                await room_manager.update_room(room_id, is_playing=False, current_time=t)
            elif msg_type == "seek":
                t = float(data.get("time", 0))
                await room_manager.update_room(room_id, current_time=t)
            elif msg_type == "heartbeat":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue

            await room_manager.broadcast(room_id, {**data, "sender_id": user_id}, exclude=None)

    except WebSocketDisconnect:
        room_manager.remove_ws(room_id, user_id)
        lc = room_manager.get_listener_count(room_id)
        logger.info(f"User {user_id} left room {room_id}, {lc} remaining")
        if user_id == room.get("host_id") and lc == 0:
            await room_manager.delete_room(room_id)
        else:
            await room_manager.broadcast(room_id, {"type": "user_left", "user_id": user_id, "listener_count": lc}, exclude=None)


@liveroom_http_router.get("/{room_id}")
async def get_room_info(room_id: str):
    room = await room_manager.get_room(room_id)
    if not room:
        return {"exists": False}
    return {
        "exists": True,
        "room_id": room_id,
        "host_id": room.get("host_id"),
        "current_track": room.get("current_track"),
        "is_playing": room.get("is_playing", False),
        "listener_count": room_manager.get_listener_count(room_id),
        "created_at": room.get("created_at"),
        "state_backend": "redis" if room_manager._redis else "memory"
    }
