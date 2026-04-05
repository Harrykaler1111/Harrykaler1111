import requests
import logging
import json
import re
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Interakt API Base URL and Key from env
import os
INTERAKT_API_KEY = os.environ.get("INTERAKT_API_KEY", "")
INTERAKT_API_BASE_URL = os.environ.get("INTERAKT_API_BASE_URL", "https://api.interakt.ai")


def _get_headers() -> Dict[str, str]:
    """Build auth headers. Interakt key is already Base64 encoded."""
    return {
        "Authorization": f"Basic {INTERAKT_API_KEY}",
        "Content-Type": "application/json"
    }


def validate_indian_phone(phone: str) -> bool:
    """Validate Indian phone number (10 digits starting with 6-9)."""
    clean = phone.replace(" ", "").replace("-", "")
    if clean.startswith("+91"):
        clean = clean[3:]
    elif clean.startswith("91") and len(clean) == 12:
        clean = clean[2:]
    return bool(re.match(r"^[6-9]\d{9}$", clean))


def parse_phone(phone: str) -> tuple:
    """Parse phone into (country_code, number). Returns ('+91', '9625992057')."""
    clean = phone.replace(" ", "").replace("-", "")
    if clean.startswith("+91"):
        return "+91", clean[3:]
    elif clean.startswith("91") and len(clean) == 12:
        return "+91", clean[2:]
    elif len(clean) == 10 and re.match(r"^[6-9]", clean):
        return "+91", clean
    return "+91", clean


