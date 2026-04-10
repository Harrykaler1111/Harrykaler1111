from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Dict, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid
import re
import httpx
import logging

from config import db
from models.schemas import UserCreate, UserLogin, UserResponse, OTPRequest, OTPVerify
from auth import generate_id, hash_password, verify_password, create_jwt_token, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

# ============== VALIDATION HELPERS ==============

DISPOSABLE_EMAIL_DOMAINS = {
    "mailinator.com", "tempmail.com", "guerrillamail.com", "throwaway.email",
    "yopmail.com", "10minutemail.com", "trashmail.com", "fakeinbox.com",
    "sharklasers.com", "guerrillamailblock.com", "grr.la", "dispostable.com",
    "getnada.com", "temp-mail.org", "mohmal.com", "emailondeck.com",
    "maildrop.cc", "harakirimail.com", "mailsac.com", "tempinbox.com",
    "burpcollaborator.net", "jetable.org", "trash-mail.com", "mailnesia.com",
    "guerrillamail.info", "guerrillamail.net", "guerrillamail.de", "spam4.me",
    "byom.de", "trashmail.me", "droptexts.com", "spamgourmet.com",
}


def validate_email_address(email: str) -> str:
    """Validate email format and block disposable domains. Returns cleaned email."""
    email = email.strip().lower()
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    domain = email.split("@")[1]
    if domain in DISPOSABLE_EMAIL_DOMAINS:
        raise HTTPException(status_code=400, detail="Disposable/temporary email addresses are not allowed. Please use a real email.")
    return email


