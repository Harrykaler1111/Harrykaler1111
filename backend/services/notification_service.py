"""
Notification Service — Creates notifications and pushes via WebSocket.
Central place to trigger notifications from any route.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List

from config import db
from auth import generate_id
from ws_manager import ws_manager

logger = logging.getLogger(__name__)


async def _get_next_ntf_id() -> str:
    """Generate sequential NTF-XXXX ID."""
    result = await db.counters.find_one_and_update(
        {"_id": "notification"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    seq = result["seq"]
    return f"NTF-{seq:04d}"


async def create_notification(
    user_id: str,
    user_role: str,
    type: str,
    title: str,
    message: str,
    reference_id: str = "",
    triggered_by: str = "",
    priority: str = "medium",
    redirect_url: str = "",
) -> dict:
    """Create a notification, save to DB, and push via WebSocket."""

    # Check user preferences — skip if this type is disabled
    prefs = await db.notification_prefs.find_one({"user_id": user_id}, {"_id": 0})
    if prefs and prefs.get(type) is False:
        logger.info(f"Notification skipped for {user_id} — {type} disabled in preferences")
        return {}

    ntf_id = await _get_next_ntf_id()

    # Auto-generate redirect URL based on type + reference
    if not redirect_url and reference_id:
        if type == "order":
            redirect_url = f"/orders/{reference_id}" if user_role == "vendor" else f"/admin?tab=orders&id={reference_id}"
        elif type == "issue":
            redirect_url = f"/support/{reference_id}" if user_role == "vendor" else f"/admin?tab=issues&id={reference_id}"
        elif type == "promotion":
            redirect_url = "/promotions" if user_role == "vendor" else "/admin?tab=monetization"
        elif type == "kyc":
            redirect_url = "/kyc" if user_role == "vendor" else "/admin?tab=vendors"
        elif type == "credit":
            redirect_url = "/wallet" if user_role == "vendor" else "/admin?tab=monetization"

    doc = {
        "notification_id": ntf_id,
        "user_id": user_id,
        "user_role": user_role,
        "triggered_by": triggered_by,
        "type": type,
        "reference_id": reference_id,
        "title": title,
        "message": message,
        "is_read": False,
        "priority": priority,
        "redirect_url": redirect_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.notifications.insert_one(doc)

    # Check quiet hours — during quiet hours, save to DB but skip real-time push
    is_quiet = False
    if prefs and prefs.get("quiet_hours_enabled"):
        try:
            now_utc = datetime.now(timezone.utc)
            # Convert to IST (UTC+5:30) for Indian users
            from datetime import timedelta
            now_ist = now_utc + timedelta(hours=5, minutes=30)
            current_time = now_ist.strftime("%H:%M")
            q_start = prefs.get("quiet_hours_start", "22:00")
            q_end = prefs.get("quiet_hours_end", "08:00")

            if q_start > q_end:
                # Crosses midnight (e.g., 22:00 - 08:00)
                is_quiet = current_time >= q_start or current_time < q_end
            else:
                # Same day (e.g., 13:00 - 15:00)
                is_quiet = q_start <= current_time < q_end
        except Exception:
            is_quiet = False

    if is_quiet:
        logger.info(f"Notification {ntf_id} -> {user_id} [quiet hours] saved but not pushed")
        return doc

    # Push via WebSocket — include sound prefs
    sound_key = f"sound_{priority}"
    play_sound = True  # default
    if prefs:
        play_sound = prefs.get(sound_key, priority == "high")

    ws_payload = {
        "event": "notification",
        "data": {
            "notification_id": ntf_id,
            "type": type,
            "title": title,
            "message": message,
            "priority": priority,
            "reference_id": reference_id,
            "redirect_url": redirect_url,
            "created_at": doc["created_at"],
            "is_read": False,
            "play_sound": play_sound,
        }
    }
    await ws_manager.send_to_user(user_id, ws_payload)

    logger.info(f"Notification {ntf_id} -> {user_id} [{priority}] {title}")
    return doc


async def notify_new_order(order_doc: dict):
    """Trigger notifications when a new order is placed."""
    order_id = order_doc["order_id"]
    total = order_doc.get("total", 0)
    items = order_doc.get("items", [])
    product_names = ", ".join(i.get("product_name", "")[:30] for i in items[:3])
    if len(items) > 3:
        product_names += f" +{len(items)-3} more"

    # Notify vendor
    vendor_id = order_doc.get("vendor_id")
    if vendor_id:
        await create_notification(
            user_id=vendor_id,
            user_role="vendor",
            type="order",
            title="New Order Received!",
            message=f"Order #{order_id[-6:]} — Rs.{total:,.0f} for {product_names}",
            reference_id=order_id,
            triggered_by=order_doc.get("user_id", ""),
            priority="high",
        )

    # Notify all admins
    await _notify_all_admins(
        type="order",
        title="New Order Placed",
        message=f"Order #{order_id[-6:]} — Rs.{total:,.0f} ({len(items)} items) from {order_doc.get('shipping_address', {}).get('name', 'Customer')}",
        reference_id=order_id,
        triggered_by=order_doc.get("user_id", ""),
        priority="high",
    )


async def notify_new_ticket(ticket_doc: dict):
    """Trigger notifications when a support ticket is created."""
    ticket_id = ticket_doc.get("ticket_id", "")
    title = ticket_doc.get("title", "New Ticket")
    category = ticket_doc.get("category", "")
    priority = ticket_doc.get("priority", "medium")

    # Notify all admins
    await _notify_all_admins(
        type="issue",
        title=f"New Support Ticket: {title[:50]}",
        message=f"Ticket {ticket_id} — Category: {category} | Priority: {priority}",
        reference_id=ticket_id,
        triggered_by=ticket_doc.get("user_id", ticket_doc.get("vendor_id", "")),
        priority="high",
    )


async def notify_promotion_request(request_doc: dict):
    """Trigger notifications when a vendor requests a promotion."""
    vendor_name = request_doc.get("vendor_name", "Vendor")
    req_type = request_doc.get("request_type", "").replace("_", " ").title()
    cost = request_doc.get("estimated_cost", 0)

    await _notify_all_admins(
        type="promotion",
        title=f"Promotion Request: {req_type}",
        message=f"{vendor_name} requested {req_type} — Est. cost: {cost} credits",
        reference_id=request_doc.get("request_id", ""),
        triggered_by=request_doc.get("vendor_id", ""),
        priority="medium",
    )


async def notify_credits_deducted(vendor_id: str, amount: int, reason: str, balance: int):
    """Notify vendor when credits are deducted."""
    await create_notification(
        user_id=vendor_id,
        user_role="vendor",
        type="credit",
        title=f"{amount} Credits Deducted",
        message=f"Reason: {reason}. Remaining balance: {balance} credits",
        reference_id="",
        triggered_by="system",
        priority="medium",
    )


async def notify_credits_added(vendor_id: str, amount: int, reason: str, balance: int):
    """Notify vendor when credits are added."""
    await create_notification(
        user_id=vendor_id,
        user_role="vendor",
        type="credit",
        title=f"{amount} Credits Added!",
        message=f"Reason: {reason}. New balance: {balance} credits",
        reference_id="",
        triggered_by="system",
        priority="medium",
    )


async def notify_kyc_status(vendor_id: str, status: str, reason: str = ""):
    """Notify vendor about KYC status change."""
    if status == "approved":
        title = "KYC Approved!"
        message = "Your documents have been verified. All features are now unlocked."
        priority = "high"
    else:
        title = "KYC Documents Rejected"
        message = f"Reason: {reason}. Please re-upload the rejected documents."
        priority = "high"

    await create_notification(
        user_id=vendor_id,
        user_role="vendor",
        type="kyc",
        title=title,
        message=message,
        triggered_by="system",
        priority=priority,
    )


async def _notify_all_admins(type: str, title: str, message: str, reference_id: str = "", triggered_by: str = "", priority: str = "medium"):
    """Send notification to all connected admin users."""
    # Get admin user IDs from DB
    admins = await db.admin_users.find({}, {"_id": 0, "admin_id": 1}).to_list(50)
    for admin in admins:
        aid = admin.get("admin_id")
        if aid:
            await create_notification(
                user_id=aid,
                user_role="admin",
                type=type,
                title=title,
                message=message,
                reference_id=reference_id,
                triggered_by=triggered_by,
                priority=priority,
            )
