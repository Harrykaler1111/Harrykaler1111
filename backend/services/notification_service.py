"""
Notification Service — Creates notifications and pushes via WebSocket.
Central place to trigger notifications from any route.
"""

import logging
import asyncio
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
        if user_role == "user":
            # Normal buyer routes
            url_map = {"order": "/orders", "issue": "/support", "promotion": "/"}
            redirect_url = url_map.get(type, "/")
        elif user_role == "vendor":
            url_map = {"order": "/vendor/orders", "issue": "/vendor/support", "promotion": "/vendor/promotions", "kyc": "/vendor/kyc", "credit": "/vendor/wallet"}
            redirect_url = url_map.get(type, "/vendor")
        else:
            url_map = {"order": "/admin/orders", "issue": "/admin/returns", "promotion": "/admin/monetization", "kyc": "/admin/vendors", "credit": "/admin/monetization"}
            redirect_url = url_map.get(type, "/admin")

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

    # Determine priority (high-value orders get "critical")
    priority = "critical" if total >= 5000 else "high"

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
            priority=priority,
        )

    # Notify all admins
    await _notify_all_admins(
        type="order",
        title="New Order Placed",
        message=f"Order #{order_id[-6:]} — Rs.{total:,.0f} ({len(items)} items) from {order_doc.get('shipping_address', {}).get('name', 'Customer')}",
        reference_id=order_id,
        triggered_by=order_doc.get("user_id", ""),
        priority=priority,
    )

    # Send email notifications (fire-and-forget background)
    try:
        from services.email_service import send_order_emails
        await send_order_emails(order_doc)
    except Exception as e:
        logger.error(f"Email notification trigger failed for {order_id}: {e}")


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


# ═══════════════════════════════════════════════════
# User (buyer) facing notifications
# ═══════════════════════════════════════════════════

async def notify_user_order_placed(order_doc: dict):
    """Notify the buyer that their order is placed."""
    user_id = order_doc.get("user_id")
    if not user_id:
        return
    order_id = order_doc["order_id"]
    total = order_doc.get("total", 0)
    method = order_doc.get("payment_method", "prepaid").upper()

    await create_notification(
        user_id=user_id,
        user_role="user",
        type="order",
        title="Order Placed!",
        message=f"Order #{order_id[-6:]} — Rs.{total:,.0f} ({method}). We'll update you when it ships.",
        reference_id=order_id,
        redirect_url="/orders",
        triggered_by="system",
        priority="high",
    )


async def notify_user_order_update(order_doc: dict, new_status: str):
    """Notify buyer on order status change (confirmed, shipped, delivered, cancelled)."""
    user_id = order_doc.get("user_id")
    if not user_id:
        return
    order_id = order_doc["order_id"]

    status_msgs = {
        "confirmed": ("Order Confirmed", "Your order has been confirmed and is being processed."),
        "processing": ("Order Processing", "Your order is being prepared for shipment."),
        "shipped": ("Order Shipped!", f"Your order is on the way! Tracking: {order_doc.get('tracking_id', 'will be updated')}"),
        "delivered": ("Order Delivered", "Your order has been delivered. Enjoy your purchase!"),
        "cancelled": ("Order Cancelled", "Your order has been cancelled. Refund will be processed if applicable."),
        "payment_failed": ("Payment Failed", "Your payment could not be processed. Please retry or contact support."),
    }

    title, message = status_msgs.get(new_status, ("Order Update", f"Your order status has been updated to: {new_status}"))

    await create_notification(
        user_id=user_id,
        user_role="user",
        type="order",
        title=title,
        message=f"Order #{order_id[-6:]} — {message}",
        reference_id=order_id,
        redirect_url="/orders",
        triggered_by="system",
        priority="high" if new_status in ("shipped", "delivered", "cancelled") else "medium",
    )


async def notify_user_return_update(user_id: str, return_id: str, status: str, product_name: str = ""):
    """Notify buyer when their return request is updated."""
    if not user_id:
        return

    status_msgs = {
        "approved": ("Return Approved", f"Your return for {product_name} has been approved. Follow the return instructions."),
        "rejected": ("Return Rejected", f"Your return for {product_name} was not approved. Contact support for help."),
        "refund_processed": ("Refund Processed", f"Refund for {product_name} has been initiated. It may take 5-7 business days."),
        "pickup_scheduled": ("Return Pickup Scheduled", f"Pickup for {product_name} has been scheduled. Keep the item ready."),
    }

    title, message = status_msgs.get(status, ("Return Update", f"Your return request has been updated to: {status}"))

    await create_notification(
        user_id=user_id,
        user_role="user",
        type="issue",
        title=title,
        message=message,
        reference_id=return_id,
        redirect_url="/returns",
        triggered_by="system",
        priority="high",
    )


async def notify_user_support_reply(user_id: str, ticket_id: str, message_preview: str = ""):
    """Notify buyer when support team replies to their ticket."""
    if not user_id:
        return

    await create_notification(
        user_id=user_id,
        user_role="user",
        type="issue",
        title="Support Team Replied",
        message=f"Ticket #{ticket_id[-6:]}: {message_preview[:80]}",
        reference_id=ticket_id,
        redirect_url="/support",
        triggered_by="system",
        priority="medium",
    )


async def notify_user_promotion(user_id: str, title: str, message: str, redirect_url: str = "/"):
    """Notify a user about a promotion, flash sale, or special offer."""
    if not user_id:
        return

    await create_notification(
        user_id=user_id,
        user_role="user",
        type="promotion",
        title=title,
        message=message,
        redirect_url=redirect_url,
        triggered_by="system",
        priority="low",
    )
