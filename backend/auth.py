import uuid
import bcrypt
import jwt
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional
from fastapi import HTTPException, Header
from functools import wraps

from config import db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS, ADMIN_JWT_EXPIRATION_HOURS
from models.enums import AdminRole, ROLE_PERMISSIONS

logger = logging.getLogger(__name__)


def generate_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_jwt_token(user_id: str, role: str = "customer", is_admin: bool = False) -> str:
    expiration = ADMIN_JWT_EXPIRATION_HOURS if is_admin else JWT_EXPIRATION_HOURS
    payload = {
        "user_id": user_id,
        "role": role,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(hours=expiration),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt_token(token: str) -> Dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing")
    token = authorization.split(" ")[1]
    payload = decode_jwt_token(token)
    user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split(" ")[1]
        payload = decode_jwt_token(token)
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        return user
    except:
        return None


async def get_admin_user(authorization: Optional[str] = Header(None)) -> Dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing")
    token = authorization.split(" ")[1]
    payload = decode_jwt_token(token)

    if not payload.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    admin = await db.admin_users.find_one({"admin_id": payload["user_id"], "is_active": True}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Admin user not found or inactive")

    # Dynamic permissions: check for custom overrides first, then fallback to role defaults
    custom = await db.admin_permissions.find_one({"admin_id": admin["admin_id"]}, {"_id": 0})
    if custom and custom.get("permissions"):
        admin["permissions"] = custom["permissions"]
    else:
        admin["permissions"] = ROLE_PERMISSIONS.get(AdminRole(admin["role"]), {})
    return admin


def check_permission(admin: Dict, resource: str, action: str) -> bool:
    permissions = admin.get("permissions", {})
    resource_permissions = permissions.get(resource, [])
    return action in resource_permissions


def generate_referral_code(name: str) -> str:
    base = name.upper().replace(" ", "")[:4]
    return f"{base}{uuid.uuid4().hex[:6].upper()}"


def generate_referral_link(referral_code: str, product_id: Optional[str] = None) -> str:
    base_url = os.environ.get('FRONTEND_URL')
    if product_id:
        return f"{base_url}/product/{product_id}?ref={referral_code}"
    return f"{base_url}?ref={referral_code}"


async def get_current_vendor(authorization: Optional[str] = Header(None)) -> Dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing")
    token = authorization.split(" ")[1]
    payload = decode_jwt_token(token)

    if payload.get("role") != "vendor":
        raise HTTPException(status_code=403, detail="Vendor access required")

    vendor = await db.vendors.find_one({"vendor_id": payload["user_id"]}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=401, detail="Vendor not found")

    if vendor.get("status") in ("suspended", "disconnected", "discontinued"):
        raise HTTPException(status_code=403, detail=f"Your vendor account has been {vendor['status']}. Contact support.")

    return vendor


async def get_current_reseller(authorization: Optional[str] = Header(None)) -> Dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing")
    token = authorization.split(" ")[1]
    payload = decode_jwt_token(token)

    user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    reseller = await db.resellers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not reseller:
        raise HTTPException(status_code=404, detail="Not registered as reseller")

    if reseller.get("status") in ("suspended", "disconnected", "discontinued"):
        raise HTTPException(status_code=403, detail=f"Your reseller account has been {reseller['status']}. Contact support.")

    return reseller
