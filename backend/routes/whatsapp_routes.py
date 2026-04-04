from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import logging
import json
import hmac
import hashlib
import os

from config import db
from auth import get_admin_user, check_permission, generate_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

INTERAKT_WEBHOOK_SECRET = os.environ.get("INTERAKT_WEBHOOK_SECRET", "")


# ============== PYDANTIC MODELS ==============

class WhatsAppSettingsUpdate(BaseModel):
    order_placed_enabled: Optional[bool] = None
    order_confirmed_enabled: Optional[bool] = None
    order_shipped_enabled: Optional[bool] = None
    order_delivered_enabled: Optional[bool] = None
    cod_confirmation_enabled: Optional[bool] = None
    abandoned_cart_enabled: Optional[bool] = None
    abandoned_cart_delay_minutes: Optional[int] = None
    order_placed_template: Optional[str] = None
    order_confirmed_template: Optional[str] = None
    order_shipped_template: Optional[str] = None
    order_delivered_template: Optional[str] = None
    cod_confirmation_template: Optional[str] = None
    abandoned_cart_template: Optional[str] = None


class BroadcastRequest(BaseModel):
    template_name: str
    body_values: Optional[List[str]] = None
    target_segment: str = "all"  # all, recent_buyers, cod_customers, cart_abandoners
    phone_numbers: Optional[List[str]] = None  # For custom segment


class TestMessageRequest(BaseModel):
    phone: str
    template_name: str = ""
    event_name: str = "test_message"
    body_values: Optional[List[str]] = None


# ============== SETTINGS ==============

DEFAULT_WA_SETTINGS = {
    "setting_id": "whatsapp_config",
    "order_placed_enabled": True,
    "order_confirmed_enabled": True,
    "order_shipped_enabled": True,
    "order_delivered_enabled": True,
    "cod_confirmation_enabled": True,
    "abandoned_cart_enabled": True,
    "abandoned_cart_delay_minutes": 30,
    "order_placed_template": "",
    "order_confirmed_template": "",
    "order_shipped_template": "",
    "order_delivered_template": "",
    "cod_confirmation_template": "",
    "abandoned_cart_template": "",
}


async def get_wa_settings() -> Dict:
    """Get WhatsApp notification settings."""
    settings = await db.whatsapp_settings.find_one({"setting_id": "whatsapp_config"}, {"_id": 0})
    if not settings:
        settings = {**DEFAULT_WA_SETTINGS, "created_at": datetime.now(timezone.utc).isoformat()}
        await db.whatsapp_settings.insert_one(settings)
        settings.pop("_id", None)
    return settings


@router.get("/settings")
async def get_whatsapp_settings(admin: Dict = Depends(get_admin_user)):
    return await get_wa_settings()


@router.put("/settings")
async def update_whatsapp_settings(body: WhatsAppSettingsUpdate, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "orders", "update"):
        raise HTTPException(status_code=403, detail="Permission denied")

    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = admin["admin_id"]

    await db.whatsapp_settings.update_one(
        {"setting_id": "whatsapp_config"},
        {"$set": update_data},
        upsert=True
    )
    return await get_wa_settings()


# ============== MESSAGE LOG ==============

@router.get("/messages")
async def get_message_log(
    admin: Dict = Depends(get_admin_user),
    skip: int = 0,
    limit: int = 50,
    msg_type: Optional[str] = None
):
    """Get WhatsApp message log with optional type filter."""
    query = {}
    if msg_type:
        query["message_type"] = msg_type

    messages = await db.whatsapp_messages.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    total = await db.whatsapp_messages.count_documents(query)

    return {"messages": messages, "total": total, "skip": skip, "limit": limit}