def validate_phone_number(phone: str) -> str:
    """Validate Indian mobile number. Returns cleaned phone with +91 prefix."""
    phone = phone.strip().replace(" ", "").replace("-", "")
    # Remove leading + if present
    if phone.startswith("+"):
        phone = phone[1:]
    # Remove leading 91 if present
    if phone.startswith("91") and len(phone) == 12:
        phone = phone[2:]
    # Now should be 10 digits starting with 6-9
    if not re.match(r'^[6-9]\d{9}$', phone):
        raise HTTPException(status_code=400, detail="Invalid phone number. Must be a valid Indian mobile number (10 digits starting with 6-9)")
    return f"+91{phone}"


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
    # Validate email format and block disposable domains
    clean_email = validate_email_address(user.email)

    # Validate phone number format
    clean_phone = validate_phone_number(user.phone) if user.phone else None
    if not clean_phone:
        raise HTTPException(status_code=400, detail="Phone number is required for registration")

    # Check phone OTP was verified (must have a recent verification record)
    phone_verified = await db.otp_verified_phones.find_one({"phone": clean_phone}, {"_id": 0})
    if not phone_verified:
        raise HTTPException(status_code=400, detail="Phone number must be verified via OTP before registration. Please verify your WhatsApp number first.")

    # Check if verified recently (within 30 minutes)
    verified_at = datetime.fromisoformat(phone_verified.get("verified_at", "2000-01-01T00:00:00+00:00"))
    if verified_at.tzinfo is None:
        verified_at = verified_at.replace(tzinfo=timezone.utc)
    if (datetime.now(timezone.utc) - verified_at).total_seconds() > 1800:
        raise HTTPException(status_code=400, detail="Phone verification expired. Please verify your number again.")

    existing = await db.users.find_one({"email": clean_email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_phone = await db.users.find_one({"phone": clean_phone})
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user_id = generate_id("user_")
    user_doc = {
        "user_id": user_id,
        "email": clean_email,
        "name": user.name.strip(),
        "phone": clean_phone,
        "password": hash_password(user.password),
        "role": "customer",
        "avatar": None,
        "phone_verified": True,
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

    # Clean up verification record
    await db.otp_verified_phones.delete_one({"phone": clean_phone})

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
    clean_phone = validate_phone_number(request.phone)

    # Rate limiting: prevent rapid resend (30s cooldown)
    recent = await db.otp_verifications.find_one({"phone": clean_phone}, {"_id": 0})
    if recent and recent.get("created_at"):
        created = datetime.fromisoformat(recent["created_at"])
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - created).total_seconds()
        if elapsed < 30:
            raise HTTPException(status_code=429, detail=f"Please wait {int(30 - elapsed)} seconds before requesting a new OTP")

    otp = str(uuid.uuid4().int)[:6]
    await db.otp_verifications.update_one(
        {"phone": clean_phone},
        {"$set": {
            "phone": clean_phone,
            "otp": otp,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        }},
        upsert=True
    )

    # Send OTP via Interakt WhatsApp API
    otp_sent_via_whatsapp = False
    try:
        from services.interakt_service import send_otp_via_whatsapp, validate_indian_phone
        if validate_indian_phone(clean_phone):
            phone_digits = clean_phone.replace("+91", "")
            result = send_otp_via_whatsapp(phone=phone_digits, otp_code=otp)
            otp_sent_via_whatsapp = result.get("success", False)
            if otp_sent_via_whatsapp:
                logger.info(f"OTP delivered to {clean_phone} via {result.get('method')}")
            else:
                logger.error(f"OTP delivery failed for {clean_phone}: {result}")
    except Exception as e:
        logger.error(f"Failed to send OTP via Interakt: {e}")

    logger.info(f"OTP generated for {clean_phone}: {otp} | WhatsApp delivered: {otp_sent_via_whatsapp}")

    response = {"message": "OTP sent successfully"}
    if not otp_sent_via_whatsapp:
        response["warning"] = "WhatsApp delivery pending. Please check your messages."
    return response


@router.post("/otp/verify", response_model=Dict)
async def verify_otp(request: OTPVerify):
    clean_phone = validate_phone_number(request.phone)
    verification = await db.otp_verifications.find_one({"phone": clean_phone}, {"_id": 0})
    if not verification or verification["otp"] != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    expires_at = datetime.fromisoformat(verification["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")

    # Mark phone as verified (for registration flow)
    await db.otp_verified_phones.update_one(
        {"phone": clean_phone},
        {"$set": {"phone": clean_phone, "verified_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    user = await db.users.find_one({"phone": clean_phone}, {"_id": 0})
    if not user:
        # Phone verified but no account yet — return verification token for signup
        await db.otp_verifications.delete_one({"phone": clean_phone})
        return {
            "phone_verified": True,
            "needs_registration": True,
            "phone": clean_phone,
            "message": "Phone verified. Please complete registration."
        }

    await db.otp_verifications.delete_one({"phone": clean_phone})

    token = create_jwt_token(user["user_id"], user["role"])
    return {
        "token": token,
        "user": UserResponse(**{k: v for k, v in user.items() if k != "password"}).model_dump()
    }


# ============== FIREBASE PHONE AUTH ==============

class FirebaseVerifyRequest(BaseModel):
    id_token: str

@router.post("/firebase/verify", response_model=Dict)
async def firebase_phone_verify(request: FirebaseVerifyRequest):
    """Verify Firebase ID token after phone OTP verification.
    Creates user if new, or logs in existing user."""
    from services.firebase_service import verify_firebase_token

    result = verify_firebase_token(request.id_token)
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result.get("error", "Firebase verification failed"))

    phone = result.get("phone_number")
    firebase_uid = result.get("uid")
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number in Firebase token")

    # Normalize phone to +91 format
    clean_phone = phone if phone.startswith("+") else f"+91{phone}"

    # Rate limiting: max 10 verifications per number in 10 mins
    rate_record = await db.firebase_rate_limits.find_one({"phone": clean_phone}, {"_id": 0})
    now = datetime.now(timezone.utc)
    if rate_record:
        window_start = datetime.fromisoformat(rate_record["window_start"])
        if window_start.tzinfo is None:
            window_start = window_start.replace(tzinfo=timezone.utc)
        if (now - window_start).total_seconds() < 600:
            if rate_record.get("count", 0) >= 10:
                raise HTTPException(status_code=429, detail="Too many verification attempts. Try again later.")
            await db.firebase_rate_limits.update_one(
                {"phone": clean_phone}, {"$inc": {"count": 1}}
            )
        else:
            await db.firebase_rate_limits.update_one(
                {"phone": clean_phone},
                {"$set": {"count": 1, "window_start": now.isoformat()}}
            )
    else:
        await db.firebase_rate_limits.insert_one({
            "phone": clean_phone, "count": 1, "window_start": now.isoformat()
        })

    # Mark phone as verified for registration flow
    await db.otp_verified_phones.update_one(
        {"phone": clean_phone},
        {"$set": {"phone": clean_phone, "verified_at": now.isoformat(), "method": "firebase"}},
        upsert=True
    )

    # Find or create user
    user = await db.users.find_one({"phone": clean_phone}, {"_id": 0})

    if not user:
        # Auto-create user from Firebase phone auth
        user_id = generate_id("user")
        new_user = {
            "user_id": user_id,
            "name": f"User {clean_phone[-4:]}",
            "email": "",
            "phone": clean_phone,
            "password": "",
            "role": "user",
            "is_active": True,
            "firebase_uid": firebase_uid,
            "auth_method": "firebase_phone",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        await db.users.insert_one(new_user)
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})

        # Emit user_registered event for future WhatsApp integration
        await db.user_events.insert_one({
            "event_id": generate_id("evt"),
            "event_type": "user_registered",
            "user_id": user_id,
            "phone": clean_phone,
            "method": "firebase_phone",
            "created_at": now.isoformat(),
        })
    else:
        # Update Firebase UID if not set
        if not user.get("firebase_uid"):
            await db.users.update_one(
                {"phone": clean_phone},
                {"$set": {"firebase_uid": firebase_uid, "updated_at": now.isoformat()}}
            )

    token = create_jwt_token(user["user_id"], user["role"])
    return {
        "token": token,
        "user": UserResponse(**{k: v for k, v in user.items() if k != "password"}).model_dump(),
        "is_new_user": user.get("auth_method") == "firebase_phone" and not user.get("email"),
    }
