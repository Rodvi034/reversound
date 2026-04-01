import os
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from bson import ObjectId

from database import get_db
from utils import doc_to_dict

auth_router = APIRouter(prefix="/auth", tags=["auth"])

JWT_ALGORITHM = "HS256"

def _secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)

def _set_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie("access_token", access_token, httponly=True,
                        secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True,
                        secure=False, samesite="lax", max_age=604800, path="/")

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        db = get_db()
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.get("is_banned"):
            raise HTTPException(status_code=403, detail="Account suspended")
        result = doc_to_dict(user)
        result.pop("password_hash", None)
        return result
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def seed_admin(db):
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@reversound.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "ReverSound Admin",
            "username": "admin",
            "role": "admin",
            "is_verified": True,
            "is_banned": False,
            "email_verified": True,   # Admin is always verified
            "wallet_balance": 0.0,
            "escrow_balance": 0.0,
            "genres": [],
            "bio": "Platform administrator",
            "avatar_url": "",
            "subscription_tier": "enterprise",
            "onboarding_complete": True,
            "created_at": datetime.now(timezone.utc)
        })
    else:
        updates = {}
        if not verify_password(admin_password, existing.get("password_hash", "")):
            updates["password_hash"] = hash_password(admin_password)
        if not existing.get("email_verified"):
            updates["email_verified"] = True
        if updates:
            await db.users.update_one({"email": admin_email}, {"$set": updates})

# ── Pydantic Models ─────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    username: str
    role: str = "buyer"

class LoginRequest(BaseModel):
    email: str
    password: str

class OnboardingRequest(BaseModel):
    goal: str
    subscription_tier: str = "free"

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    genres: Optional[list] = None
    avatar_url: Optional[str] = None

# ── Endpoints ───────────────────────────────────────────────────────────────────
VALID_ROLES = {"producer", "artist", "engineer", "designer", "buyer"}

def _generate_verification_token() -> str:
    import secrets
    return secrets.token_urlsafe(48)

def _get_frontend_url() -> str:
    origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    return os.environ.get("FRONTEND_URL", origins[0].strip())

@auth_router.post("/register")
async def register(body: RegisterRequest, response: Response):
    db = get_db()
    body.email = body.email.lower().strip()

    if await db.users.find_one({"email": body.email}):
        raise HTTPException(400, "Email already registered")
    if await db.users.find_one({"username": body.username.lower()}):
        raise HTTPException(400, "Username already taken")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    user_doc = {
        "email": body.email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "username": body.username.lower(),
        "role": body.role if body.role in VALID_ROLES else "buyer",
        "is_verified": False,
        "is_banned": False,
        "email_verified": False,
        "wallet_balance": 100.0,
        "escrow_balance": 0.0,
        "genres": [],
        "bio": "",
        "avatar_url": "",
        "subscription_tier": "free",
        "onboarding_complete": False,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    user = doc_to_dict(user_doc)

    # Generate verification token + send email
    token_str = _generate_verification_token()
    await db.email_verifications.insert_one({
        "user_id": user["id"],
        "token": token_str,
        "email": body.email,
        "expires_at": datetime.now(timezone.utc).replace(hour=(datetime.now(timezone.utc).hour + 24) % 24),
        "created_at": datetime.now(timezone.utc)
    })
    verify_url = f"{_get_frontend_url()}/verify-email?token={token_str}"
    try:
        import email_service as es
        await es.send_verification(body.email, body.name, verify_url, db)
    except Exception as e:
        pass  # Non-blocking: user can resend

    user.pop("password_hash", None)
    access_token = create_access_token(user["id"], user["email"], user["role"])
    refresh_token = create_refresh_token(user["id"])
    _set_cookies(response, access_token, refresh_token)
    return {"user": user, "access_token": access_token, "token_type": "bearer", "requires_verification": True}

@auth_router.post("/login")
async def login(body: LoginRequest, response: Response):
    db = get_db()
    body.email = body.email.lower().strip()
    user = await db.users.find_one({"email": body.email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid email or password")
    if user.get("is_banned"):
        raise HTTPException(403, "Account suspended. Contact support.")

    # Email verification check (skip for legacy users who have no field)
    if user.get("email_verified") == False:
        raise HTTPException(403, "EMAIL_NOT_VERIFIED")

    user_dict = doc_to_dict(user)
    access_token = create_access_token(user_dict["id"], user_dict["email"], user_dict["role"])
    refresh_token = create_refresh_token(user_dict["id"])
    _set_cookies(response, access_token, refresh_token)
    user_dict.pop("password_hash", None)
    return {"user": user_dict, "access_token": access_token, "token_type": "bearer"}

@auth_router.get("/verify-email")
async def verify_email(token: str):
    db = get_db()
    record = await db.email_verifications.find_one({"token": token})
    if not record:
        raise HTTPException(400, "Invalid or expired verification token")
    from bson import ObjectId
    await db.users.update_one(
        {"_id": ObjectId(record["user_id"])},
        {"$set": {"email_verified": True}}
    )
    await db.email_verifications.delete_one({"token": token})
    # Send welcome email
    user = await db.users.find_one({"_id": ObjectId(record["user_id"])})
    if user:
        try:
            import email_service as es
            await es.send_welcome(user["email"], user["name"], user["role"], db)
        except Exception: pass
    return {"message": "E-posta dogrulandi! Artik giris yapabilirsiniz.", "verified": True}

@auth_router.post("/resend-verification")
async def resend_verification(request: Request):
    data = await request.json()
    email = data.get("email", "").lower().strip()
    if not email:
        raise HTTPException(400, "Email required")
    db = get_db()
    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "If this email exists, a verification link has been sent."}
    if user.get("email_verified"):
        raise HTTPException(400, "Email already verified")
    token_str = _generate_verification_token()
    await db.email_verifications.delete_many({"user_id": str(user["_id"])})
    await db.email_verifications.insert_one({
        "user_id": str(user["_id"]),
        "token": token_str,
        "email": email,
        "created_at": datetime.now(timezone.utc)
    })
    verify_url = f"{_get_frontend_url()}/verify-email?token={token_str}"
    try:
        import email_service as es
        await es.send_verification(email, user.get("name", ""), verify_url, db)
    except Exception: pass
    return {"message": "Dogrulama e-postasi yeniden gonderildi."}

@auth_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}

@auth_router.get("/me")
async def me(request: Request):
    return await get_current_user(request)

@auth_router.post("/onboarding")
async def complete_onboarding(body: OnboardingRequest, request: Request):
    user = await get_current_user(request)
    db = get_db()
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {
            "onboarding_goal": body.goal,
            "subscription_tier": body.subscription_tier,
            "onboarding_complete": True
        }}
    )
    return {"message": "Onboarding complete", "goal": body.goal}

@auth_router.get("/commission-tier")
async def my_commission_tier(request: Request):
    """Get current seller's commission tier and progress."""
    user = await get_current_user(request)
    from commission_service import get_tier_progress
    db = get_db()
    user_doc = await db.users.find_one({"_id": ObjectId(user["id"])}, {"lifetime_gig_sales": 1})
    lifetime_sales = user_doc.get("lifetime_gig_sales", 0) if user_doc else 0
    return get_tier_progress(lifetime_sales)

@auth_router.patch("/profile")
async def update_profile(body: ProfileUpdateRequest, request: Request):
    user = await get_current_user(request)
    db = get_db()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": updates})
    updated = await db.users.find_one({"_id": ObjectId(user["id"])})
    result = doc_to_dict(updated)
    result.pop("password_hash", None)
    return result
