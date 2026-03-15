from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Dict, Optional
from datetime import datetime, timezone, timedelta
import uuid
import httpx
import logging

from config import db
from models.schemas import UserCreate, UserLogin, UserResponse, OTPRequest, OTPVerify
from auth import generate_id, hash_password, verify_password, create_jwt_token, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


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

    token = create_jwt_token(user["user_id"], user["role"])
    return {
        "token": token,
        "user": UserResponse(**{k: v for k, v in user.items() if k != "password"}).model_dump()
    }


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