@router.get("/stats")
async def get_whatsapp_stats(admin: Dict = Depends(get_admin_user)):
    """Get WhatsApp messaging stats."""
    total_sent = await db.whatsapp_messages.count_documents({})
    total_delivered = await db.whatsapp_messages.count_documents({"delivery_status": "delivered"})
    total_read = await db.whatsapp_messages.count_documents({"delivery_status": "read"})
    total_failed = await db.whatsapp_messages.count_documents({"delivery_status": "failed"})

    # Stats by type
    pipeline = [
        {"$group": {
            "_id": "$message_type",
            "count": {"$sum": 1},
            "delivered": {"$sum": {"$cond": [{"$eq": ["$delivery_status", "delivered"]}, 1, 0]}},
            "read": {"$sum": {"$cond": [{"$eq": ["$delivery_status", "read"]}, 1, 0]}},
            "failed": {"$sum": {"$cond": [{"$eq": ["$delivery_status", "failed"]}, 1, 0]}},
        }}
    ]
    by_type = await db.whatsapp_messages.aggregate(pipeline).to_list(20)

    # Recent 7 days trend
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_count = await db.whatsapp_messages.count_documents({"created_at": {"$gte": seven_days_ago}})

    return {
        "total_sent": total_sent,
        "total_delivered": total_delivered,
        "total_read": total_read,
        "total_failed": total_failed,
        "delivery_rate": round((total_delivered / max(total_sent, 1)) * 100, 1),
        "read_rate": round((total_read / max(total_sent, 1)) * 100, 1),
        "by_type": {item["_id"]: item for item in by_type},
        "last_7_days": recent_count
    }


# ============== SEND TEST MESSAGE ==============

