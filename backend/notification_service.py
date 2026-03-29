"""
Notification Service — creates and pushes in-app notifications.
Supports real-time WebSocket push if user is online, else stored for polling.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Optional
from fastapi import WebSocket
from bson import ObjectId

logger = logging.getLogger(__name__)

# WebSocket connections: user_id -> WebSocket
_connections: Dict[str, WebSocket] = {}

NOTIFICATION_TYPES = {
    "new_message": {"icon": "message", "label": "Yeni Mesaj"},
    "order_funded": {"icon": "shield", "label": "Escrow Fonlandı"},
    "order_started": {"icon": "clock", "label": "Sipariş Başladı"},
    "order_delivered": {"icon": "package", "label": "Teslim Edildi"},
    "order_completed": {"icon": "check-circle", "label": "Sipariş Tamamlandı"},
    "order_disputed": {"icon": "alert-triangle", "label": "İtiraz Açıldı"},
    "order_revision": {"icon": "refresh-cw", "label": "Revizyon İstendi"},
    "order_cancelled": {"icon": "x-circle", "label": "Sipariş İptal Edildi"},
    "payment_received": {"icon": "wallet", "label": "Ödeme Alındı"},
    "support_reply": {"icon": "help-circle", "label": "Destek Yanıtı"},
    "new_order": {"icon": "briefcase", "label": "Yeni Sipariş"},
    "beat_approved": {"icon": "music", "label": "Beat Onaylandı"},
    "gig_approved": {"icon": "briefcase", "label": "Gig Onaylandı"},
}

def register_ws(user_id: str, websocket: WebSocket):
    _connections[user_id] = websocket

def unregister_ws(user_id: str):
    _connections.pop(user_id, None)

async def create_notification(db, user_id: str, ntype: str, title: str, message: str, ref_id: str = None, ref_type: str = None):
    """Create a notification in DB and push via WebSocket if online."""
    doc = {
        "user_id": user_id,
        "type": ntype,
        "title": title,
        "message": message,
        "ref_id": ref_id,
        "ref_type": ref_type,
        "is_read": False,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.notifications.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Push via WebSocket if connected
    ws = _connections.get(user_id)
    if ws:
        try:
            payload = {
                "id": str(result.inserted_id),
                "type": ntype,
                "title": title,
                "message": message,
                "ref_id": ref_id,
                "ref_type": ref_type,
                "is_read": False,
                "created_at": doc["created_at"].isoformat()
            }
            await ws.send_text(json.dumps({"event": "notification", "data": payload}))
        except Exception as e:
            logger.warning(f"WS push failed for {user_id}: {e}")
            unregister_ws(user_id)

    return doc

async def notify_order_event(db, order: dict, event: str):
    """Convenience: send notifications to both buyer and seller for order events."""
    buyer_id = order.get("buyer_id")
    seller_id = order.get("seller_id")
    gig_title = order.get("gig_title", "Sipariş")
    order_id = str(order.get("_id") or order.get("id", ""))

    messages = {
        "funded": ("Escrow Fonlandı", f"'{gig_title}' için ödemen güvende tutuldu.", seller_id,
                   "Yeni Sipariş Aldın", f"'{gig_title}' için yeni sipariş geldi! Ödeme escrow'da bekliyor.", buyer_id),
        "started": (None, None, None, "Sipariş Başladı", f"'{gig_title}' üzerinde çalışmaya başlandı.", buyer_id),
        "delivered": ("Teslim Edildi", f"'{gig_title}' teslim edildi. Lütfen incele.", buyer_id, None, None, None),
        "completed": ("Ödeme Alındı", f"'{gig_title}' tamamlandı. Ödemen cüzdanına aktarıldı.", seller_id,
                      "Sipariş Tamamlandı", f"'{gig_title}' başarıyla tamamlandı.", buyer_id),
        "disputed": (None, None, None, "İtiraz Bildirimi", f"'{gig_title}' için alıcı itiraz açtı.", seller_id),
        "cancelled": ("Sipariş İptal Edildi", f"'{gig_title}' iptal edildi. Ödemen iade edildi.", buyer_id, None, None, None),
        "revision": (None, None, None, "Revizyon İstendi", f"'{gig_title}' için revizyon talep edildi.", seller_id),
    }

    entry = messages.get(event)
    if not entry:
        return

    buyer_title, buyer_msg, _buyer_id, seller_title, seller_msg, _seller_id = entry

    if buyer_title and _buyer_id:
        ntype_map = {"funded": "order_funded", "completed": "order_completed", "delivered": "order_delivered",
                     "cancelled": "order_cancelled", "disputed": "order_disputed", "revision": "order_revision"}
        await create_notification(db, _buyer_id, ntype_map.get(event, "new_message"), buyer_title, buyer_msg, order_id, "order")

    if seller_title and _seller_id:
        ntype_map2 = {"funded": "new_order", "completed": "payment_received", "started": "order_started", "revision": "order_revision"}
        await create_notification(db, _seller_id, ntype_map2.get(event, "new_message"), seller_title, seller_msg, order_id, "order")
