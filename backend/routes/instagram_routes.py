from fastapi import APIRouter, Request, HTTPException, Query, Header, Depends
from fastapi.responses import PlainTextResponse
from typing import Dict, Optional
from datetime import datetime, timezone
import hmac
import hashlib
import json
import logging
import os
import httpx

from config import db
from auth import get_admin_user

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Instagram"])

META_APP_ID = os.environ.get("META_APP_ID", "")
META_APP_SECRET = os.environ.get("META_APP_SECRET", "")
INSTAGRAM_WEBHOOK_VERIFY_TOKEN = os.environ.get("INSTAGRAM_WEBHOOK_VERIFY_TOKEN", "")
GRAPH_API_BASE = "https://graph.facebook.com/v20.0"


# ─── Webhook Verification (GET) ───

@router.get("/webhooks/instagram")
async def verify_instagram_webhook(request: Request):
    """Meta calls this with hub.mode, hub.verify_token, hub.challenge to verify webhook ownership"""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == INSTAGRAM_WEBHOOK_VERIFY_TOKEN:
        logger.info("Instagram webhook verification successful")
        return PlainTextResponse(content=challenge, status_code=200)

    logger.warning(f"Webhook verification failed: mode={mode}, token={token}")
    return PlainTextResponse(content="Forbidden", status_code=403)


# ─── Webhook Event Handler (POST) ───

