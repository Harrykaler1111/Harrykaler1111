from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Dict, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid
import httpx
import logging

from config import db
from models.schemas import UserCreate, UserLogin, UserResponse, OTPRequest, OTPVerify
from auth import generate_id, hash_password, verify_password, create_jwt_token, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


async def log_action(user_id: str, user_type: str, action: str, details: str = ""):
    await db.action_history.insert_one({
        "action_id": generate_id("act_"),
        "user_id": user_id,
        "user_type": user_type,
        "action": action,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


@router.post("/register", response_model=Dict)
async def register_user(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = generate_id("user_")
    user_doc = {
        "user_id": user_id,
        "email": user.email,
        "name": user.name,
        "phone": user.phone,
        "password": hash_password(user.password),
        "role": "customer",
        "avatar": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)

    await db.carts.insert_one({
        "cart_id": generate_id("cart_"),
        "user_id": user_id,
        "items": [],
        "updated_at": datetime.now(timezone.utc).isoformat()
    })

    token = create_jwt_token(user_id, "customer")
    return {
        "token": token,
        "user": UserResponse(**{k: v for k, v in user_doc.items() if k != "password"}).model_dump()
    }


@router.post("/login", response_model=Dict)
async def login_user(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await log_action(user["user_id"], "user", "login", f"Login from {credentials.email}")
    token = create_jwt_token(user["user_id"], user["role"])
    return {
        "token": token,
        "user": UserResponse(**{k: v for k, v in user.items() if k != "password"}).model_dump()
    }


class ResetPasswordRequest(BaseModel):
    email: str

class ResetPasswordConfirm(BaseModel):
    email: str
    otp: str
    new_password: str

class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/password/reset-request")
async def request_password_reset(data: ResetPasswordRequest):
    """Send OTP for password reset - works for users, vendors, influencers"""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    vendor = await db.vendors.find_one({"email": data.email}, {"_id": 0}) if not user else None

    if not user and not vendor:
        raise HTTPException(status_code=404, detail="No account found with this email")

    otp = str(uuid.uuid4().int)[:6]
    await db.password_resets.update_one(
        {"email": data.email},
        {"$set": {
            "email": data.email,
            "otp": otp,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        }},
        upsert=True
    )
    logger.info(f"Password reset OTP for {data.email}: {otp}")
    return {"message": "Password reset OTP sent", "demo_otp": otp}


@router.post("/password/reset-confirm")
async def confirm_password_reset(data: ResetPasswordConfirm):
    """Confirm password reset with OTP"""
    reset = await db.password_resets.find_one({"email": data.email}, {"_id": 0})
    if not reset or reset["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    expires_at = datetime.fromisoformat(reset["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    hashed = hash_password(data.new_password)

    # Update in users collection
    user_result = await db.users.update_one(
        {"email": data.email}, {"$set": {"password": hashed, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    # Also update in vendors collection
    vendor_result = await db.vendors.update_one(
        {"email": data.email}, {"$set": {"password": hashed, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    await db.password_resets.delete_one({"email": data.email})

    uid = ""
    if user_result.modified_count > 0:
        u = await db.users.find_one({"email": data.email}, {"_id": 0})
        uid = u.get("user_id", "") if u else ""
    elif vendor_result.modified_count > 0:
        v = await db.vendors.find_one({"email": data.email}, {"_id": 0})
        uid = v.get("vendor_id", "") if v else ""

    if uid:
        await log_action(uid, "user", "password_reset", f"Password reset for {data.email}")

    return {"message": "Password reset successfully"}


@router.put("/password/update")
async def update_password(data: UpdatePasswordRequest, user: Dict = Depends(get_current_user)):
    """Update password for logged-in user"""
    if not verify_password(data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    hashed = hash_password(data.new_password)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"password": hashed, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    await log_action(user["user_id"], "user", "password_update", "Password updated")
    return {"message": "Password updated successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(user: Dict = Depends(get_current_user)):
    return UserResponse(**{k: v for k, v in user.items() if k != "password"})


@router.post("/google/callback", response_model=Dict)
async def google_auth_callback(session_id: str):
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")

            data = response.json()
            email = data["email"]
            name = data["name"]
            picture = data.get("picture")

            user = await db.users.find_one({"email": email}, {"_id": 0})
            if user:
                await db.users.update_one(
                    {"email": email},
                    {"$set": {"name": name, "avatar": picture, "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                user = await db.users.find_one({"email": email}, {"_id": 0})
            else:
                user_id = generate_id("user_")
                user = {
                    "user_id": user_id,
                    "email": email,
                    "name": name,
                    "phone": None,
                    "password": None,
                    "role": "customer",
                    "avatar": picture,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.users.insert_one(user)
                await db.carts.insert_one({
                    "cart_id": generate_id("cart_"),
                    "user_id": user_id,
                    "items": [],
                    "updated_at": datetime.now(timezone.utc).isoformat()
                })

            token = create_jwt_token(user["user_id"], user["role"])
            return {
                "token": token,
                "user": UserResponse(**{k: v for k, v in user.items() if k != "password"}).model_dump()
            }
    except httpx.HTTPError as e:
        logger.error(f"Google auth error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")


@router.post("/otp/send")
async def send_otp(request: OTPRequest):
    otp = str(uuid.uuid4().int)[:6]
    await db.otp_verifications.update_one(
        {"phone": request.phone},
        {"$set": {
            "phone": request.phone,
            "otp": otp,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        }},
        upsert=True
    )
    logger.info(f"OTP for {request.phone}: {otp}")
    return {"message": "OTP sent successfully", "demo_otp": otp}


@router.post("/otp/verify", response_model=Dict)
async def verify_otp(request: OTPVerify):
    verification = await db.otp_verifications.find_one({"phone": request.phone}, {"_id": 0})
    if not verification or verification["otp"] != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    expires_at = datetime.fromisoformat(verification["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")

    user = await db.users.find_one({"phone": request.phone}, {"_id": 0})
    if not user:
        user_id = generate_id("user_")
        user = {
            "user_id": user_id,
            "email": f"{request.phone}@phone.pigma.com",
            "name": f"User {request.phone[-4:]}",
            "phone": request.phone,
            "password": None,
            "role": "customer",
            "avatar": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
        await db.carts.insert_one({
            "cart_id": generate_id("cart_"),
            "user_id": user_id,
            "items": [],
            "updated_at": datetime.now(timezone.utc).isoformat()
        })

    await db.otp_verifications.delete_one({"phone": request.phone})

    token = create_jwt_token(user["user_id"], user["role"])
    return {
        "token": token,
        "user": UserResponse(**{k: v for k, v in user.items() if k != "password"}).model_dump()
    }
