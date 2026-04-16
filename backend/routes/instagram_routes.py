"""
Instagram / Facebook Graph API v19.0 Integration
==================================================
Production-ready implementation using Facebook Login for Business.

Flow:
1. GET  /instagram/auth/login     -> Generates Facebook OAuth URL (v19.0 dialog)
2. GET  /instagram/auth/callback  -> Exchange code -> User Token -> Long-lived Token
                                     -> Get Pages -> Page Access Token
                                     -> Get Instagram Business Account -> Profile
3. GET  /instagram/auth/status    -> Check connection status
4. POST /instagram/auth/disconnect -> Disconnect account
5. GET  /webhooks/instagram       -> Meta webhook verification (GET challenge)
6. POST /webhooks/instagram       -> Handle real-time events (comments, messages)

Key: ALL messaging uses the PAGE ACCESS TOKEN (not user token).
     The Page Access Token from /me/accounts with a long-lived user token is non-expiring.
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

# ─── HARDCODED Critical Values ───
META_APP_ID = "1280214187553693"
META_APP_SECRET = "c61f833e9cd67697202f5ceeca62a8f1"
REDIRECT_URI = "https://thepigma.com/api/instagram/auth/callback"
WEBHOOK_VERIFY_TOKEN = os.environ.get("INSTAGRAM_WEBHOOK_VERIFY_TOKEN", "")
BRAND_ACCESS_TOKEN = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "")
BRAND_ACCOUNT_ID = os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID", "")

# Instagram Business Login scopes (works for Creator + Professional + Business)
IG_SCOPES = "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments"

GRAPH_API_VERSION = "v19.0"
IG_GRAPH_BASE = f"https://graph.instagram.com/{GRAPH_API_VERSION}"
FB_GRAPH_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


# ══════════════════════════════════════════════
#  1. OAUTH — LOGIN (Instagram Direct OAuth)
# ══════════════════════════════════════════════

@router.get("/instagram/auth/login")
async def instagram_login(user: Dict = Depends(get_current_user)):
    """Generate Instagram OAuth URL — works for Creator/Professional/Business accounts."""

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

    params = {
        "client_id": META_APP_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": IG_SCOPES,
        "response_type": "code",
        "state": state,
        "enable_fb_login": "0",
        "force_authentication": "1",
    }
    oauth_url = f"https://www.instagram.com/oauth/authorize?{urllib.parse.urlencode(params)}"

    logger.info(f"[OAUTH] Instagram Login URL for user {user['user_id']}: {oauth_url}")

    return {"oauth_url": oauth_url, "state": state}


# ══════════════════════════════════════════════
#  2. OAUTH — CALLBACK (Instagram Direct Flow)
# ══════════════════════════════════════════════

@router.get("/instagram/auth/callback")
async def instagram_callback(code: str = Query(...), state: str = Query(None)):
    """
    Instagram redirects here with ?code=XXX&state=XXX.
    Uses Instagram's own token exchange (not Facebook's).
    Works for Creator, Professional, and Business accounts.
    """
    frontend_url = "https://thepigma.com"

    try:
        # ── Validate state ──
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

            # ── Step 1: Exchange code for short-lived token (Instagram endpoint) ──
            logger.info(f"Step 1: Exchanging code via Instagram API. code_len={len(code)}")
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
                error_detail = token_resp.text[:300]
                logger.error(f"Step 1 FAILED ({token_resp.status_code}): {error_detail}")
                encoded_err = urllib.parse.quote(error_detail)
                return RedirectResponse(url=f"{frontend_url}/influencer?tab=instagram&error=token_failed&detail={encoded_err}")

            token_data = token_resp.json()
            short_token = token_data.get("access_token")
            ig_user_id = str(token_data.get("user_id", ""))
            logger.info(f"Step 1 OK: Short token received, IG user_id={ig_user_id}")

            # ── Step 2: Exchange for long-lived token (60 days) ──
            logger.info("Step 2: Long-lived token exchange via Instagram Graph API")
            long_resp = await client.get(
                "https://graph.instagram.com/access_token",
                params={
                    "grant_type": "ig_exchange_token",
                    "client_secret": META_APP_SECRET,
                    "access_token": short_token,
                }
            )

            long_token = short_token
            token_expires_in = 3600

            if long_resp.status_code == 200:
                long_data = long_resp.json()
                long_token = long_data.get("access_token", short_token)
                token_expires_in = long_data.get("expires_in", 5184000)
                logger.info(f"Step 2 OK: Long-lived token (expires in {token_expires_in}s)")
            else:
                logger.warning(f"Step 2 WARN: {long_resp.text}. Using short-lived token.")

            # ── Step 3: Get Instagram profile ──
            logger.info(f"Step 3: Fetching IG profile for user {ig_user_id}")
            profile_resp = await client.get(
                f"{IG_GRAPH_BASE}/me",
                params={
                    "fields": "user_id,username,name,profile_picture_url,account_type,followers_count",
                    "access_token": long_token,
                }
            )

            ig_username = ""
            ig_name = ""
            ig_profile_pic = ""
            ig_followers = 0
            account_type = ""

            if profile_resp.status_code == 200:
                profile = profile_resp.json()
                ig_user_id = str(profile.get("user_id", ig_user_id))
                ig_username = profile.get("username", "")
                ig_name = profile.get("name", "")
                ig_profile_pic = profile.get("profile_picture_url", "")
                ig_followers = profile.get("followers_count", 0)
                account_type = profile.get("account_type", "")
                logger.info(f"Step 3 OK: @{ig_username} ({ig_name}), {ig_followers} followers, type={account_type}")
            else:
                logger.warning(f"Step 3 WARN: Profile fetch failed ({profile_resp.status_code}): {profile_resp.text}")

        # ── Step 4: Store everything in database ──
        token_expires_at = (datetime.now(timezone.utc) + timedelta(seconds=token_expires_in)).isoformat()

        connection_doc = {
            "ig_business_id": ig_user_id,
            "ig_username": ig_username,
            "ig_name": ig_name,
            "ig_profile_pic": ig_profile_pic,
            "ig_followers": ig_followers,
            "account_type": account_type,
            "page_id": None,
            "page_name": None,
            "page_access_token": long_token,
            "user_access_token": long_token,
            "user_token_expires_at": token_expires_at,
            "connected_by_user_id": user_id,
            "is_active": True,
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        await db.instagram_connections.update_one(
            {"ig_business_id": ig_user_id},
            {"$set": connection_doc},
            upsert=True
        )

        influencer = await db.influencers.find_one({"user_id": user_id}, {"_id": 0})
        if influencer:
            await db.influencers.update_one(
                {"influencer_id": influencer["influencer_id"]},
                {"$set": {
                    "instagram_connected": True,
                    "instagram_user_id": ig_user_id,
                    "instagram_username": ig_username,
                    "instagram_access_token": long_token,
                    "instagram_page_id": None,
                    "instagram_token_expires": token_expires_at,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }}
            )

        await db.instagram_oauth_states.delete_one({"state": state})

        logger.info(f"SUCCESS: Instagram connected @{ig_username} (ID: {ig_user_id}, type: {account_type}) for user {user_id}")
        return RedirectResponse(url=f"{frontend_url}/influencer?tab=instagram&connected=true")

    except Exception as e:
        logger.error(f"CALLBACK CRASH: {type(e).__name__}: {str(e)}", exc_info=True)
        encoded_err = urllib.parse.quote(f"{type(e).__name__}: {str(e)[:200]}")
        return RedirectResponse(url=f"{frontend_url}/influencer?tab=instagram&error=server_error&detail={encoded_err}")


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
            "username": conn.get("ig_username"),
            "ig_business_id": conn.get("ig_business_id"),
            "page_id": conn.get("page_id"),
            "page_name": conn.get("page_name"),
            "profile_pic": conn.get("ig_profile_pic"),
            "followers": conn.get("ig_followers"),
            "connected_at": conn.get("connected_at"),
        }

    # Fallback: check influencer record
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if influencer and influencer.get("instagram_connected"):
        return {
            "connected": True,
            "username": influencer.get("instagram_username"),
            "ig_business_id": influencer.get("instagram_user_id"),
            "page_id": influencer.get("instagram_page_id"),
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
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
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
                "instagram_page_id": None,
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

    logger.warning(f"Webhook verification failed: mode={mode}, token_match={token == WEBHOOK_VERIFY_TOKEN}")
    return PlainTextResponse(content="Forbidden", status_code=403)


# ══════════════════════════════════════════════
#  6. WEBHOOK — Event Handler (POST)
# ══════════════════════════════════════════════

@router.post("/webhooks/instagram")
async def handle_webhook(request: Request):
    """
    Receive real-time events from Instagram via Facebook Graph API.
    Must respond within 5 seconds (200 OK) or Meta will retry.

    Handles:
      - comments: entry[].changes[].field == "comments"
      - messages: entry[].messaging[]
      - messaging_postbacks: entry[].messaging[].postback
    """
    body = await request.body()

    # Verify X-Hub-Signature-256
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

    obj_type = payload.get("object")
    if obj_type not in ("instagram", "page"):
        return {"status": "ignored", "reason": f"Unhandled object type: {obj_type}"}

    # Log raw webhook
    await db.instagram_webhooks.insert_one({
        "payload": payload,
        "object_type": obj_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    for entry in payload.get("entry", []):
        entry_id = str(entry.get("id", ""))

        # ── Handle comments (changes array) ──
        for change in entry.get("changes", []):
            if change.get("field") == "comments":
                value = change.get("value", {})
                media_id = str(value.get("media", {}).get("id", ""))
                commenter_id = str(value.get("from", {}).get("id", ""))
                commenter_username = value.get("from", {}).get("username", "")
                comment_text = value.get("text", "")

                if commenter_id and commenter_id != entry_id:
                    logger.info(f"Comment from @{commenter_username} on media {media_id}: {comment_text}")
                    await _handle_comment_auto_dm(entry_id, media_id, commenter_id, commenter_username)

            elif change.get("field") == "mentions":
                value = change.get("value", {})
                logger.info(f"Mention received: {value}")

        # ── Handle messages (messaging array) ──
        for messaging in entry.get("messaging", []):
            sender_id = str(messaging.get("sender", {}).get("id", ""))
            recipient_id = str(messaging.get("recipient", {}).get("id", ""))

            if "message" in messaging:
                msg_text = messaging["message"].get("text", "")
                logger.info(f"DM from {sender_id}: {msg_text}")
                await _handle_incoming_dm(recipient_id, sender_id, msg_text)

            elif "postback" in messaging:
                postback_title = messaging["postback"].get("title", "")
                postback_payload = messaging["postback"].get("payload", "")
                logger.info(f"Postback from {sender_id}: {postback_title} / {postback_payload}")

    return {"status": "ok"}


# ══════════════════════════════════════════════
#  7. DEAUTHORIZE & DATA DELETION CALLBACKS
# ══════════════════════════════════════════════

@router.post("/webhooks/instagram/deauthorize")
async def handle_deauthorize(request: Request):
    """Handle when user removes app access"""
    try:
        payload = await request.json()
        logger.info(f"Instagram deauthorization received: {payload}")
        await db.instagram_deauth_logs.insert_one({
            "payload": payload,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"Deauth error: {e}")
    return {"status": "success"}


# ══════════════════════════════════════════════
#  8. SEND DM — Uses PAGE ACCESS TOKEN
# ══════════════════════════════════════════════

async def send_dm(ig_business_id: str, access_token: str, recipient_id: str, message_text: str) -> dict:
    """
    Send an Instagram DM.
    Tries Instagram Graph API endpoint first, falls back to Facebook Graph API.
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        # Try Instagram Graph API first
        resp = await client.post(
            f"{IG_GRAPH_BASE}/{ig_business_id}/messages",
            params={"access_token": access_token},
            json={
                "recipient": {"id": recipient_id},
                "message": {"text": message_text}
            }
        )

        if resp.status_code == 200:
            result = resp.json()
            logger.info(f"DM sent to {recipient_id} from IG {ig_business_id}")
            return {"status": "sent", "message_id": result.get("message_id")}
        
        # Fallback to Facebook Graph API endpoint
        resp2 = await client.post(
            f"{FB_GRAPH_BASE}/{ig_business_id}/messages",
            params={"access_token": access_token},
            json={
                "recipient": {"id": recipient_id},
                "message": {"text": message_text}
            }
        )

        if resp2.status_code == 200:
            result = resp2.json()
            logger.info(f"DM sent to {recipient_id} via FB Graph from IG {ig_business_id}")
            return {"status": "sent", "message_id": result.get("message_id")}

        logger.error(f"DM failed ({resp.status_code}): {resp.text} | FB ({resp2.status_code}): {resp2.text}")
        return {"status": "failed", "error": resp.text, "status_code": resp.status_code}


