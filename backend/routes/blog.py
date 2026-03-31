from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user, require_admin

blog_router = APIRouter(prefix="/blog", tags=["blog"])

CATEGORIES = ["Production Tips", "Industry News", "Marketing", "Tutorial", "Announcements"]

class BlogPostCreate(BaseModel):
    title: str
    content: str
    category: str
    cover_image: Optional[str] = ""
    tags: List[str] = []
    published: bool = False

class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    cover_image: Optional[str] = None
    tags: Optional[List[str]] = None
    published: Optional[bool] = None

@blog_router.get("")
async def list_posts(page: int = 1, limit: int = 12, category: str = None):
    db = get_db()
    query = {"published": True}
    if category and category != "All":
        query["category"] = category
    skip = (page - 1) * limit
    total = await db.blog_posts.count_documents(query)
    cursor = db.blog_posts.find(query, {"content": 0}).sort("created_at", -1).skip(skip).limit(limit)
    posts = docs_to_list(await cursor.to_list(limit))
    return {"posts": posts, "total": total, "page": page}

@blog_router.get("/{post_id}")
async def get_post(post_id: str):
    db = get_db()
    # Try by ID or slug
    try:
        post = await db.blog_posts.find_one({"_id": ObjectId(post_id), "published": True})
    except Exception:
        post = await db.blog_posts.find_one({"slug": post_id, "published": True})
    if not post:
        raise HTTPException(404, "Post not found")
    await db.blog_posts.update_one({"_id": post["_id"]}, {"$inc": {"views": 1}})
    return doc_to_dict(post)

@blog_router.post("")
async def create_post(body: BlogPostCreate, request: Request):
    user = await get_current_user(request)
    if user["role"] not in ("admin",) and user.get("subscription_tier") not in ("pro", "enterprise"):
        raise HTTPException(403, "Only admins and Pro creators can publish blogs")
    db = get_db()
    # Generate slug
    slug = body.title.lower().replace(" ", "-").replace("'", "")[:60] + "-" + str(datetime.now().timestamp())[:6]
    doc = {
        **body.model_dump(),
        "author_id": user["id"],
        "author_name": user["name"],
        "author_username": user.get("username", ""),
        "slug": slug,
        "views": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    result = await db.blog_posts.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc_to_dict(doc)

@blog_router.patch("/{post_id}")
async def update_post(post_id: str, body: BlogPostUpdate, request: Request):
    user = await get_current_user(request)
    db = get_db()
    post = await db.blog_posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(404, "Not found")
    if post["author_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc)
    await db.blog_posts.update_one({"_id": ObjectId(post_id)}, {"$set": updates})
    updated = await db.blog_posts.find_one({"_id": ObjectId(post_id)})
    return doc_to_dict(updated)

@blog_router.delete("/{post_id}")
async def delete_post(post_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    post = await db.blog_posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(404, "Not found")
    if post["author_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    await db.blog_posts.delete_one({"_id": ObjectId(post_id)})
    return {"message": "Post deleted"}
