from fastapi import APIRouter, Request, HTTPException, Query, Header, Depends
from fastapi.responses import PlainTextResponse
from typing import Dict, Optional
from datetime import datetime, timezone, timedelta
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
INSTAGRAM_ACCESS_TOKEN = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "")
INSTAGRAM_BUSINESS_ACCOUNT_ID = os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID", "")
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
        ig_account_id = str(entry.get("id", ""))

        # Handle comment events (changes array)
        for change in entry.get("changes", []):
            if change.get("field") == "comments":
                value = change.get("value", {})
                media_id = str(value.get("media", {}).get("id", ""))
                comment_id = str(value.get("id", ""))
                comment_text = value.get("text", "")
                commenter_id = str(value.get("from", {}).get("id", ""))
                commenter_username = value.get("from", {}).get("username", "")

                if media_id and commenter_id and commenter_id != ig_account_id:
                    logger.info(f"IG comment from @{commenter_username} on media {media_id}: {comment_text}")
                    await _process_comment_auto_dm(
                        ig_account_id, media_id, comment_id,
                        commenter_id, commenter_username, comment_text
                    )

        # Handle messaging events
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
    """Handle Instagram OAuth redirect — works for both brand + influencer accounts"""
    from fastapi.responses import RedirectResponse
    redirect_uri = os.environ.get("FRONTEND_URL", "https://thepigma.com") + "/api/auth/instagram/callback"
    frontend_url = os.environ.get("FRONTEND_URL", "https://thepigma.com")

    # Check if this is an influencer OAuth flow
    influencer = None
    if state and state.startswith("ig_state_"):
        oauth_state = await db.instagram_oauth_states.find_one({"state": state}, {"_id": 0})
        if oauth_state:
            influencer = await db.influencers.find_one(
                {"influencer_id": oauth_state["influencer_id"]}, {"_id": 0}
            )

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
            if influencer:
                return RedirectResponse(url=f"{frontend_url}/influencer?tab=instagram&error=token_failed")
            raise HTTPException(status_code=400, detail="Token exchange failed")

        token_data = resp.json()
        short_token = token_data.get("access_token")
        user_id = str(token_data.get("user_id"))

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
            user_id = str(profile.get("id", user_id))

    # ── Influencer flow: save token to influencer record ──
    if influencer:
        await db.influencers.update_one(
            {"influencer_id": influencer["influencer_id"]},
            {"$set": {
                "instagram_connected": True,
                "instagram_user_id": user_id,
                "instagram_username": username,
                "instagram_access_token": long_token,
                "instagram_token_expires": (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        await db.instagram_oauth_states.delete_one({"state": state})
        logger.info(f"Influencer {influencer['influencer_id']} connected Instagram @{username}")
        return RedirectResponse(url=f"{frontend_url}/influencer?tab=instagram&connected=true")

    # ── Brand/admin flow: save to connections collection ──
    await db.instagram_connections.update_one(
        {"instagram_user_id": user_id},
        {"$set": {
            "instagram_user_id": user_id,
            "instagram_username": username,
            "access_token": long_token,
            "expires_in": expires_in,
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        }},
        upsert=True
    )

    logger.info(f"Instagram connected: @{username} (ID: {user_id})")
    return RedirectResponse(url=f"{frontend_url}/?instagram_connected=true")


# ─── Send DM (Admin/Internal) ───

async def send_instagram_dm(recipient_id: str, message_text: str) -> dict:
    """Send an Instagram DM using the connected business account's token"""
    # Try DB connection first, fall back to env token
    conn = await db.instagram_connections.find_one({"is_active": True}, {"_id": 0})
    access_token = None
    ig_user_id = None

    if conn and conn.get("access_token"):
        access_token = conn["access_token"]
        ig_user_id = conn["instagram_user_id"]
    elif INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID:
        access_token = INSTAGRAM_ACCESS_TOKEN
        ig_user_id = INSTAGRAM_BUSINESS_ACCOUNT_ID
    else:
        logger.warning("No active Instagram connection for sending DM")
        return {"error": "No active Instagram connection"}

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


# ─── Comment Auto-DM Logic ───

async def _process_comment_auto_dm(
    ig_account_id: str, media_id: str, comment_id: str,
    commenter_id: str, commenter_username: str, comment_text: str
):
    """When someone comments on an influencer's post, auto-DM the product link"""

    # Find the influencer by their Instagram user ID
    influencer = await db.influencers.find_one(
        {"instagram_user_id": ig_account_id, "instagram_connected": True, "automation_enabled": True},
        {"_id": 0}
    )
    if not influencer:
        return

    # Find the post record mapped to this media
    post_record = await db.instagram_posts.find_one(
        {"influencer_id": influencer["influencer_id"], "auto_dm_enabled": True},
        {"_id": 0},
    )

    # Try matching by media_id first, else use the most recent post
    if media_id:
        media_post = await db.instagram_posts.find_one(
            {"influencer_id": influencer["influencer_id"], "media_id": media_id, "auto_dm_enabled": True},
            {"_id": 0}
        )
        if media_post:
            post_record = media_post

    if not post_record:
        return

    # Check if already DM'd this commenter for this post
    if commenter_id in post_record.get("commented_users", []):
        return

    # Rate limiting
    from routes.influencer_routes import DM_RATE_LIMIT_PER_HOUR, DM_RATE_LIMIT_PER_DAY
    now = datetime.now(timezone.utc)
    hourly_count = influencer.get("dm_rate_limit_hour", 0)
    daily_count = influencer.get("dm_rate_limit_day", 0)
    last_hour_reset = influencer.get("last_dm_reset_hour", now.isoformat())
    last_day_reset = influencer.get("last_dm_reset_day", now.isoformat())

    if isinstance(last_hour_reset, str):
        last_hour_reset = datetime.fromisoformat(last_hour_reset)
    if isinstance(last_day_reset, str):
        last_day_reset = datetime.fromisoformat(last_day_reset)
    if last_hour_reset.tzinfo is None:
        last_hour_reset = last_hour_reset.replace(tzinfo=timezone.utc)
    if last_day_reset.tzinfo is None:
        last_day_reset = last_day_reset.replace(tzinfo=timezone.utc)

    if (now - last_hour_reset).total_seconds() > 3600:
        hourly_count = 0
    if (now - last_day_reset).total_seconds() > 86400:
        daily_count = 0

    if hourly_count >= DM_RATE_LIMIT_PER_HOUR or daily_count >= DM_RATE_LIMIT_PER_DAY:
        logger.warning(f"Rate limited for influencer {influencer['influencer_id']}")
        return

    # Send DM from influencer's account
    access_token = influencer.get("instagram_access_token")
    ig_user_id = influencer.get("instagram_user_id")

    dm_status = "pending"
    ig_message_id = None
    error_msg = None

    if access_token and ig_user_id:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"https://graph.facebook.com/v20.0/{ig_user_id}/messages",
                    params={"access_token": access_token},
                    json={
                        "recipient": {"id": commenter_id},
                        "message": {"text": post_record["dm_message"]}
                    }
                )
                if resp.status_code == 200:
                    dm_status = "sent"
                    ig_message_id = resp.json().get("message_id")
                    logger.info(f"Auto-DM sent to @{commenter_username} from @{influencer.get('instagram_username', '')}")
                else:
                    dm_status = "failed"
                    error_msg = resp.text
                    logger.error(f"Auto-DM failed to @{commenter_username}: {resp.text}")
        except Exception as e:
            dm_status = "failed"
            error_msg = str(e)
            logger.error(f"Auto-DM error: {e}")
    else:
        dm_status = "failed"
        error_msg = "No access token"

    # Log the DM
    from auth import generate_id
    dm_record = {
        "dm_id": generate_id("dm_"),
        "influencer_id": influencer["influencer_id"],
        "post_record_id": post_record.get("post_record_id"),
        "media_id": media_id,
        "comment_id": comment_id,
        "comment_text": comment_text,
        "recipient_id": commenter_id,
        "recipient_username": commenter_username,
        "message": post_record["dm_message"],
        "status": dm_status,
        "ig_message_id": ig_message_id,
        "error": error_msg,
        "created_at": now.isoformat()
    }
    await db.instagram_dms.insert_one(dm_record)

    # Update counters
    await db.influencers.update_one(
        {"influencer_id": influencer["influencer_id"]},
        {
            "$inc": {"dm_rate_limit_hour": 1, "dm_rate_limit_day": 1},
            "$set": {"last_dm_reset_hour": now.isoformat(), "last_dm_reset_day": now.isoformat()}
        }
    )

    await db.instagram_posts.update_one(
        {"post_record_id": post_record["post_record_id"]},
        {
            "$inc": {"total_comments": 1, "total_dms_sent": 1 if dm_status == "sent" else 0},
            "$push": {"commented_users": commenter_id}
        }
    )


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
    if conn:
        return {
            "connected": True,
            "username": conn.get("instagram_username"),
            "connected_at": conn.get("connected_at"),
            "instagram_user_id": conn.get("instagram_user_id")
        }
    if INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID:
        return {
            "connected": True,
            "username": "officialpigma",
            "connected_at": "configured via env",
            "instagram_user_id": INSTAGRAM_BUSINESS_ACCOUNT_ID
        }
    return {"connected": False}
