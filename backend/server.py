from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging

from database import get_db, close_db_client
from auth import auth_router, seed_admin
from routes.beats import beats_router
from routes.gigs import gigs_router
from routes.orders import orders_router
from routes.messages import messages_router
from routes.admin import admin_router
from routes.coach import coach_router
from routes.wallet import wallet_router
from routes.subscriptions import subscriptions_router
from routes.upload import upload_router, files_router, init_storage
from routes.websocket import ws_router
from routes.feed import feed_router
from routes.playlists import playlists_router
from routes.support import support_router
from routes.liveroom import liveroom_router, liveroom_http_router, room_manager
from routes.analytics import analytics_router
from routes.payment import payment_router
from routes.notifications import notifications_router, notif_ws_router
from routes.profiles import profiles_router
from routes.financials import financials_router
from routes.favorites import favorites_router
from routes.job_requests import job_requests_router
from routes.blog import blog_router
from routes.rever_studio import studio_router
from seed_data import seed_demo_data

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(name)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

async def create_indexes(db):
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username")
    await db.beats.create_index([("genre", 1), ("status", 1)])
    await db.beats.create_index([("status", 1), ("created_at", -1)])
    await db.beats.create_index([("item_type", 1), ("status", 1)])
    await db.gigs.create_index([("category", 1), ("status", 1)])
    await db.orders.create_index("buyer_id")
    await db.orders.create_index("seller_id")
    await db.messages.create_index("conversation_id")
    await db.conversations.create_index("participants")
    await db.submissions.create_index("status")
    await db.feed_posts.create_index([("created_at", -1)])
    await db.files.create_index("storage_path")
    await db.notifications.create_index([("user_id", 1), ("is_read", 1)])
    await db.notifications.create_index([("created_at", -1)])
    await db.play_events.create_index([("producer_id", 1), ("played_at", -1)])
    await db.payments.create_index("order_id")
    await db.submerchants.create_index("user_id", unique=True, sparse=True)
    await db.email_queue.create_index([("created_at", -1)])
    await db.favorites.create_index([("user_id", 1), ("item_type", 1)])
    await db.job_requests.create_index([("status", 1), ("category", 1)])
    await db.blog_posts.create_index([("published", 1), ("created_at", -1)])
    await db.proposals.create_index("job_request_id")

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = get_db()
    await seed_admin(db)
    await create_indexes(db)
    await seed_demo_data(db)
    try:
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init deferred: {e}")
    await room_manager.init()
    logger.info("ReverSound API v6.0 started — The Legendary Platform")
    yield
    close_db_client()

app = FastAPI(title="ReverSound API", version="6.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

cors_origins = [o.strip() for o in os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')]
app.add_middleware(CORSMiddleware, allow_origins=cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

for router in [
    auth_router, beats_router, gigs_router, orders_router,
    messages_router, admin_router, coach_router, wallet_router,
    subscriptions_router, upload_router, files_router, feed_router,
    playlists_router, support_router, liveroom_http_router,
    analytics_router, payment_router, notifications_router,
    profiles_router, financials_router, favorites_router,
    job_requests_router, blog_router, studio_router,
]:
    app.include_router(router, prefix="/api")

app.include_router(ws_router)
app.include_router(liveroom_router)
app.include_router(notif_ws_router)

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "ReverSound API v6.0"}