# ══════════════════════════════════════════════
#  9. AUTO-DM LOGIC (Comment → DM)
# ══════════════════════════════════════════════

async def _handle_comment_auto_dm(ig_account_id: str, media_id: str, commenter_id: str, commenter_username: str):
    """When someone comments on an influencer's post, auto-DM them the product link."""

    # Find influencer by IG Business Account ID
    influencer = await db.influencers.find_one(
        {"instagram_user_id": ig_account_id, "instagram_connected": True, "automation_enabled": True},
        {"_id": 0}
    )
    if not influencer:
        # Also check by page_id since webhook entry.id might be the page
        conn = await db.instagram_connections.find_one(
            {"$or": [{"ig_business_id": ig_account_id}, {"page_id": ig_account_id}], "is_active": True},
            {"_id": 0}
        )
        if conn:
            influencer = await db.influencers.find_one(
                {"user_id": conn["connected_by_user_id"], "automation_enabled": True},
                {"_id": 0}
            )
        if not influencer:
            logger.info(f"No active influencer automation for account {ig_account_id}")
            return

    # Find matching post with auto_dm enabled
    post = await db.instagram_posts.find_one(
        {"influencer_id": influencer["influencer_id"], "auto_dm_enabled": True},
        {"_id": 0}
    )
    if not post:
        return

    # Skip if already DM'd this commenter
    if commenter_id in post.get("commented_users", []):
        return

    # Get the PAGE ACCESS TOKEN for sending
    access_token = influencer.get("instagram_access_token")
    ig_biz_id = influencer.get("instagram_user_id")

    if not access_token or not ig_biz_id:
        # Fallback: get from connection record
        conn = await db.instagram_connections.find_one(
            {"connected_by_user_id": influencer["user_id"], "is_active": True},
            {"_id": 0}
        )
        if conn:
            access_token = conn.get("page_access_token")
            ig_biz_id = conn.get("ig_business_id")

    if not access_token or not ig_biz_id:
        logger.error(f"No access token for influencer {influencer['influencer_id']}")
        return

    result = await send_dm(ig_biz_id, access_token, commenter_id, post["dm_message"])

    # Log DM
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
#  10. INCOMING DM HANDLER
# ══════════════════════════════════════════════

