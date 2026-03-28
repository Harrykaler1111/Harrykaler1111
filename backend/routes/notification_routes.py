from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
from datetime import datetime, timezone
import os
import json
import logging

from config import db
from auth import get_admin_user, get_current_user, generate_id

router = APIRouter(prefix="/notifications", tags=["notifications"])

logger = logging.getLogger(__name__)

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CONTACT = os.environ.get("VAPID_CONTACT", "mailto:admin@thepigma.com")


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Return VAPID public key for frontend subscription"""
    return {"public_key": VAPID_PUBLIC_KEY}


@router.post("/subscribe")
async def subscribe_push(data: Dict):
    """Store a push subscription"""
    endpoint = data.get("endpoint")
    keys = data.get("keys", {})

    if not endpoint or not keys.get("p256dh") or not keys.get("auth"):
        raise HTTPException(status_code=400, detail="Invalid subscription data")

    # Upsert by endpoint
    sub_doc = {
        "endpoint": endpoint,
        "keys": keys,
        "user_id": data.get("user_id"),
        "subscribed_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True,
    }

    await db.push_subscriptions.update_one(
        {"endpoint": endpoint},
        {"$set": sub_doc},
        upsert=True
    )

    return {"message": "Subscribed to notifications"}


@router.post("/unsubscribe")
async def unsubscribe_push(data: Dict):
    """Remove a push subscription"""
    endpoint = data.get("endpoint")
    if not endpoint:
        raise HTTPException(status_code=400, detail="Endpoint required")

    await db.push_subscriptions.update_one(
        {"endpoint": endpoint},
        {"$set": {"is_active": False}}
    )
    return {"message": "Unsubscribed from notifications"}


async def send_push_to_all(title: str, body: str, url: str = "/", icon: str = "", tag: str = "pigma"):
    """Send push notification to all active subscribers"""
    if not VAPID_PRIVATE_KEY:
        logger.warning("VAPID keys not configured, skipping push")
        return 0

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.error("pywebpush not installed")
        return 0

    subs = await db.push_subscriptions.find({"is_active": True}, {"_id": 0}).to_list(1000)

    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "icon": icon,
        "tag": tag,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    sent = 0
    failed_endpoints = []

    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": sub["keys"]
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_CONTACT}
            )
            sent += 1
        except Exception as e:
            err_str = str(e)
            if "410" in err_str or "404" in err_str:
                failed_endpoints.append(sub["endpoint"])
            logger.debug(f"Push failed for {sub['endpoint'][:50]}: {err_str[:100]}")

    # Clean up expired subscriptions
    if failed_endpoints:
        await db.push_subscriptions.update_many(
            {"endpoint": {"$in": failed_endpoints}},
            {"$set": {"is_active": False}}
        )

    logger.info(f"Push sent to {sent}/{len(subs)} subscribers")
    return sent


# ============== ADMIN: MANUAL SEND ==============

@router.post("/admin/send")
async def admin_send_notification(data: Dict, admin: Dict = Depends(get_admin_user)):
    """Admin sends a custom notification to all subscribers"""
    title = data.get("title", "Pigma")
    body = data.get("body", "")
    url = data.get("url", "/")

    if not body:
        raise HTTPException(status_code=400, detail="Notification body required")

    sent = await send_push_to_all(title, body, url)

    # Log the notification
    await db.notification_logs.insert_one({
        "log_id": generate_id("notif_"),
        "type": "manual",
        "title": title,
        "body": body,
        "url": url,
        "sent_count": sent,
        "admin_id": admin.get("admin_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"message": f"Notification sent to {sent} subscribers", "sent_count": sent}


@router.get("/admin/stats")
async def get_notification_stats(admin: Dict = Depends(get_admin_user)):
    """Get notification subscription stats"""
    total = await db.push_subscriptions.count_documents({})
    active = await db.push_subscriptions.count_documents({"is_active": True})
    recent_logs = await db.notification_logs.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)

    return {
        "total_subscriptions": total,
        "active_subscriptions": active,
        "recent_notifications": recent_logs
    }
