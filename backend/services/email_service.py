"""
Email Notification Service — Sends branded order emails to Admin, Vendor, Reseller.
Uses Resend API with retry mechanism and DB logging.
"""

import os
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import resend

from config import db
from auth import generate_id

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "paramjeetpigma@gmail.com")
MAX_RETRIES = 3

# Role-based sender emails
SENDERS = {
    "orders": os.environ.get("EMAIL_ORDERS", "orders@thepigma.com"),
    "support": os.environ.get("EMAIL_SUPPORT", "support@thepigma.com"),
    "accounts": os.environ.get("EMAIL_ACCOUNTS", "accounts@thepigma.com"),
    "noreply": os.environ.get("EMAIL_NOREPLY", "noreply@thepigma.com"),
}

def get_sender(category: str = "orders") -> str:
    """Get the appropriate sender email with display name."""
    names = {
        "orders": "Pigma Orders",
        "support": "Pigma Support",
        "accounts": "Pigma Accounts",
        "noreply": "Pigma",
    }
    email = SENDERS.get(category, SENDERS["noreply"])
    name = names.get(category, "Pigma")
    return f"{name} <{email}>"

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info("Resend email service initialized")
else:
    logger.warning("RESEND_API_KEY not set — emails will be logged but not sent")


# ─── Email Templates ───

def _base_wrapper(content: str, preheader: str = "") -> str:
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>*{{margin:0;padding:0;box-sizing:border-box}}body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#e5e5e5}}</style>
</head><body style="background:#0a0a0a;padding:0;margin:0;">
<span style="display:none!important;font-size:0;line-height:0;max-height:0;overflow:hidden">{preheader}</span>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 8px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#171717;border-radius:12px;border:1px solid #262626;overflow:hidden;max-width:100%">
<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#C9A050,#a07828);padding:24px 32px;text-align:center">
<h1 style="color:#000;font-size:22px;font-weight:800;letter-spacing:2px;margin:0">PIGMA</h1>
<p style="color:#000;font-size:11px;opacity:0.7;margin-top:4px;letter-spacing:1px">PREMIUM E-COMMERCE</p>
</td></tr>
<!-- Body -->
<tr><td style="padding:28px 28px 16px">{content}</td></tr>
<!-- Footer -->
<tr><td style="padding:16px 28px 24px;border-top:1px solid #262626">
<p style="font-size:11px;color:#525252;text-align:center;line-height:1.6">
This is an automated notification from Pigma. Please do not reply to this email.<br>
&copy; {datetime.now().year} Pigma — Premium Multi-Vendor Marketplace
</p>
</td></tr>
</table></td></tr></table></body></html>"""


def _kv_row(label: str, value: str, highlight: bool = False) -> str:
    color = "#C9A050" if highlight else "#e5e5e5"
    weight = "700" if highlight else "400"
    return f"""<tr><td style="padding:6px 12px;font-size:13px;color:#a3a3a3;border-bottom:1px solid #262626;width:40%">{label}</td>
<td style="padding:6px 12px;font-size:13px;color:{color};font-weight:{weight};border-bottom:1px solid #262626">{value}</td></tr>"""


def _items_table(items: list) -> str:
    rows = ""
    for item in items:
        name = item.get("product_name", "Product")[:40]
        qty = item.get("quantity", 1)
        price = item.get("item_total", 0)
        rows += f"""<tr>
<td style="padding:8px 12px;font-size:13px;color:#e5e5e5;border-bottom:1px solid #1f1f1f">{name}</td>
<td style="padding:8px 12px;font-size:13px;color:#a3a3a3;text-align:center;border-bottom:1px solid #1f1f1f">{qty}</td>
<td style="padding:8px 12px;font-size:13px;color:#C9A050;text-align:right;border-bottom:1px solid #1f1f1f">Rs.{price:,.0f}</td>
</tr>"""
    return f"""<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border-radius:8px;overflow:hidden;margin:12px 0">
<tr style="background:#1a1a1a"><th style="padding:8px 12px;font-size:11px;color:#737373;text-align:left;text-transform:uppercase;letter-spacing:1px">Product</th>
<th style="padding:8px 12px;font-size:11px;color:#737373;text-align:center;text-transform:uppercase;letter-spacing:1px">Qty</th>
<th style="padding:8px 12px;font-size:11px;color:#737373;text-align:right;text-transform:uppercase;letter-spacing:1px">Amount</th></tr>
{rows}</table>"""


# ─── Admin Email Template ───

def build_admin_email(order: dict) -> str:
    addr = order.get("shipping_address", {})
    items = order.get("items", [])
    vendor_name = order.get("vendor_name", "N/A")
    vendor_id = order.get("vendor_id", "N/A")
    payment = order.get("payment_method", "prepaid").upper()
    pay_status = order.get("payment_status", "pending").upper()
    total = order.get("total", 0)
    platform_comm = order.get("platform_commission", 0)
    influencer_comm = order.get("influencer_commission", 0)
    referral_code = order.get("referral_code", "")
    reseller_name = ""
    if order.get("affiliate_id"):
        reseller_name = order.get("affiliate_name", order.get("affiliate_id", ""))

    content = f"""