@router.post("/webhooks/instagram")
async def handle_instagram_webhook(request: Request):
    """Receive real-time events from Instagram (messages, mentions, reactions)"""
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")

    # Verify signature
    if META_APP_SECRET and signature:
        expected = "sha256=" + hmac.new(
            META_APP_SECRET.encode(), body, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            logger.warning("Invalid Instagram webhook signature")
            raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    object_type = payload.get("object")
    if object_type != "instagram":
        return {"status": "ignored"}

    # Process entries
    for entry in payload.get("entry", []):
        for messaging in entry.get("messaging", []):
            sender_id = messaging.get("sender", {}).get("id")
            recipient_id = messaging.get("recipient", {}).get("id")
            timestamp = messaging.get("timestamp")

            if "message" in messaging:
                msg = messaging["message"]
                await db.instagram_messages.insert_one({
                    "sender_id": sender_id,
                    "recipient_id": recipient_id,
                    "message_id": msg.get("mid"),
                    "text": msg.get("text"),
                    "attachments": msg.get("attachments", []),
                    "direction": "incoming",
                    "timestamp": timestamp,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                logger.info(f"IG message from {sender_id}: {msg.get('text', '[media]')}")

                # Auto-reply logic
                await _process_auto_reply(sender_id, msg.get("text", ""))

            elif "reaction" in messaging:
                logger.info(f"IG reaction from {sender_id}: {messaging['reaction']}")

            elif "read" in messaging:
                logger.info(f"IG message read by {sender_id}")

    # Log webhook
    await db.instagram_webhooks.insert_one({
        "payload": payload,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"status": "ok"}


# ─── Deauthorize Callback ───

@router.post("/webhooks/instagram/deauthorize")
async def handle_deauthorization(request: Request):
    """Handle when a user removes app access from their Instagram"""
    try:
        payload = await request.json()
        logger.info("Instagram deauthorization received")

        await db.instagram_deauth_logs.insert_one({
            "payload": payload,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        return {"status": "success"}
    except Exception as e:
        logger.error(f"Deauth error: {e}")
        return {"status": "error"}


# ─── OAuth Callback ───

@router.get("/auth/instagram/callback")
async def instagram_oauth_callback(code: str = Query(...), state: str = Query(None)):
    """Handle Instagram OAuth redirect — exchange code for tokens"""
    redirect_uri = os.environ.get("FRONTEND_URL", "https://thepigma.com") + "/api/auth/instagram/callback"

    async with httpx.AsyncClient() as client:
        # Exchange code for short-lived token
        resp = await client.post(
            "https://api.instagram.com/oauth/access_token",
            data={
                "client_id": META_APP_ID,
                "client_secret": META_APP_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
                "code": code
            }
        )

        if resp.status_code != 200:
            logger.error(f"IG token exchange failed: {resp.text}")
            raise HTTPException(status_code=400, detail="Token exchange failed")

        token_data = resp.json()
        short_token = token_data.get("access_token")
        user_id = token_data.get("user_id")

        # Exchange for long-lived token (60 days)
        long_resp = await client.get(
            "https://graph.instagram.com/access_token",
            params={
                "grant_type": "ig_exchange_token",
                "client_secret": META_APP_SECRET,
                "access_token": short_token
            }
        )

        long_token = short_token
        expires_in = 3600
        if long_resp.status_code == 200:
            long_data = long_resp.json()
            long_token = long_data.get("access_token", short_token)
            expires_in = long_data.get("expires_in", 5184000)

        # Get user profile
        profile_resp = await client.get(
            "https://graph.instagram.com/me",
            params={"fields": "id,username,name", "access_token": long_token}
        )
        username = ""
        if profile_resp.status_code == 200:
            profile = profile_resp.json()
            username = profile.get("username", "")

        # Store in DB
        await db.instagram_connections.update_one(
            {"instagram_user_id": str(user_id)},
            {"$set": {
                "instagram_user_id": str(user_id),
                "instagram_username": username,
                "access_token": long_token,
                "expires_in": expires_in,
                "connected_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True
            }},
            upsert=True
        )

        logger.info(f"Instagram connected: @{username} (ID: {user_id})")
        return {
            "status": "success",
            "instagram_user_id": str(user_id),
            "username": username,
            "message": "Instagram account connected successfully"
        }


# ─── Send DM (Admin/Internal) ───

async def send_instagram_dm(recipient_id: str, message_text: str) -> dict:
    """Send an Instagram DM using the connected business account's token"""
    conn = await db.instagram_connections.find_one({"is_active": True}, {"_id": 0})
    if not conn or not conn.get("access_token"):
        logger.warning("No active Instagram connection for sending DM")
        return {"error": "No active Instagram connection"}

    access_token = conn["access_token"]
    ig_user_id = conn["instagram_user_id"]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{GRAPH_API_BASE}/{ig_user_id}/messages",
            params={"access_token": access_token},
            json={
                "recipient": {"id": recipient_id},
                "message": {"text": message_text}
            }
        )

        if resp.status_code != 200:
            logger.error(f"Failed to send IG DM: {resp.text}")
            return {"error": resp.text}

        result = resp.json()
        await db.instagram_messages.insert_one({
            "sender_id": ig_user_id,
            "recipient_id": recipient_id,
            "message_id": result.get("message_id"),
            "text": message_text,
            "direction": "outgoing",
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        return result


# ─── Auto-Reply Logic ───

async def _process_auto_reply(sender_id: str, message_text: str):
    """Check auto-DM config and send reply if enabled"""
    config = await db.instagram_dm_config.find_one({"config_id": "auto_dm"}, {"_id": 0})
    if not config or not config.get("enabled"):
        return

    # Check if we already replied to this user recently (avoid spam)
    recent = await db.instagram_messages.find_one({
        "recipient_id": sender_id,
        "direction": "outgoing",
        "created_at": {"$gte": (datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)).isoformat()}
    })
    if recent:
        return

    reply_text = config.get("welcome_message", "Thanks for reaching out! We'll get back to you soon.")
    await send_instagram_dm(sender_id, reply_text)
    logger.info(f"Auto-replied to {sender_id}")


# ─── Admin: Get/Update Auto-DM Config ───

@router.get("/admin/instagram/dm-config")
async def get_dm_config(admin=None):
    """Get Instagram auto-DM configuration"""
    config = await db.instagram_dm_config.find_one({"config_id": "auto_dm"}, {"_id": 0})
    if not config:
        return {"enabled": False, "welcome_message": "Thanks for reaching out! We'll get back to you soon."}
    return {k: v for k, v in config.items() if k != "config_id"}


@router.put("/admin/instagram/dm-config")
async def update_dm_config(request: Request, admin: Dict = Depends(get_admin_user)):
    """Update Instagram auto-DM configuration"""
    data = await request.json()
    await db.instagram_dm_config.update_one(
        {"config_id": "auto_dm"},
        {"$set": {
            **data,
            "config_id": "auto_dm",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Auto-DM config updated"}


# ─── Admin: Connection Status ───

@router.get("/admin/instagram/status")
async def get_instagram_status(admin: Dict = Depends(get_admin_user)):
    """Get Instagram connection status"""
    conn = await db.instagram_connections.find_one({"is_active": True}, {"_id": 0})
    if not conn:
        return {"connected": False}
    return {
        "connected": True,
        "username": conn.get("instagram_username"),
        "connected_at": conn.get("connected_at"),
        "instagram_user_id": conn.get("instagram_user_id")
    }
