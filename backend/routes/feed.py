from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list, moderate_post
from auth import get_current_user

feed_router = APIRouter(prefix="/feed", tags=["feed"])

class PostCreate(BaseModel):
    content: str
    media_url: Optional[str] = None  # optional audio snippet URL

class CommentCreate(BaseModel):
    content: str

@feed_router.get("")
async def list_posts(page: int = 1, limit: int = 20):
    db = get_db()
    skip = (page - 1) * limit
    total = await db.feed_posts.count_documents({"is_hidden": {"$ne": True}})
    cursor = db.feed_posts.find(
        {"is_hidden": {"$ne": True}}
    ).sort("created_at", -1).skip(skip).limit(limit)
    posts = docs_to_list(await cursor.to_list(limit))
    return {"posts": posts, "total": total, "page": page}

@feed_router.post("")
async def create_post(body: PostCreate, request: Request):
    user = await get_current_user(request)
    db = get_db()

    content = body.content.strip()
    if not content:
        raise HTTPException(400, "Post content cannot be empty")
    if len(content) > 500:
        raise HTTPException(400, "Post too long (max 500 characters)")

    is_flagged, flag_reason = moderate_post(content)
    if is_flagged:
        raise HTTPException(400, f"Post blocked: {flag_reason}")

    post_doc = {
        "author_id": user["id"],
        "author_name": user["name"],
        "author_username": user.get("username", ""),
        "author_role": user.get("role", ""),
        "content": content,
        "media_url": body.media_url,
        "likes": [],
        "comments_count": 0,
        "is_hidden": False,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.feed_posts.insert_one(post_doc)
    post_doc["_id"] = result.inserted_id
    return doc_to_dict(post_doc)

@feed_router.get("/{post_id}")
async def get_post(post_id: str):
    db = get_db()
    post = await db.feed_posts.find_one({"_id": ObjectId(post_id), "is_hidden": {"$ne": True}})
    if not post:
        raise HTTPException(404, "Post not found")
    # Fetch comments
    comments_cursor = db.feed_comments.find({"post_id": post_id}).sort("created_at", 1).limit(50)
    comments = docs_to_list(await comments_cursor.to_list(50))
    result = doc_to_dict(post)
    result["comments"] = comments
    return result

@feed_router.post("/{post_id}/like")
async def toggle_like(post_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    post = await db.feed_posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(404, "Post not found")
    likes = post.get("likes", [])
    if user["id"] in likes:
        await db.feed_posts.update_one({"_id": ObjectId(post_id)}, {"$pull": {"likes": user["id"]}})
        return {"liked": False}
    else:
        await db.feed_posts.update_one({"_id": ObjectId(post_id)}, {"$addToSet": {"likes": user["id"]}})
        return {"liked": True}

@feed_router.post("/{post_id}/comments")
async def add_comment(post_id: str, body: CommentCreate, request: Request):
    user = await get_current_user(request)
    db = get_db()

    is_flagged, flag_reason = moderate_post(body.content)
    if is_flagged:
        raise HTTPException(400, f"Comment blocked: {flag_reason}")

    comment_doc = {
        "post_id": post_id,
        "author_id": user["id"],
        "author_name": user["name"],
        "author_username": user.get("username", ""),
        "content": body.content.strip(),
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.feed_comments.insert_one(comment_doc)
    comment_doc["_id"] = result.inserted_id
    await db.feed_posts.update_one({"_id": ObjectId(post_id)}, {"$inc": {"comments_count": 1}})
    return doc_to_dict(comment_doc)

@feed_router.delete("/{post_id}")
async def delete_post(post_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    post = await db.feed_posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(404, "Post not found")
    if post["author_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    await db.feed_posts.update_one({"_id": ObjectId(post_id)}, {"$set": {"is_hidden": True}})
    return {"message": "Post deleted"}