<h2 style="font-size:18px;color:#C9A050;margin-bottom:4px">New Order Received</h2>
<p style="font-size:13px;color:#737373;margin-bottom:20px">A new order has been placed on your platform</p>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border-radius:8px;overflow:hidden;margin-bottom:16px">
{_kv_row("Order ID", order.get("order_id", "N/A"), True)}
{_kv_row("Order Date", datetime.fromisoformat(order.get("created_at", datetime.now(timezone.utc).isoformat())).strftime("%d %b %Y, %I:%M %p"))}
{_kv_row("Total Value", f"Rs.{total:,.0f}", True)}
{_kv_row("Payment", f"{payment} — {pay_status}")}
{_kv_row("Vendor", f"{vendor_name} ({vendor_id})")}
{_kv_row("Platform Commission", f"Rs.{platform_comm:,.0f}")}
{f'{_kv_row("Reseller", reseller_name)}' if reseller_name else ''}
{f'{_kv_row("Influencer Commission", f"Rs.{influencer_comm:,.0f}")}' if influencer_comm else ''}
{f'{_kv_row("Referral Code", referral_code)}' if referral_code else ''}
</table>

<h3 style="font-size:14px;color:#e5e5e5;margin-bottom:8px">Products Ordered</h3>
{_items_table(items)}

<h3 style="font-size:14px;color:#e5e5e5;margin:16px 0 8px">Customer Details</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border-radius:8px;overflow:hidden">
{_kv_row("Name", addr.get("name", "N/A"))}
{_kv_row("Phone", addr.get("phone", "N/A"))}
{_kv_row("Email", addr.get("email", order.get("customer", {}).get("email", "N/A")))}
{_kv_row("Address", f"{addr.get('address', '')}, {addr.get('city', '')}, {addr.get('state', '')} - {addr.get('pincode', '')}")}
</table>
"""
    return _base_wrapper(content, f"New order #{order.get('order_id', '')[-6:]} — Rs.{total:,.0f}")


# ─── Vendor Email Template ───

def build_vendor_email(order: dict) -> str:
    addr = order.get("shipping_address", {})
    items = order.get("items", [])
    total = order.get("total", 0)
    vendor_amount = order.get("vendor_amount", 0)
    payment = order.get("payment_method", "prepaid").upper()
    pay_status = order.get("payment_status", "pending").upper()
    referral = order.get("referral_code", "")
    sold_via = "Direct"
    if order.get("affiliate_id"):
        sold_via = f"Reseller: {order.get('affiliate_name', order.get('affiliate_id', 'N/A'))}"
    elif order.get("influencer_id"):
        sold_via = f"Influencer: {order.get('influencer_id', 'N/A')}"

    content = f"""
<h2 style="font-size:18px;color:#C9A050;margin-bottom:4px">You Got a Sale!</h2>
<p style="font-size:13px;color:#737373;margin-bottom:20px">A customer just purchased your product</p>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border-radius:8px;overflow:hidden;margin-bottom:16px">
{_kv_row("Order ID", order.get("order_id", "N/A"), True)}
{_kv_row("Order Date", datetime.fromisoformat(order.get("created_at", datetime.now(timezone.utc).isoformat())).strftime("%d %b %Y, %I:%M %p"))}
{_kv_row("Total Sale", f"Rs.{total:,.0f}", True)}
{_kv_row("Your Earnings", f"Rs.{vendor_amount:,.0f}", True)}
{_kv_row("Payment", f"{payment} — {pay_status}")}
{_kv_row("Sold Via", sold_via)}
</table>

<h3 style="font-size:14px;color:#e5e5e5;margin-bottom:8px">Products Sold</h3>
{_items_table(items)}

<h3 style="font-size:14px;color:#e5e5e5;margin:16px 0 8px">Customer Details</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border-radius:8px;overflow:hidden">
{_kv_row("Name", addr.get("name", "N/A"))}
{_kv_row("Phone", addr.get("phone", "N/A"))}
{_kv_row("Delivery Address", f"{addr.get('address', '')}, {addr.get('city', '')}, {addr.get('state', '')} - {addr.get('pincode', '')}")}
</table>
"""
    return _base_wrapper(content, f"New sale! Order #{order.get('order_id', '')[-6:]} — Rs.{total:,.0f}")


# ─── Reseller Email Template ───

def build_reseller_email(order: dict, reseller: dict) -> str:
    items = order.get("items", [])
    total = order.get("total", 0)
    vendor_name = order.get("vendor_name", "N/A")
    commission_rate = reseller.get("commission_rate", 0)
    margin = total * (commission_rate / 100) if commission_rate else 0

    content = f"""
<h2 style="font-size:18px;color:#C9A050;margin-bottom:4px">Commission Earned!</h2>
<p style="font-size:13px;color:#737373;margin-bottom:20px">A customer purchased through your referral link</p>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border-radius:8px;overflow:hidden;margin-bottom:16px">
{_kv_row("Order ID", order.get("order_id", "N/A"), True)}
{_kv_row("Order Value", f"Rs.{total:,.0f}")}
{_kv_row("Your Commission", f"Rs.{margin:,.0f} ({commission_rate}%)", True)}
{_kv_row("Vendor", vendor_name)}
{_kv_row("Payment Status", order.get("payment_status", "pending").upper())}
</table>

