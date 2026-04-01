from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import require_admin

rbac_router = APIRouter(prefix="/admin/rbac", tags=["admin_rbac"])

VALID_STAFF_ROLES = {
    None: "Normal Kullanıcı",
    "support": "Destek Uzmanı",
    "content_mod": "İçerik Moderatör",
    "super_admin": "Süper Admin",
}

ROLE_PERMISSIONS = {
    "support": ["view_tickets", "reply_tickets"],
    "content_mod": ["view_beats", "approve_beats", "view_gigs", "approve_gigs"],
    "super_admin": ["*"],  # full access
}

class StaffRoleUpdate(BaseModel):
    user_id: str
    staff_role: Optional[str] = None  # null = remove role

@rbac_router.get("/staff")
async def list_staff(request: Request):
    """Get all users with staff roles assigned."""
    await require_admin(request)
    db = get_db()
    cursor = db.users.find(
        {"staff_role": {"$exists": True, "$ne": None}},
        {"password_hash": 0}
    ).sort("created_at", -1)
    users = docs_to_list(await cursor.to_list(100))
    return users

@rbac_router.get("/users")
async def list_all_users_for_rbac(request: Request, page: int = 1, limit: int = 30, search: str = None):
    """Get all users for RBAC management."""
    await require_admin(request)
    db = get_db()
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"username": {"$regex": search, "$options": "i"}},
        ]
    skip = (page - 1) * limit
    total = await db.users.count_documents(query)
    cursor = db.users.find(query, {"password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit)
    users = docs_to_list(await cursor.to_list(limit))
    return {"users": users, "total": total}

@rbac_router.patch("/assign")
async def assign_staff_role(body: StaffRoleUpdate, request: Request):
    """Assign or remove a staff role from a user."""
    await require_admin(request)

    if body.staff_role not in VALID_STAFF_ROLES:
        raise HTTPException(400, f"Invalid role. Valid: {list(VALID_STAFF_ROLES.keys())}")

    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(body.user_id)})
    if not user:
        raise HTTPException(404, "User not found")
    if user.get("role") == "admin":
        raise HTTPException(400, "Cannot modify role of main admin users")

    if body.staff_role is None:
        await db.users.update_one({"_id": ObjectId(body.user_id)}, {"$unset": {"staff_role": ""}})
    else:
        await db.users.update_one(
            {"_id": ObjectId(body.user_id)},
            {"$set": {
                "staff_role": body.staff_role,
                "staff_role_assigned_at": datetime.now(timezone.utc)
            }}
        )

    # Log the change
    await db.rbac_audit_log.insert_one({
        "action": "role_assigned",
        "target_user_id": body.user_id,
        "target_user_email": user.get("email"),
        "new_role": body.staff_role,
        "previous_role": user.get("staff_role"),
        "created_at": datetime.now(timezone.utc)
    })

    updated = await db.users.find_one({"_id": ObjectId(body.user_id)}, {"password_hash": 0})
    return doc_to_dict(updated)

@rbac_router.get("/audit-log")
async def get_audit_log(request: Request):
    """Get RBAC audit log."""
    await require_admin(request)
    db = get_db()
    cursor = db.rbac_audit_log.find({}).sort("created_at", -1).limit(50)
    return docs_to_list(await cursor.to_list(50))

@rbac_router.get("/permissions")
async def get_permissions():
    """Get role → permissions mapping."""
    return ROLE_PERMISSIONS