def send_template_message(
    phone: str,
    template_name: str,
    language_code: str = "en",
    header_values: Optional[List[str]] = None,
    body_values: Optional[List[str]] = None,
    button_values: Optional[Dict[str, List[str]]] = None,
    callback_data: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send a WhatsApp template message via Interakt.
    Returns API response dict.
    """
    country_code, number = parse_phone(phone)

    payload = {
        "countryCode": country_code,
        "phoneNumber": number,
        "type": "Template",
        "template": {
            "name": template_name,
            "languageCode": language_code
        }
    }

    if header_values:
        payload["template"]["headerValues"] = header_values
    if body_values:
        payload["template"]["bodyValues"] = body_values
    if button_values:
        payload["template"]["buttonValues"] = button_values
    if callback_data:
        payload["callbackData"] = callback_data[:512]

    url = f"{INTERAKT_API_BASE_URL}/v1/public/message/"
    try:
        resp = requests.post(url, json=payload, headers=_get_headers(), timeout=15)
        result = resp.json()
        logger.info(f"Interakt send_template [{resp.status_code}]: {template_name} -> {phone}: {result}")
        return {"success": resp.status_code in (200, 201), "status_code": resp.status_code, "data": result}
    except Exception as e:
        logger.error(f"Interakt send_template error: {e}")
        return {"success": False, "error": str(e)}


def track_event(
    phone: str,
    event_name: str,
    traits: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Track a user event in Interakt (triggers automation workflows).
    Use this to trigger pre-configured automations in Interakt dashboard.
    """
    country_code, number = parse_phone(phone)

    payload = {
        "userId": number,
        "phoneNumber": number,
        "countryCode": country_code,
        "event": event_name,
        "traits": traits or {}
    }

    url = f"{INTERAKT_API_BASE_URL}/v1/public/track/events/"
    try:
        resp = requests.post(url, json=payload, headers=_get_headers(), timeout=15)
        result = resp.json()
        logger.info(f"Interakt track_event [{resp.status_code}]: {event_name} -> {phone}: {result}")
        return {"success": resp.status_code in (200, 201), "status_code": resp.status_code, "data": result}
    except Exception as e:
        logger.error(f"Interakt track_event error: {e}")
        return {"success": False, "error": str(e)}


def track_user(
    phone: str,
    traits: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Add/update a user in Interakt with traits and tags."""
    country_code, number = parse_phone(phone)

    payload = {
        "phoneNumber": number,
        "countryCode": country_code
    }
    if traits:
        payload["traits"] = traits
    if tags:
        payload["tags"] = tags

    url = f"{INTERAKT_API_BASE_URL}/v1/public/track/users/"
    try:
        resp = requests.post(url, json=payload, headers=_get_headers(), timeout=15)
        result = resp.json()
        logger.info(f"Interakt track_user [{resp.status_code}]: {phone}: {result}")
        return {"success": resp.status_code in (200, 201), "status_code": resp.status_code, "data": result}
    except Exception as e:
        logger.error(f"Interakt track_user error: {e}")
        return {"success": False, "error": str(e)}


# ============== HIGH-LEVEL NOTIFICATION FUNCTIONS ==============

def notify_order_placed(phone: str, order_id: str, customer_name: str, total: float, items_count: int, payment_method: str):
    """Send order placed notification + track event."""
    # Track event for Interakt automation
    event_result = track_event(phone, "order_placed", {
        "order_id": order_id,
        "customer_name": customer_name,
        "order_total": str(total),
        "items_count": str(items_count),
        "payment_method": payment_method,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return event_result


def notify_order_confirmed(phone: str, order_id: str, customer_name: str, total: float):
    """Send order confirmed notification."""
    return track_event(phone, "order_confirmed", {
        "order_id": order_id,
        "customer_name": customer_name,
        "order_total": str(total),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


def notify_order_shipped(phone: str, order_id: str, customer_name: str, tracking_id: str = "", courier_name: str = ""):
    """Send order shipped notification."""
    return track_event(phone, "order_shipped", {
        "order_id": order_id,
        "customer_name": customer_name,
        "tracking_id": tracking_id,
        "courier_name": courier_name,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


def notify_order_delivered(phone: str, order_id: str, customer_name: str, total: float):
    """Send order delivered notification."""
    return track_event(phone, "order_delivered", {
        "order_id": order_id,
        "customer_name": customer_name,
        "order_total": str(total),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


def notify_cod_confirmation(phone: str, order_id: str, customer_name: str, total: float):
    """Send COD order confirmation request."""
    return track_event(phone, "cod_confirmation_required", {
        "order_id": order_id,
        "customer_name": customer_name,
        "order_total": str(total),
        "payment_method": "cod",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


def notify_abandoned_cart(phone: str, customer_name: str, cart_total: float, product_names: str):
    """Send abandoned cart recovery message."""
    return track_event(phone, "cart_abandoned", {
        "customer_name": customer_name,
        "cart_total": str(cart_total),
        "product_names": product_names,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


def send_otp_via_whatsapp(phone: str, otp_code: str) -> Dict[str, Any]:
    """Send OTP to user via WhatsApp. Tries template first, then event tracking.
    
    For template approach: Create an approved template named 'otp_verification' in Interakt dashboard.
    For event approach: Create an automation triggered by 'otp_requested' event in Interakt dashboard
    with message body: 'Your Pigma verification code is {{otp_code}}. Do not share this code.'
    """
    # Attempt 1: Template message (requires approved template in Interakt)
    template_result = send_template_message(
        phone=phone,
        template_name="otp_verification",
        language_code="en",
        body_values=[otp_code]
    )
    if template_result.get("success"):
        logger.info(f"OTP sent via template to {phone}")
        return {"success": True, "method": "template"}

    # Attempt 2: Event tracking (triggers Interakt automation)
    event_result = track_event(phone, "otp_requested", {
        "otp_code": otp_code,
        "phone": phone,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    if event_result.get("success"):
        logger.info(f"OTP sent via event tracking to {phone}")
        return {"success": True, "method": "event"}

    logger.error(f"Failed to send OTP via any method to {phone}: template={template_result}, event={event_result}")
    return {"success": False, "template_error": template_result, "event_error": event_result}


def send_broadcast_message(
    phone: str,
    template_name: str,
    body_values: Optional[List[str]] = None,
    campaign_id: str = ""
) -> Dict[str, Any]:
    """Send a broadcast marketing message."""
    return send_template_message(
        phone=phone,
        template_name=template_name,
        body_values=body_values,
        callback_data=json.dumps({"campaign_id": campaign_id, "type": "broadcast"})[:512]
    )
