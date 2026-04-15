"""
Instagram Token Auto-Refresh Service
======================================
Background task that runs every 6 hours to detect tokens expiring within 7 days
and silently refreshes them using the Facebook Graph API.

Flow:
  1. Query instagram_connections for active connections with user_token_expires_at within 7 days
  2. Exchange the existing long-lived token for a fresh one via Graph API
  3. Fetch updated page tokens via /me/accounts
  4. Update DB with new tokens + expiry
  5. Log all refresh attempts

Note: Page Access Tokens obtained from a long-lived user token are non-expiring,
but we still need to keep the user token fresh to re-fetch page tokens if needed.
"""

import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta

import httpx

from config import db

logger = logging.getLogger(__name__)

META_APP_ID = os.environ.get("META_APP_ID", "")
META_APP_SECRET = os.environ.get("META_APP_SECRET", "")
GRAPH_API_VERSION = "v19.0"
GRAPH_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"

REFRESH_INTERVAL_SECONDS = 6 * 60 * 60  # 6 hours
EXPIRY_THRESHOLD_DAYS = 7


async def refresh_token(connection: dict) -> dict:
    """
    Refresh a single connection's user token and re-fetch page tokens.
    Returns a result dict with status and details.
    """
    ig_biz_id = connection.get("ig_business_id", "unknown")
    username = connection.get("ig_username", "unknown")
    old_user_token = connection.get("user_access_token")

    if not old_user_token:
        return {"status": "skipped", "reason": "no_user_token", "ig_business_id": ig_biz_id}

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Exchange existing long-lived token for a new one
        resp = await client.get(
            f"{GRAPH_BASE}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": META_APP_ID,
                "client_secret": META_APP_SECRET,
                "fb_exchange_token": old_user_token,
            }
        )

        if resp.status_code != 200:
            error_text = resp.text
            logger.error(f"Token refresh failed for @{username} ({ig_biz_id}): {error_text}")
            return {"status": "failed", "reason": "token_exchange_failed", "error": error_text, "ig_business_id": ig_biz_id}

        token_data = resp.json()
        new_user_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in", 5184000)  # default 60 days

        if not new_user_token:
            return {"status": "failed", "reason": "no_token_in_response", "ig_business_id": ig_biz_id}

        new_expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()

        # Step 2: Re-fetch page tokens using the new user token
        page_id = connection.get("page_id")
        new_page_token = connection.get("page_access_token")  # fallback to existing

        if page_id:
            pages_resp = await client.get(
                f"{GRAPH_BASE}/me/accounts",
                params={
                    "access_token": new_user_token,
                    "fields": "id,name,access_token",
                }
            )
            if pages_resp.status_code == 200:
                for page in pages_resp.json().get("data", []):
                    if page.get("id") == page_id:
                        new_page_token = page.get("access_token", new_page_token)
                        break

        # Step 3: Update the connection in DB
        await db.instagram_connections.update_one(
            {"ig_business_id": ig_biz_id},
            {"$set": {
                "user_access_token": new_user_token,
                "user_token_expires_at": new_expires_at,
                "page_access_token": new_page_token,
                "last_token_refresh": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )

        # Step 4: Also update the influencer record if exists
        user_id = connection.get("connected_by_user_id")
        if user_id:
            await db.influencers.update_one(
                {"user_id": user_id, "instagram_connected": True},
                {"$set": {
                    "instagram_access_token": new_page_token,
                    "instagram_token_expires": new_expires_at,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }}
            )

        logger.info(f"Token refreshed for @{username} ({ig_biz_id}) — new expiry in {expires_in // 86400} days")
        return {
            "status": "refreshed",
            "ig_business_id": ig_biz_id,
            "username": username,
            "new_expires_at": new_expires_at,
            "expires_in_days": expires_in // 86400,
        }


async def run_refresh_cycle():
    """Find connections expiring within threshold and refresh them."""
    now = datetime.now(timezone.utc)
    threshold = (now + timedelta(days=EXPIRY_THRESHOLD_DAYS)).isoformat()

    # Find active connections with user tokens expiring soon
    connections = await db.instagram_connections.find(
        {
            "is_active": True,
            "user_access_token": {"$exists": True, "$ne": None},
            "user_token_expires_at": {"$exists": True, "$lte": threshold},
        },
        {"_id": 0}
    ).to_list(100)

    if not connections:
        logger.info(f"Token refresh cycle: no tokens expiring within {EXPIRY_THRESHOLD_DAYS} days")
        return {"refreshed": 0, "failed": 0, "skipped": 0, "results": []}

    logger.info(f"Token refresh cycle: found {len(connections)} connection(s) to refresh")

    results = []
    refreshed = 0
    failed = 0
    skipped = 0

    for conn in connections:
        try:
            result = await refresh_token(conn)
            results.append(result)
            if result["status"] == "refreshed":
                refreshed += 1
            elif result["status"] == "failed":
                failed += 1
            else:
                skipped += 1
        except Exception as e:
            ig_biz_id = conn.get("ig_business_id", "unknown")
            logger.error(f"Token refresh exception for {ig_biz_id}: {e}")
            results.append({"status": "error", "ig_business_id": ig_biz_id, "error": str(e)})
            failed += 1

    # Log the cycle result
    await db.instagram_token_refresh_logs.insert_one({
        "cycle_at": now.isoformat(),
        "total_checked": len(connections),
        "refreshed": refreshed,
        "failed": failed,
        "skipped": skipped,
        "results": results,
    })

    logger.info(f"Token refresh cycle complete: {refreshed} refreshed, {failed} failed, {skipped} skipped")
    return {"refreshed": refreshed, "failed": failed, "skipped": skipped, "results": results}


async def token_refresh_loop():
    """Background loop that runs refresh cycles every REFRESH_INTERVAL_SECONDS."""
    logger.info(f"Instagram token auto-refresh started (interval: {REFRESH_INTERVAL_SECONDS // 3600}h, threshold: {EXPIRY_THRESHOLD_DAYS}d)")
    # Wait 60s after startup before first check
    await asyncio.sleep(60)
    while True:
        try:
            await run_refresh_cycle()
        except Exception as e:
            logger.error(f"Token refresh loop error: {e}")
        await asyncio.sleep(REFRESH_INTERVAL_SECONDS)


def start_token_refresh_task():
    """Call this from FastAPI startup to launch the background task."""
    asyncio.create_task(token_refresh_loop())
    logger.info("Instagram token auto-refresh task scheduled")
