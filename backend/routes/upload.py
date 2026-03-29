import os
import uuid
import requests
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import Response

from database import get_db
from utils import doc_to_dict
from auth import get_current_user
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

upload_router = APIRouter(prefix="/upload", tags=["upload"])
files_router = APIRouter(prefix="/files", tags=["files"])

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "reversound"

ALLOWED_AUDIO = {"mp3", "wav", "flac", "ogg", "aac", "m4a"}
ALLOWED_PACK = {"zip"}
ALLOWED_IMAGE = {"jpg", "jpeg", "png", "webp", "gif"}
MAX_AUDIO_SIZE = 200 * 1024 * 1024   # 200MB
MAX_PACK_SIZE = 500 * 1024 * 1024    # 500MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024    # 10MB

storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    emergent_key = os.environ.get("EMERGENT_LLM_KEY")
    if not emergent_key:
        raise RuntimeError("EMERGENT_LLM_KEY not set")
    resp = requests.post(
        f"{STORAGE_URL}/init",
        json={"emergent_key": emergent_key},
        timeout=30
    )
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    logger.info("Object storage initialized")
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

MIME_MAP = {
    "mp3": "audio/mpeg", "wav": "audio/wav", "flac": "audio/flac",
    "ogg": "audio/ogg", "aac": "audio/aac", "m4a": "audio/mp4",
    "zip": "application/zip",
    "jpg": "image/jpeg", "jpeg": "image/jpeg",
    "png": "image/png", "webp": "image/webp", "gif": "image/gif",
}

async def upload_file_to_storage(file: UploadFile, user_id: str, file_type: str) -> dict:
    """Upload file to object storage and record in DB."""
    db = get_db()
    filename = file.filename or "upload"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    # Validate extension
    if file_type == "audio" and ext not in ALLOWED_AUDIO:
        raise HTTPException(400, f"Unsupported audio format. Allowed: {', '.join(ALLOWED_AUDIO)}")
    if file_type == "pack" and ext not in ALLOWED_PACK:
        raise HTTPException(400, "Packs must be .zip files")
    if file_type == "image" and ext not in ALLOWED_IMAGE:
        raise HTTPException(400, f"Unsupported image format. Allowed: {', '.join(ALLOWED_IMAGE)}")

    data = await file.read()

    # Size validation
    limits = {"audio": MAX_AUDIO_SIZE, "pack": MAX_PACK_SIZE, "image": MAX_IMAGE_SIZE}
    if len(data) > limits.get(file_type, MAX_AUDIO_SIZE):
        raise HTTPException(413, f"File too large. Max {limits[file_type] // (1024*1024)}MB")

    content_type = MIME_MAP.get(ext, file.content_type or "application/octet-stream")
    path = f"{APP_NAME}/{file_type}s/{user_id}/{uuid.uuid4()}.{ext}"

    result = put_object(path, data, content_type)

    record = {
        "storage_path": result["path"],
        "original_filename": filename,
        "content_type": content_type,
        "file_type": file_type,
        "size": result.get("size", len(data)),
        "uploaded_by": user_id,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc)
    }
    ins = await db.files.insert_one(record)
    record["_id"] = ins.inserted_id
    return doc_to_dict(record)

@upload_router.post("/audio")
async def upload_audio(file: UploadFile = File(...), request: Request = None):
    user = await get_current_user(request)
    record = await upload_file_to_storage(file, user["id"], "audio")
    return {
        "file_id": record["id"],
        "storage_path": record["storage_path"],
        "original_filename": record["original_filename"],
        "size": record["size"],
        "content_type": record["content_type"],
        "url": f"/api/files/{record['storage_path']}"
    }

@upload_router.post("/pack")
async def upload_pack(file: UploadFile = File(...), request: Request = None):
    user = await get_current_user(request)
    if user["role"] not in ("producer", "admin"):
        raise HTTPException(403, "Only producers can upload packs")
    record = await upload_file_to_storage(file, user["id"], "pack")
    return {
        "file_id": record["id"],
        "storage_path": record["storage_path"],
        "original_filename": record["original_filename"],
        "size": record["size"],
        "url": f"/api/files/{record['storage_path']}"
    }

@upload_router.post("/image")
async def upload_image(file: UploadFile = File(...), request: Request = None):
    user = await get_current_user(request)
    record = await upload_file_to_storage(file, user["id"], "image")
    return {
        "file_id": record["id"],
        "storage_path": record["storage_path"],
        "url": f"/api/files/{record['storage_path']}"
    }

@files_router.get("/{path:path}")
async def serve_file(path: str, request: Request, auth: str = None):
    """Serve files from object storage. Supports Bearer header or ?auth= query param."""
    # Auth check
    token = request.cookies.get("access_token") or auth
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(401, "Authentication required")

    db = get_db()
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(404, "File not found")

    data, content_type = get_object(path)
    return Response(
        content=data,
        media_type=record.get("content_type", content_type),
        headers={
            "Cache-Control": "public, max-age=3600",
            "Content-Disposition": f"inline; filename=\"{record.get('original_filename', 'file')}\"",
            "Accept-Ranges": "bytes",
        }
    )
