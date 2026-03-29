from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
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
from routes.liveroom import liveroom_router, liveroom_http_router
from seed_data import seed_demo_data

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(name)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

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
    logger.info("ReverSound API started successfully")
    yield
    close_db_client()
    logger.info("ReverSound API shut down")

app = FastAPI(title="ReverSound API", version="1.0.0", lifespan=lifespan)

cors_origins = [o.strip() for o in os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in [
    auth_router, beats_router, gigs_router, orders_router,
    messages_router, admin_router, coach_router, wallet_router,
    subscriptions_router, upload_router, files_router, feed_router,
    playlists_router, support_router, liveroom_http_router
]:
    app.include_router(router, prefix="/api")

app.include_router(ws_router)
app.include_router(liveroom_router)

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "ReverSound API v1.0.0"}