async def _handle_incoming_dm(recipient_ig_id: str, sender_id: str, message_text: str):
    """Handle an incoming DM — auto-reply if configured."""

    # Log the incoming message
    await db.instagram_messages.insert_one({
        "message_id": generate_id("igmsg_"),
        "ig_account_id": recipient_ig_id,
        "sender_id": sender_id,
        "text": message_text,
        "direction": "incoming",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Check auto-reply config
    config = await db.instagram_dm_config.find_one({"config_id": "auto_dm"}, {"_id": 0})
    if not config or not config.get("enabled"):
        return

    # Don't auto-reply more than once per day per sender
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    recent = await db.instagram_messages.find_one({
        "sender_id": sender_id, "direction": "outgoing",
        "created_at": {"$gte": today}
    })
    if recent:
        return

    reply = config.get("welcome_message", "Thanks for reaching out! We'll get back to you soon.")

    # Find the connection to get page_access_token
    conn = await db.instagram_connections.find_one(
        {"$or": [{"ig_business_id": recipient_ig_id}, {"page_id": recipient_ig_id}], "is_active": True},
        {"_id": 0}
    )
    if conn:
        result = await send_dm(
            conn["ig_business_id"],
            conn["page_access_token"],
            sender_id,
            reply
        )
        # Log outgoing
        await db.instagram_messages.insert_one({
            "message_id": generate_id("igmsg_"),
            "ig_account_id": conn["ig_business_id"],
            "sender_id": sender_id,
            "text": reply,
            "direction": "outgoing",
            "status": result.get("status"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    elif BRAND_ACCESS_TOKEN and BRAND_ACCOUNT_ID:
        # Fallback to brand account
        await send_dm(BRAND_ACCOUNT_ID, BRAND_ACCESS_TOKEN, sender_id, reply)


# ══════════════════════════════════════════════
#  11. ADMIN ENDPOINTS
# ══════════════════════════════════════════════

@router.get("/admin/instagram/status")
async def admin_instagram_status(admin: Dict = Depends(get_admin_user)):
    """Admin: check all Instagram connections"""
    connections = await db.instagram_connections.find(
        {"is_active": True}, {"_id": 0, "page_access_token": 0, "user_access_token": 0}
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


@router.post("/admin/instagram/refresh-tokens")
async def admin_refresh_tokens(admin: Dict = Depends(get_admin_user)):
    """Admin: manually trigger token refresh for all expiring connections"""
    from services.instagram_token_refresh import run_refresh_cycle
    result = await run_refresh_cycle()
    return {"message": "Token refresh cycle completed", **result}


@router.get("/admin/instagram/refresh-logs")
async def admin_refresh_logs(admin: Dict = Depends(get_admin_user), limit: int = 10):
    """Admin: view recent token refresh logs"""
    logs = await db.instagram_token_refresh_logs.find(
        {}, {"_id": 0}
    ).sort("cycle_at", -1).limit(limit).to_list(limit)
    return logs



# ══════════════════════════════════════════════
#  12. HEALTH DASHBOARD (Influencer)
# ══════════════════════════════════════════════

@router.get("/instagram/health-dashboard")
async def instagram_health_dashboard(user: Dict = Depends(get_current_user)):
    """
    Returns token health, DM delivery rates, and recent webhook events
    for the logged-in influencer's Instagram connection.
    """
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not registered as influencer")

    # ── Connection & Token Health ──
    conn = await db.instagram_connections.find_one(
        {"connected_by_user_id": user["user_id"], "is_active": True}, {"_id": 0}
    )

    now = datetime.now(timezone.utc)
    connection_info = {"connected": False}

    if conn:
        token_expires_str = conn.get("user_token_expires_at")
        token_days_remaining = -1
        token_status = "healthy"

        if token_expires_str:
            try:
                expires_dt = datetime.fromisoformat(token_expires_str)
                if expires_dt.tzinfo is None:
                    expires_dt = expires_dt.replace(tzinfo=timezone.utc)
                remaining = expires_dt - now
                token_days_remaining = max(0, remaining.days)
                if token_days_remaining == 0:
                    token_status = "expired"
                elif token_days_remaining <= 7:
                    token_status = "expiring_soon"
                else:
                    token_status = "healthy"
            except (ValueError, TypeError):
                token_status = "unknown"

        connection_info = {
            "connected": True,
            "ig_username": conn.get("ig_username", ""),
            "ig_business_id": conn.get("ig_business_id", ""),
            "ig_profile_pic": conn.get("ig_profile_pic", ""),
            "ig_followers": conn.get("ig_followers", 0),
            "page_name": conn.get("page_name", ""),
            "page_id": conn.get("page_id", ""),
            "connected_at": conn.get("connected_at", ""),
            "user_token_expires_at": token_expires_str,
            "token_days_remaining": token_days_remaining,
            "token_status": token_status,
            "last_token_refresh": conn.get("last_token_refresh"),
            "auto_refresh_enabled": True,
            "auto_refresh_note": "Tokens expiring within 7 days are auto-refreshed every 6 hours",
            "page_token_note": "Page tokens from long-lived user tokens are non-expiring",
        }

    # ── DM Delivery Stats ──
    inf_id = influencer.get("influencer_id")

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    # All-time stats
    total_sent = await db.instagram_dms.count_documents({"influencer_id": inf_id, "status": "sent"})
    total_failed = await db.instagram_dms.count_documents({"influencer_id": inf_id, "status": "failed"})
    total_pending = await db.instagram_dms.count_documents({"influencer_id": inf_id, "status": "pending"})
    total_all = total_sent + total_failed + total_pending
    success_rate = round((total_sent / total_all * 100), 1) if total_all > 0 else 0

    # Today
    today_sent = await db.instagram_dms.count_documents({"influencer_id": inf_id, "status": "sent", "created_at": {"$gte": today_start}})
    today_failed = await db.instagram_dms.count_documents({"influencer_id": inf_id, "status": "failed", "created_at": {"$gte": today_start}})

    # This week
    week_sent = await db.instagram_dms.count_documents({"influencer_id": inf_id, "status": "sent", "created_at": {"$gte": week_start}})
    week_failed = await db.instagram_dms.count_documents({"influencer_id": inf_id, "status": "failed", "created_at": {"$gte": week_start}})

    # This month
    month_sent = await db.instagram_dms.count_documents({"influencer_id": inf_id, "status": "sent", "created_at": {"$gte": month_start}})
    month_failed = await db.instagram_dms.count_documents({"influencer_id": inf_id, "status": "failed", "created_at": {"$gte": month_start}})

    dm_stats = {
        "total_sent": total_sent,
        "total_failed": total_failed,
        "total_pending": total_pending,
        "total_all": total_all,
        "success_rate": success_rate,
        "today": {"sent": today_sent, "failed": today_failed},
        "this_week": {"sent": week_sent, "failed": week_failed},
        "this_month": {"sent": month_sent, "failed": month_failed},
    }

    # ── Webhook Event Log (last 20) ──
    raw_events = await db.instagram_webhooks.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)

    webhook_events = []
    for evt in raw_events:
        payload = evt.get("payload", {})
        event_type = evt.get("object_type", payload.get("object", "unknown"))
        timestamp = evt.get("created_at", "")

        # Parse entries for a human-readable summary
        summaries = []
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                field = change.get("field", "unknown")
                val = change.get("value", {})
                if field == "comments":
                    uname = val.get("from", {}).get("username", "unknown")
                    summaries.append(f"Comment from @{uname}")
                elif field == "mentions":
                    summaries.append("Mention received")
                else:
                    summaries.append(f"{field} event")
            for msg in entry.get("messaging", []):
                sender = msg.get("sender", {}).get("id", "unknown")
                if "message" in msg:
                    summaries.append(f"DM from {sender}")
                elif "postback" in msg:
                    summaries.append(f"Postback from {sender}")

        webhook_events.append({
            "type": event_type,
            "timestamp": timestamp,
            "summary": "; ".join(summaries) if summaries else "Raw event",
        })

    # ── Automation Stats ──
    total_posts = await db.instagram_posts.count_documents({"influencer_id": inf_id})
    active_posts = await db.instagram_posts.count_documents({"influencer_id": inf_id, "auto_dm_enabled": True})

    automation = {
        "enabled": influencer.get("automation_enabled", False),
        "posts_registered": total_posts,
        "active_posts": active_posts,
        "dm_rate_limit_hour": influencer.get("dm_rate_limit_hour", 0),
        "dm_rate_limit_day": influencer.get("dm_rate_limit_day", 0),
    }

    return {
        "connection": connection_info,
        "dm_stats": dm_stats,
        "webhook_events": webhook_events,
        "automation": automation,
    }
