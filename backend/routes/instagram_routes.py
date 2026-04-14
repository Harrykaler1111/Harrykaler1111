"""
Instagram OAuth & Automation Routes
====================================
Clean implementation using Instagram Business Login (Authorization Code Flow)

Flow:
1. GET  /instagram/auth/login     → generates OAuth URL, redirects user to Instagram
2. GET  /instagram/auth/callback  → handles redirect, exchanges code for token, stores it
3. GET  /instagram/auth/status    → check connection status
4. POST /instagram/auth/disconnect → disconnect account

Endpoint: https://api.instagram.com/oauth/authorize
Scopes:   instagram_business_basic, instagram_business_manage_messages, instagram_business_manage_comments
"""

from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import PlainTextResponse, RedirectResponse
from datetime import datetime, timezone, timedelta
from typing import Dict
import urllib.parse
import hmac
import hashlib
import json
import logging
import os
import httpx

from config import db
from auth import get_current_user, get_admin_user, generate_id

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Instagram"])

# ─── Environment Variables ───
META_APP_ID = os.environ.get("META_APP_ID", "")
META_APP_SECRET = os.environ.get("META_APP_SECRET", "")
REDIRECT_URI = os.environ.get("FRONTEND_URL", "https://thepigma.com") + "/api/instagram/auth/callback"
WEBHOOK_VERIFY_TOKEN = os.environ.get("INSTAGRAM_WEBHOOK_VERIFY_TOKEN", "")
BRAND_ACCESS_TOKEN = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "")
BRAND_ACCOUNT_ID = os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID", "")

SCOPES = "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments"


# ══════════════════════════════════════════════
#  1. OAUTH — LOGIN (Generate URL & Redirect)
# ══════════════════════════════════════════════

@router.get("/instagram/auth/login")
async def instagram_login(user: Dict = Depends(get_current_user)):
    """Generate Instagram OAuth URL and return it. Frontend redirects user."""

    # Create a secure state token tied to this user
    state = generate_id("igauth_")
    await db.instagram_oauth_states.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "state": state,
            "user_id": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        }},
        upsert=True
    )

    # Build OAuth URL using urllib.parse for proper encoding
    params = {
        "client_id": META_APP_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "response_type": "code",
        "state": state,
    }
    oauth_url = f"https://api.instagram.com/oauth/authorize?{urllib.parse.urlencode(params)}"

    logger.info(f"Instagram OAuth URL generated for user {user['user_id']}")
    logger.info(f"  client_id: {META_APP_ID}")
    logger.info(f"  redirect_uri: {REDIRECT_URI}")
    logger.info(f"  scopes: {SCOPES}")
    logger.info(f"  full_url: {oauth_url}")

    return {"oauth_url": oauth_url, "state": state}


# ══════════════════════════════════════════════
#  2. OAUTH — CALLBACK (Exchange Code for Token)
# ══════════════════════════════════════════════