<h3 style="font-size:14px;color:#e5e5e5;margin-bottom:8px">Products</h3>
{_items_table(items)}
"""
    return _base_wrapper(content, f"You earned Rs.{margin:,.0f} commission on order #{order.get('order_id', '')[-6:]}")


# ─── Send Email (with retry + logging) ───

async def _send_email(to: str, subject: str, html: str, order_id: str = "", recipient_type: str = "admin", category: str = "orders") -> dict:
    """Send email via Resend with retry and DB logging."""
    sender = get_sender(category)
    log_entry = {
        "log_id": generate_id("eml_"),
        "order_id": order_id,
        "recipient_email": to,
        "recipient_type": recipient_type,
        "sender": sender,
        "subject": subject,
        "status": "pending",
        "attempts": 0,
        "resend_id": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if not RESEND_API_KEY:
        log_entry["status"] = "skipped"
        log_entry["error"] = "RESEND_API_KEY not configured"
        await db.email_logs.insert_one(log_entry)
        logger.warning(f"Email skipped (no API key): {to} — {subject}")
        return log_entry

    for attempt in range(1, MAX_RETRIES + 1):
        log_entry["attempts"] = attempt
        try:
            params = {
                "from": sender,
                "to": [to],
                "subject": subject,
                "html": html,
            }
            result = await asyncio.to_thread(resend.Emails.send, params)
            log_entry["status"] = "sent"
            log_entry["resend_id"] = result.get("id") if isinstance(result, dict) else str(result)
            log_entry["sent_at"] = datetime.now(timezone.utc).isoformat()
            await db.email_logs.insert_one(log_entry)
            logger.info(f"Email sent to {to} ({recipient_type}) for order {order_id}")
            return log_entry
        except Exception as e:
            log_entry["error"] = str(e)
            logger.error(f"Email attempt {attempt}/{MAX_RETRIES} failed for {to}: {e}")
            if attempt < MAX_RETRIES:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

    log_entry["status"] = "failed"
    await db.email_logs.insert_one(log_entry)
    logger.error(f"Email permanently failed for {to} after {MAX_RETRIES} attempts")
    return log_entry


# ─── Public API: Send order emails to all stakeholders ───

async def send_order_emails(order: dict):
    """Send order notification emails to Admin, Vendor, and Reseller (if applicable).
    Called as a fire-and-forget background task."""
    order_id = order.get("order_id", "")

    try:
        # 1. Admin email (from orders@)
        admin_html = build_admin_email(order)
        await _send_email(
            to=ADMIN_EMAIL,
            subject=f"New Order #{order_id[-6:]} — Rs.{order.get('total', 0):,.0f}",
            html=admin_html,
            order_id=order_id,
            recipient_type="admin",
            category="orders",
        )

        # 2. Vendor email (from orders@)
        vendor_id = order.get("vendor_id")
        if vendor_id:
            vendor = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0, "email": 1, "business_name": 1})
            if vendor and vendor.get("email"):
                vendor_html = build_vendor_email(order)
                await _send_email(
                    to=vendor["email"],
                    subject=f"New Sale! Order #{order_id[-6:]} — Rs.{order.get('total', 0):,.0f}",
                    html=vendor_html,
                    order_id=order_id,
                    recipient_type="vendor",
                    category="orders",
                )

        # 3. Reseller email (from accounts@)
        affiliate_id = order.get("affiliate_id")
        if affiliate_id:
            reseller = await db.affiliates.find_one({"affiliate_id": affiliate_id}, {"_id": 0})
            if reseller and reseller.get("email"):
                reseller_html = build_reseller_email(order, reseller)
                margin = order.get("total", 0) * (reseller.get("commission_rate", 0) / 100)
                await _send_email(
                    to=reseller["email"],
                    subject=f"Commission Earned! Rs.{margin:,.0f} on Order #{order_id[-6:]}",
                    html=reseller_html,
                    order_id=order_id,
                    recipient_type="reseller",
                    category="accounts",
                )

        # Also check influencer (from accounts@)
        influencer_id = order.get("influencer_id")
        if influencer_id:
            influencer = await db.influencers.find_one({"influencer_id": influencer_id}, {"_id": 0})
            if influencer and influencer.get("email"):
                reseller_data = {"commission_rate": influencer.get("commission_rate", 10)}
                inf_html = build_reseller_email(order, reseller_data)
                margin = order.get("total", 0) * (reseller_data["commission_rate"] / 100)
                await _send_email(
                    to=influencer["email"],
                    subject=f"Commission Earned! Rs.{margin:,.0f} on Order #{order_id[-6:]}",
                    html=inf_html,
                    order_id=order_id,
                    recipient_type="influencer",
                    category="accounts",
                )

    except Exception as e:
        logger.error(f"send_order_emails failed for {order_id}: {e}")