@router.post("/test")
async def send_test_message(body: TestMessageRequest, admin: Dict = Depends(get_admin_user)):
    """Send a test WhatsApp message (for verifying integration)."""
    from services.interakt_service import track_event, send_template_message, validate_indian_phone

    if not validate_indian_phone(body.phone):
        raise HTTPException(status_code=400, detail="Invalid Indian phone number")

    if body.template_name:
        result = send_template_message(
            phone=body.phone,
            template_name=body.template_name,
            body_values=body.body_values
        )
    else:
        result = track_event(
            phone=body.phone,
            event_name=body.event_name,
            traits={"test": True, "sent_by": admin.get("name", "Admin")}
        )

    # Log test message
    await db.whatsapp_messages.insert_one({
        "message_id": generate_id("wmsg_"),
        "phone": body.phone,
        "message_type": "test",
        "template_name": body.template_name or body.event_name,
        "delivery_status": "sent" if result.get("success") else "failed",
        "api_response": result,
        "sent_by": admin["admin_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"success": result.get("success", False), "result": result}


# ============== BROADCAST ==============

@router.post("/broadcast")
async def send_broadcast(body: BroadcastRequest, background_tasks: BackgroundTasks, admin: Dict = Depends(get_admin_user)):
    """Send broadcast WhatsApp messages to a segment."""
    if not check_permission(admin, "orders", "update"):
        raise HTTPException(status_code=403, detail="Permission denied")

    # Determine recipients
    phones = []

    if body.phone_numbers:
        phones = body.phone_numbers
    else:
        # Build query based on segment
        query = {}
        if body.target_segment == "recent_buyers":
            thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
            orders = await db.orders.find(
                {"created_at": {"$gte": thirty_days_ago}},
                {"_id": 0, "shipping_address.phone": 1}
            ).to_list(1000)
            phones = list(set(
                o.get("shipping_address", {}).get("phone", "")
                for o in orders if o.get("shipping_address", {}).get("phone")
            ))
        elif body.target_segment == "cod_customers":
            orders = await db.orders.find(
                {"payment_method": "cod"},
                {"_id": 0, "shipping_address.phone": 1}
            ).to_list(1000)
            phones = list(set(
                o.get("shipping_address", {}).get("phone", "")
                for o in orders if o.get("shipping_address", {}).get("phone")
            ))
        elif body.target_segment == "all":
            users = await db.users.find(
                {"phone": {"$ne": None, "$exists": True}},
                {"_id": 0, "phone": 1}
            ).to_list(5000)
            phones = [u["phone"] for u in users if u.get("phone")]
            # Also get phones from orders
            orders = await db.orders.find(
                {},
                {"_id": 0, "shipping_address.phone": 1}
            ).to_list(5000)
            order_phones = [
                o.get("shipping_address", {}).get("phone", "")
                for o in orders if o.get("shipping_address", {}).get("phone")
            ]
            phones = list(set(phones + order_phones))

    if not phones:
        raise HTTPException(status_code=400, detail="No recipients found for this segment")

    # Create campaign record
    campaign_id = generate_id("wcamp_")
    campaign = {
        "campaign_id": campaign_id,
        "template_name": body.template_name,
        "body_values": body.body_values,
        "target_segment": body.target_segment,
        "total_recipients": len(phones),
        "sent_count": 0,
        "failed_count": 0,
        "status": "running",
        "created_by": admin["admin_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.whatsapp_campaigns.insert_one(campaign)

    # Process in background
    background_tasks.add_task(process_broadcast, campaign_id, phones, body.template_name, body.body_values)

    return {
        "campaign_id": campaign_id,
        "total_recipients": len(phones),
        "status": "running",
        "message": f"Broadcasting to {len(phones)} recipients"
    }


async def process_broadcast(campaign_id: str, phones: List[str], template_name: str, body_values: Optional[List[str]]):
    """Process broadcast in background."""
    from services.interakt_service import send_broadcast_message
    import asyncio

    sent = 0
    failed = 0

    for phone in phones:
        result = send_broadcast_message(
            phone=phone,
            template_name=template_name,
            body_values=body_values,
            campaign_id=campaign_id
        )

        status = "sent" if result.get("success") else "failed"
        if status == "sent":
            sent += 1
        else:
            failed += 1

        # Log each message
        await db.whatsapp_messages.insert_one({
            "message_id": generate_id("wmsg_"),
            "phone": phone,
            "message_type": "broadcast",
            "template_name": template_name,
            "campaign_id": campaign_id,
            "delivery_status": status,
            "api_response": result,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    # Update campaign stats
    await db.whatsapp_campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {
            "sent_count": sent,
            "failed_count": failed,
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    logger.info(f"Broadcast {campaign_id} complete: {sent} sent, {failed} failed")


@router.get("/campaigns")
async def get_campaigns(admin: Dict = Depends(get_admin_user), skip: int = 0, limit: int = 20):
    """Get broadcast campaign history."""
    campaigns = await db.whatsapp_campaigns.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.whatsapp_campaigns.count_documents({})
    return {"campaigns": campaigns, "total": total}


# ============== WEBHOOK (receives Interakt callbacks) ==============

@router.post("/webhook")
async def interakt_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Receive webhooks from Interakt for message status updates and customer replies.
    """
    body = await request.body()

    # Verify signature if secret is configured
    if INTERAKT_WEBHOOK_SECRET:
        signature = request.headers.get("Interakt-Signature", "")
        if signature:
            sig = signature.replace("sha256=", "")
            expected = hmac.new(
                INTERAKT_WEBHOOK_SECRET.encode(), body, hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(sig, expected):
                logger.warning("Invalid webhook signature")
                raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    webhook_type = payload.get("type", "unknown")
    data = payload.get("data", {})
    customer = data.get("customer", {})
    message = data.get("message", {})

    logger.info(f"Interakt webhook: type={webhook_type}, phone={customer.get('channel_phone_number')}")

    # Store webhook event
    await db.whatsapp_webhooks.insert_one({
        "webhook_id": generate_id("whook_"),
        "type": webhook_type,
        "phone": customer.get("channel_phone_number", ""),
        "message_id": message.get("id", ""),
        "payload": payload,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Process based on type
    if webhook_type == "message_received":
        background_tasks.add_task(handle_customer_reply, payload)
    elif webhook_type in ("message_api_delivered", "message_api_read", "message_api_failed"):
        background_tasks.add_task(update_message_status, payload)

    return {"status": "received"}


async def handle_customer_reply(payload: Dict):
    """Handle incoming customer WhatsApp message — COD confirmation + auto-ticket creation."""
    data = payload.get("data", {})
    customer = data.get("customer", {})
    message = data.get("message", {})

    phone = customer.get("channel_phone_number", "")
    raw_text = (message.get("message", "") or "").strip()
    text = raw_text.lower()
    button_payload = message.get("meta_data", {}).get("button_payload", "")

    logger.info(f"Customer reply from {phone}: text='{text}', button='{button_payload}'")

    # Check if this is a COD confirmation reply
    is_confirm = text in ("yes", "confirm", "y", "1") or button_payload == "yes_confirm"
    is_cancel = text in ("no", "cancel", "n", "0") or button_payload == "no_cancel"

    if is_confirm or is_cancel:
        # Find the most recent pending COD order for this phone
        order = await db.orders.find_one(
            {
                "shipping_address.phone": {"$regex": phone[-10:]},
                "payment_method": "cod",
                "status": {"$in": ["pending", "cod_pending_confirmation"]}
            },
            {"_id": 0},
            sort=[("created_at", -1)]
        )

        if order:
            new_status = "cod_confirmed" if is_confirm else "cancelled"
            await db.orders.update_one(
                {"order_id": order["order_id"]},
                {"$set": {
                    "status": new_status,
                    "cod_whatsapp_confirmed": is_confirm,
                    "cod_confirmation_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"COD order {order['order_id']} {'confirmed' if is_confirm else 'cancelled'} via WhatsApp by {phone}")

            # Log event
            from routes.order_routes import log_order_event
            await log_order_event(
                order["order_id"],
                "cod_whatsapp_response",
                f"COD {'Confirmed' if is_confirm else 'Cancelled'} via WhatsApp",
                f"Customer responded '{text or button_payload}' via WhatsApp",
                actor_type="customer"
            )
            return  # COD handled, don't create a ticket

    # ---- AUTO-TICKET CREATION FROM WHATSAPP MESSAGES ----
    # Skip very short or non-support messages
    if len(raw_text) < 3:
        return

    # Parse context from message text
    ticket_category = "other"
    linked_order_id = None
    title = "WhatsApp Support Request"

    import re as _re
    # Detect order-related messages
    order_match = _re.search(r'order\s*#?\s*([A-Za-z0-9_]+)', raw_text, _re.IGNORECASE)
    if order_match:
        linked_order_id = order_match.group(1)
        ticket_category = "order"
        title = f"Order Issue (#{linked_order_id})"
    elif any(w in text for w in ["order", "delivery", "shipping", "track"]):
        ticket_category = "order"
        title = "Order / Delivery Query"
    elif any(w in text for w in ["refund", "return", "money back"]):
        ticket_category = "refund"
        title = "Refund / Return Request"
    elif any(w in text for w in ["payment", "pay", "transaction", "upi"]):
        ticket_category = "payment"
        title = "Payment Issue"
    elif any(w in text for w in ["product", "item", "interested", "price", "stock"]):
        ticket_category = "other"
        title = "Product Inquiry"
    elif any(w in text for w in ["support", "help", "ticket", "issue", "problem"]):
        ticket_category = "other"
        title = "General Support Request"
    elif any(w in text for w in ["reseller", "resell", "partner"]):
        ticket_category = "vendor_collaboration"
        title = "Reseller / Partnership Inquiry"

    # Try to find user by phone
    clean_phone = phone[-10:] if phone else ""
    user = None
    if clean_phone:
        user = await db.users.find_one(
            {"phone": {"$regex": clean_phone}},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1}
        )

    # Check for recent duplicate (same phone, within 5 mins)
    recent_ticket = await db.tickets.find_one(
        {
            "source": "whatsapp",
            "source_phone": phone,
            "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()}
        },
        sort=[("created_at", -1)]
    )
    if recent_ticket:
        # Append message as reply to existing ticket instead of creating a new one
        reply = {
            "reply_id": generate_id("rpl_"),
            "sender_id": user["user_id"] if user else f"wa_{clean_phone}",
            "sender_type": "user",
            "sender_name": user.get("name", f"WhatsApp User ({phone})") if user else f"WhatsApp User ({phone})",
            "message": raw_text,
            "attachments": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.tickets.update_one(
            {"ticket_id": recent_ticket["ticket_id"]},
            {"$push": {"replies": reply}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        logger.info(f"Appended WhatsApp message to existing ticket {recent_ticket['ticket_id']}")
        return

    # Create new ticket
    ticket = {
        "ticket_id": generate_id("tkt_"),
        "user_id": user["user_id"] if user else f"wa_{clean_phone}",
        "user_type": "customer",
        "user_name": user.get("name", "WhatsApp User") if user else "WhatsApp User",
        "user_email": user.get("email", "") if user else "",
        "user_phone": phone,
        "source": "whatsapp",
        "source_phone": phone,
        "title": title,
        "description": raw_text,
        "category": ticket_category,
        "priority": "medium",
        "status": "open",
        "assigned_to": None,
        "assigned_name": None,
        "attachments": [],
        "linked_order_id": linked_order_id,
        "sla_deadline": (datetime.now(timezone.utc) + timedelta(hours=12)).isoformat(),
        "escalated": False,
        "escalated_at": None,
        "replies": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
        "closed_at": None,
    }
    await db.tickets.insert_one(ticket)
    ticket.pop("_id", None)
    logger.info(f"Auto-created WhatsApp ticket {ticket['ticket_id']} from {phone}: {title}")

    # Send auto-reply via Interakt
    try:
        from services.interakt_service import send_template_message, validate_indian_phone, parse_phone
        if validate_indian_phone(phone):
            country_code, number = parse_phone(phone)
            # Send a simple notification via Interakt track event
            from services.interakt_service import track_event
            track_event(
                phone=phone,
                event="support_ticket_created",
                traits={
                    "ticket_id": ticket["ticket_id"],
                    "name": ticket["user_name"],
                    "message": f"Your support request has been received (Ticket: {ticket['ticket_id']}). Our team will contact you shortly."
                }
            )
    except Exception as e:
        logger.error(f"Failed to send auto-reply for ticket {ticket['ticket_id']}: {e}")

async def update_message_status(payload: Dict):
    """Update delivery status of sent messages."""
    data = payload.get("data", {})
    message = data.get("message", {})
    webhook_type = payload.get("type", "")

    status_map = {
        "message_api_delivered": "delivered",
        "message_api_read": "read",
        "message_api_failed": "failed",
    }
    new_status = status_map.get(webhook_type, "unknown")

    # Update in our message log (by matching phone and recent timestamp)
    phone = data.get("customer", {}).get("channel_phone_number", "")
    if phone:
        await db.whatsapp_messages.update_many(
            {"phone": {"$regex": phone[-10:]}, "delivery_status": {"$in": ["sent", "delivered"]}},
            {"$set": {"delivery_status": new_status, "status_updated_at": datetime.now(timezone.utc).isoformat()}}
        )


# ============== ABANDONED CART ==============

@router.post("/check-abandoned-carts")
async def trigger_abandoned_cart_check(background_tasks: BackgroundTasks, admin: Dict = Depends(get_admin_user)):
    """Manually trigger abandoned cart recovery check."""
    if not check_permission(admin, "orders", "update"):
        raise HTTPException(status_code=403, detail="Permission denied")

    background_tasks.add_task(process_abandoned_carts)
    return {"message": "Abandoned cart check triggered"}


async def process_abandoned_carts():
    """Find and notify abandoned carts."""
    from services.interakt_service import notify_abandoned_cart, validate_indian_phone

    settings = await get_wa_settings()
    if not settings.get("abandoned_cart_enabled", True):
        return

    delay_minutes = settings.get("abandoned_cart_delay_minutes", 30)
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=delay_minutes)).isoformat()

    # Find carts with items that haven't been converted to orders
    carts = await db.carts.find(
        {
            "items": {"$ne": []},
            "updated_at": {"$lt": cutoff}
        },
        {"_id": 0}
    ).to_list(500)

    notified = 0
    for cart in carts:
        user_id = cart.get("user_id")
        if not user_id:
            continue

        # Check if already notified recently
        recent_notif = await db.whatsapp_messages.find_one({
            "message_type": "abandoned_cart",
            "related_user_id": user_id,
            "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()}
        })
        if recent_notif:
            continue

        # Get user phone
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "phone": 1, "name": 1})
        if not user or not user.get("phone"):
            continue

        phone = user["phone"]
        if not validate_indian_phone(phone):
            continue

        # Get product names
        product_names = []
        cart_total = 0
        for item in cart.get("items", [])[:3]:
            product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0, "name": 1, "price": 1})
            if product:
                product_names.append(product["name"])
                cart_total += product["price"] * item.get("quantity", 1)

        if not product_names:
            continue

        result = notify_abandoned_cart(
            phone=phone,
            customer_name=user.get("name", "Customer"),
            cart_total=cart_total,
            product_names=", ".join(product_names)
        )

        await db.whatsapp_messages.insert_one({
            "message_id": generate_id("wmsg_"),
            "phone": phone,
            "message_type": "abandoned_cart",
            "related_user_id": user_id,
            "delivery_status": "sent" if result.get("success") else "failed",
            "api_response": result,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        notified += 1

    logger.info(f"Abandoned cart check: {notified} notifications sent out of {len(carts)} abandoned carts")