@router.get("/instagram/auth/callback")
async def instagram_callback(code: str = Query(...), state: str = Query(None)):
    """
    Instagram redirects here with ?code=XXX&state=XXX
    Exchange code for short-lived token → long-lived token → get profile → store.
    """
    frontend_url = os.environ.get("FRONTEND_URL", "https://thepigma.com")

    # Validate state
    oauth_state = None
    user_id = None
    if state:
        oauth_state = await db.instagram_oauth_states.find_one({"state": state}, {"_id": 0})
        if oauth_state:
            user_id = oauth_state.get("user_id")

    if not oauth_state:
        logger.warning(f"Invalid OAuth state: {state}")
        return RedirectResponse(url=f"{frontend_url}/influencer?tab=instagram&error=invalid_state")

    async with httpx.AsyncClient(timeout=30.0) as client:

        # ── Step 1: Exchange code for short-lived access token (1 hour) ──
        logger.info(f"Exchanging code for token. redirect_uri={REDIRECT_URI}")
        token_resp = await client.post(
            "https://api.instagram.com/oauth/access_token",
            data={
                "client_id": META_APP_ID,
                "client_secret": META_APP_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": REDIRECT_URI,
                "code": code,
            }
        )

        if token_resp.status_code != 200:
            logger.error(f"Token exchange failed ({token_resp.status_code}): {token_resp.text}")
            return RedirectResponse(url=f"{frontend_url}/influencer?tab=instagram&error=token_failed")

        token_data = token_resp.json()
        short_token = token_data.get("access_token")
        ig_user_id = str(token_data.get("user_id", ""))

        logger.info(f"Short-lived token received for IG user: {ig_user_id}")

        # ── Step 2: Exchange for long-lived token (60 days) ──
        long_token = short_token
        expires_in = 3600

        long_resp = await client.get(
            "https://graph.instagram.com/access_token",
            params={
                "grant_type": "ig_exchange_token",
                "client_secret": META_APP_SECRET,
                "access_token": short_token,
            }
        )

        if long_resp.status_code == 200:
            long_data = long_resp.json()
            long_token = long_data.get("access_token", short_token)
            expires_in = long_data.get("expires_in", 5184000)
            logger.info(f"Long-lived token received. Expires in {expires_in}s")
        else:
            logger.warning(f"Long-lived token exchange failed: {long_resp.text}. Using short-lived token.")

        # ── Step 3: Get Instagram profile ──
        username = ""
        name = ""

        profile_resp = await client.get(
            "https://graph.instagram.com/v18.0/me",
            params={
                "fields": "user_id,username,name,profile_picture_url",
                "access_token": long_token,
            }
        )

        if profile_resp.status_code == 200:
            profile = profile_resp.json()
            username = profile.get("username", "")
            name = profile.get("name", "")
            ig_user_id = str(profile.get("user_id", ig_user_id))
            logger.info(f"Instagram profile: @{username} ({name}), ID: {ig_user_id}")
        else:
            logger.warning(f"Profile fetch failed: {profile_resp.text}")

    # ── Step 4: Store token in database ──
    token_expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()

    # Save to instagram_connections (general)
    await db.instagram_connections.update_one(
        {"ig_user_id": ig_user_id},
        {"$set": {
            "ig_user_id": ig_user_id,
            "username": username,
            "name": name,
            "access_token": long_token,
            "token_expires_at": token_expires_at,
            "connected_by_user_id": user_id,
            "is_active": True,
            "connected_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )

    # If user is an influencer, update their record too
    influencer = await db.influencers.find_one({"user_id": user_id}, {"_id": 0})
    if influencer:
        await db.influencers.update_one(
            {"influencer_id": influencer["influencer_id"]},
            {"$set": {
                "instagram_connected": True,
                "instagram_user_id": ig_user_id,
                "instagram_username": username,
                "instagram_access_token": long_token,
                "instagram_token_expires": token_expires_at,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )

    # Clean up OAuth state
    await db.instagram_oauth_states.delete_one({"state": state})

    logger.info(f"Instagram connected successfully: @{username} (ID: {ig_user_id}) for user {user_id}")

    # Redirect back to frontend
    return RedirectResponse(url=f"{frontend_url}/influencer?tab=instagram&connected=true")


# ══════════════════════════════════════════════
#  3. STATUS — Check Connection
# ══════════════════════════════════════════════

@router.get("/instagram/auth/status")
async def instagram_connection_status(user: Dict = Depends(get_current_user)):
    """Check if user has a connected Instagram account"""
    conn = await db.instagram_connections.find_one(
        {"connected_by_user_id": user["user_id"], "is_active": True}, {"_id": 0}
    )
    if conn:
        return {
            "connected": True,
            "username": conn.get("username"),
            "ig_user_id": conn.get("ig_user_id"),
            "connected_at": conn.get("connected_at"),
        }

    # Check influencer record
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if influencer and influencer.get("instagram_connected"):
        return {
            "connected": True,
            "username": influencer.get("instagram_username"),
            "ig_user_id": influencer.get("instagram_user_id"),
        }

    return {"connected": False}


# ══════════════════════════════════════════════
#  4. DISCONNECT
# ══════════════════════════════════════════════

@router.post("/instagram/auth/disconnect")
async def instagram_disconnect(user: Dict = Depends(get_current_user)):
    """Disconnect Instagram account"""
    await db.instagram_connections.update_many(
        {"connected_by_user_id": user["user_id"]},
        {"$set": {"is_active": False}}
    )

    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if influencer:
        await db.influencers.update_one(
            {"influencer_id": influencer["influencer_id"]},
            {"$set": {
                "instagram_connected": False,
                "instagram_user_id": None,
                "instagram_username": None,
                "instagram_access_token": None,
                "automation_enabled": False,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )

    return {"message": "Instagram disconnected"}


# ══════════════════════════════════════════════
#  5. WEBHOOK — Verification (GET)
# ══════════════════════════════════════════════

@router.get("/webhooks/instagram")
async def verify_webhook(request: Request):
    """Meta sends GET to verify webhook ownership"""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == WEBHOOK_VERIFY_TOKEN:
        logger.info("Instagram webhook verification successful")
        return PlainTextResponse(content=challenge, status_code=200)

    logger.warning(f"Webhook verification failed: mode={mode}")
    return PlainTextResponse(content="Forbidden", status_code=403)


# ══════════════════════════════════════════════
#  6. WEBHOOK — Event Handler (POST)
# ══════════════════════════════════════════════

@router.post("/webhooks/instagram")
async def handle_webhook(request: Request):
    """Receive real-time events from Instagram (messages, comments)"""
    body = await request.body()

    # Verify signature
    signature = request.headers.get("X-Hub-Signature-256", "")
    if META_APP_SECRET and signature:
        expected = "sha256=" + hmac.new(
            META_APP_SECRET.encode(), body, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            logger.warning("Invalid webhook signature")
            raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    if payload.get("object") != "instagram":
        return {"status": "ignored"}

    # Process entries
    for entry in payload.get("entry", []):
        ig_account_id = str(entry.get("id", ""))

        # Handle comments
        for change in entry.get("changes", []):
            if change.get("field") == "comments":
                value = change.get("value", {})
                media_id = str(value.get("media", {}).get("id", ""))
                commenter_id = str(value.get("from", {}).get("id", ""))
                commenter_username = value.get("from", {}).get("username", "")
                comment_text = value.get("text", "")

                if commenter_id and commenter_id != ig_account_id:
                    logger.info(f"Comment from @{commenter_username} on media {media_id}: {comment_text}")
                    await _handle_comment_auto_dm(ig_account_id, media_id, commenter_id, commenter_username)

        # Handle messages
        for messaging in entry.get("messaging", []):
            sender_id = messaging.get("sender", {}).get("id")
            if "message" in messaging:
                msg_text = messaging["message"].get("text", "")
                logger.info(f"Message from {sender_id}: {msg_text}")
                await _handle_message_auto_reply(sender_id, msg_text)

    # Log webhook
    await db.instagram_webhooks.insert_one({
        "payload": payload,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"status": "ok"}


# ══════════════════════════════════════════════
#  7. WEBHOOK — Deauthorize & Data Deletion
# ══════════════════════════════════════════════

@router.post("/webhooks/instagram/deauthorize")
async def handle_deauthorize(request: Request):
    """Handle when user removes app access"""
    try:
        payload = await request.json()
        logger.info("Instagram deauthorization received")
        await db.instagram_deauth_logs.insert_one({
            "payload": payload,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"Deauth error: {e}")
    return {"status": "success"}


# ══════════════════════════════════════════════
#  8. SEND DM (Internal function)
# ══════════════════════════════════════════════

async def send_dm(ig_user_id: str, access_token: str, recipient_id: str, message_text: str) -> dict:
    """Send an Instagram DM from a specific account"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"https://graph.instagram.com/v18.0/{ig_user_id}/messages",
            params={"access_token": access_token},
            json={
                "recipient": {"id": recipient_id},
                "message": {"text": message_text}
            }
        )

        if resp.status_code == 200:
            result = resp.json()
            logger.info(f"DM sent to {recipient_id} from {ig_user_id}")
            return {"status": "sent", "message_id": result.get("message_id")}
        else:
            logger.error(f"DM failed: {resp.text}")
            return {"status": "failed", "error": resp.text}


# ══════════════════════════════════════════════
#  9. AUTO-DM LOGIC (Comment → DM)
# ══════════════════════════════════════════════

async def _handle_comment_auto_dm(ig_account_id: str, media_id: str, commenter_id: str, commenter_username: str):
    """When someone comments on an influencer's post, auto-DM them the product link"""

    # Find influencer by IG account ID
    influencer = await db.influencers.find_one(
        {"instagram_user_id": ig_account_id, "instagram_connected": True, "automation_enabled": True},
        {"_id": 0}
    )
    if not influencer:
        return

    # Find matching post
    post = await db.instagram_posts.find_one(
        {"influencer_id": influencer["influencer_id"], "auto_dm_enabled": True},
        {"_id": 0}
    )
    if not post:
        return

    # Skip if already DM'd this user
    if commenter_id in post.get("commented_users", []):
        return

    # Send DM
    access_token = influencer.get("instagram_access_token")
    if not access_token:
        return

    result = await send_dm(ig_account_id, access_token, commenter_id, post["dm_message"])

    # Log
    await db.instagram_dms.insert_one({
        "dm_id": generate_id("dm_"),
        "influencer_id": influencer["influencer_id"],
        "post_record_id": post.get("post_record_id"),
        "recipient_id": commenter_id,
        "recipient_username": commenter_username,
        "message": post["dm_message"],
        "status": result.get("status", "failed"),
        "ig_message_id": result.get("message_id"),
        "error": result.get("error"),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Update post counters
    await db.instagram_posts.update_one(
        {"post_record_id": post["post_record_id"]},
        {
            "$inc": {"total_comments": 1, "total_dms_sent": 1 if result["status"] == "sent" else 0},
            "$push": {"commented_users": commenter_id}
        }
    )


# ══════════════════════════════════════════════
#  10. AUTO-REPLY LOGIC (Message → Reply)
# ══════════════════════════════════════════════

async def _handle_message_auto_reply(sender_id: str, message_text: str):
    """Auto-reply to incoming DMs if enabled"""
    config = await db.instagram_dm_config.find_one({"config_id": "auto_dm"}, {"_id": 0})
    if not config or not config.get("enabled"):
        return

    # Don't reply twice in a day
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    recent = await db.instagram_messages.find_one({
        "recipient_id": sender_id, "direction": "outgoing",
        "created_at": {"$gte": today}
    })
    if recent:
        return

    reply = config.get("welcome_message", "Thanks for reaching out! We'll get back to you soon.")

    # Use brand token
    if BRAND_ACCESS_TOKEN and BRAND_ACCOUNT_ID:
        await send_dm(BRAND_ACCOUNT_ID, BRAND_ACCESS_TOKEN, sender_id, reply)


# ══════════════════════════════════════════════
#  11. ADMIN ENDPOINTS
# ══════════════════════════════════════════════

@router.get("/admin/instagram/status")
async def admin_instagram_status(admin: Dict = Depends(get_admin_user)):
    """Admin: check all Instagram connections"""
    connections = await db.instagram_connections.find(
        {"is_active": True}, {"_id": 0, "access_token": 0}
    ).to_list(50)

    brand_connected = bool(BRAND_ACCESS_TOKEN and BRAND_ACCOUNT_ID)

    return {
        "brand_connected": brand_connected,
        "brand_account_id": BRAND_ACCOUNT_ID if brand_connected else None,
        "connections": connections,
        "total": len(connections)
    }


@router.get("/admin/instagram/dm-config")
async def get_dm_config():
    """Get auto-DM configuration"""
    config = await db.instagram_dm_config.find_one({"config_id": "auto_dm"}, {"_id": 0})
    if not config:
        return {"enabled": False, "welcome_message": "Thanks for reaching out! We'll get back to you soon."}
    return {k: v for k, v in config.items() if k != "config_id"}


@router.put("/admin/instagram/dm-config")
async def update_dm_config(request: Request, admin: Dict = Depends(get_admin_user)):
    """Update auto-DM configuration"""
    data = await request.json()
    await db.instagram_dm_config.update_one(
        {"config_id": "auto_dm"},
        {"$set": {**data, "config_id": "auto_dm", "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Auto-DM config updated"}
