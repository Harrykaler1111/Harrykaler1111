from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import hmac
import hashlib
import json
import logging

from config import db, razorpay_client, RAZORPAY_KEY_ID, RAZORPAY_WEBHOOK_SECRET
from auth import get_current_user, generate_id
import razorpay as razorpay_module

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payment", tags=["payment"])


class CreateRazorpayOrder(BaseModel):
    order_id: str  # Our internal order_id
    amount: int  # Amount in paise
    currency: str = "INR"


class VerifyPayment(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_id: str  # Our internal order_id


# ─── Create Razorpay Order ───

@router.post("/create-order")
async def create_razorpay_order(data: CreateRazorpayOrder, user: Dict = Depends(get_current_user)):
    """Create a Razorpay order for an existing Pigma order."""
    order = await db.orders.find_one(
        {"order_id": data.order_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Order is already paid")

    try:
        razorpay_order = razorpay_client.order.create({
            "amount": data.amount,
            "currency": data.currency,
            "receipt": data.order_id[:40],
            "payment_capture": 1,
            "notes": {
                "pigma_order_id": data.order_id,
                "user_id": user["user_id"]
            }
        })
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail="Payment gateway error. Please try again.")

    # Save razorpay_order_id to our order
    await db.orders.update_one(
        {"order_id": data.order_id},
        {"$set": {
            "razorpay_order_id": razorpay_order["id"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {
        "razorpay_order_id": razorpay_order["id"],
        "razorpay_key_id": RAZORPAY_KEY_ID,
        "amount": razorpay_order["amount"],
        "currency": razorpay_order["currency"],
        "order_id": data.order_id,
    }


# ─── Verify Payment Signature ───

@router.post("/verify")
async def verify_payment(data: VerifyPayment, user: Dict = Depends(get_current_user)):
    """Verify Razorpay payment signature and confirm the order."""
    order = await db.orders.find_one(
        {"order_id": data.order_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.get("payment_status") == "paid":
        return {"message": "Already paid", "status": "paid"}

    # Verify signature
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": data.razorpay_order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "razorpay_signature": data.razorpay_signature,
        })
    except razorpay_module.errors.SignatureVerificationError:
        logger.warning(f"Signature verification failed for order {data.order_id}")
        await db.orders.update_one(
            {"order_id": data.order_id},
            {"$set": {
                "payment_status": "failed",
                "status": "payment_failed",
                "razorpay_payment_id": data.razorpay_payment_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        raise HTTPException(status_code=400, detail="Payment verification failed. Signature mismatch.")
    except Exception as e:
        logger.error(f"Payment verification error: {e}")
        raise HTTPException(status_code=400, detail="Payment verification failed.")

    # Signature valid — confirm order
    await _confirm_order_payment(data.order_id, data.razorpay_payment_id, data.razorpay_order_id)

    return {"message": "Payment verified successfully", "status": "paid", "order_id": data.order_id}


# ─── Webhook Handler ───

@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """Handle Razorpay webhook events (payment.captured, payment.failed)."""
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # Verify webhook signature if secret is configured
    if RAZORPAY_WEBHOOK_SECRET:
        expected_sig = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            body,
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected_sig, signature):
            logger.warning("Webhook signature verification failed")
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = payload.get("event", "")
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})

    razorpay_order_id = payment_entity.get("order_id", "")
    razorpay_payment_id = payment_entity.get("id", "")
    notes = payment_entity.get("notes", {})
    pigma_order_id = notes.get("pigma_order_id", "")

    logger.info(f"Webhook received: event={event}, payment_id={razorpay_payment_id}, order_id={pigma_order_id}")

    if event == "payment.captured":
        if pigma_order_id:
            order = await db.orders.find_one({"order_id": pigma_order_id}, {"_id": 0})
            if order and order.get("payment_status") != "paid":
                await _confirm_order_payment(pigma_order_id, razorpay_payment_id, razorpay_order_id)
                logger.info(f"Webhook: Order {pigma_order_id} confirmed via payment.captured")
        elif razorpay_order_id:
            # Fallback: find by razorpay_order_id
            order = await db.orders.find_one({"razorpay_order_id": razorpay_order_id}, {"_id": 0})
            if order and order.get("payment_status") != "paid":
                await _confirm_order_payment(order["order_id"], razorpay_payment_id, razorpay_order_id)
                logger.info(f"Webhook: Order {order['order_id']} confirmed via razorpay_order_id fallback")

    elif event == "payment.failed":
        if pigma_order_id:
            await db.orders.update_one(
                {"order_id": pigma_order_id},
                {"$set": {
                    "payment_status": "failed",
                    "status": "payment_failed",
                    "razorpay_payment_id": razorpay_payment_id,
                    "failure_reason": payment_entity.get("error_description", "Payment failed"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"Webhook: Order {pigma_order_id} marked as failed")

    # Log webhook event
    await db.razorpay_webhooks.insert_one({
        "webhook_id": generate_id("wh_"),
        "event": event,
        "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": razorpay_payment_id,
        "pigma_order_id": pigma_order_id,
        "payload": payload,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"status": "ok"}


# ─── Shared: Confirm order payment ───

async def _confirm_order_payment(order_id: str, razorpay_payment_id: str, razorpay_order_id: str):
    """Shared logic to mark order as paid and process commissions."""
    from routes.order_routes import credit_influencer_commission, credit_vendor_wallet, record_platform_commission, log_order_event
    from config import DEFAULT_COMMISSION_RATE, PLATFORM_COMMISSION_RATE

    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        return

    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "payment_status": "paid",
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_order_id": razorpay_order_id,
            "status": "confirmed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    total = order["total"]
    actual_influencer_commission = 0.0
    actual_platform_commission = 0.0
    actual_vendor_amount = 0.0

    # Credit influencer commission
    if order.get("influencer_id"):
        influencer = await db.influencers.find_one({"influencer_id": order["influencer_id"]}, {"_id": 0})
        if influencer:
            commission_rate = influencer.get("commission_rate", DEFAULT_COMMISSION_RATE)
            actual_influencer_commission = await credit_influencer_commission(
                order["influencer_id"], order_id, total, commission_rate
            )

    # Credit affiliate commission
    if order.get("affiliate_id"):
        affiliate = await db.affiliates.find_one({"affiliate_id": order["affiliate_id"]}, {"_id": 0})
        if affiliate:
            commission = total * (affiliate["commission_rate"] / 100)
            await db.affiliates.update_one(
                {"affiliate_id": order["affiliate_id"]},
                {"$inc": {"total_earnings": commission, "total_conversions": 1}}
            )

    # Vendor commission split
    if order.get("vendor_id"):
        actual_platform_commission = total * (PLATFORM_COMMISSION_RATE / 100)
        actual_vendor_amount = total - actual_platform_commission - actual_influencer_commission

        await credit_vendor_wallet(order["vendor_id"], order_id, actual_vendor_amount)
        await record_platform_commission(order_id, actual_platform_commission, order["vendor_id"])

        for item in order.get("items", []):
            if item.get("vendor_id"):
                await db.vendor_products.update_one(
                    {"product_id": item["product_id"]},
                    {"$inc": {"total_sold": item["quantity"], "total_revenue": item["item_total"]}}
                )

        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {
                "platform_commission": round(actual_platform_commission, 2),
                "influencer_commission": round(actual_influencer_commission, 2),
                "vendor_amount": round(actual_vendor_amount, 2),
                "settlement_status": "settled"
            }}
        )

    # Sales tracking
    await db.sales_tracking.insert_one({
        "tracking_id": generate_id("track_"),
        "order_id": order_id,
        "total": total,
        "vendor_id": order.get("vendor_id"),
        "vendor_name": order.get("vendor_name"),
        "influencer_id": order.get("influencer_id"),
        "affiliate_id": order.get("affiliate_id"),
        "referral_code": order.get("referral_code"),
        "platform_commission": round(actual_platform_commission, 2),
        "influencer_commission": round(actual_influencer_commission, 2),
        "vendor_amount": round(actual_vendor_amount, 2),
        "is_vendor_sale": bool(order.get("vendor_id")),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Collaboration tracking
    if order.get("referral_code"):
        await db.collaboration_requests.update_one(
            {"referral_code": order["referral_code"], "status": "accepted"},
            {"$inc": {"sales_count": 1, "sales_revenue": total, "commission_earned": actual_influencer_commission}}
        )
        await db.vendor_influencer_links.update_one(
            {"referral_code": order["referral_code"]},
            {"$inc": {"sales_count": 1, "sales_revenue": total, "commission_earned": actual_influencer_commission}}
        )

    # Order timeline events
    await log_order_event(
        order_id, "payment_verified", "Payment Confirmed",
        f"Payment of Rs.{total:,.0f} verified via Razorpay",
        actor_type="system"
    )
    await log_order_event(
        order_id, "status_change", "Order Confirmed",
        "Your order has been confirmed and is being prepared",
        actor_type="system", meta={"old_status": "pending", "new_status": "confirmed"}
    )

    # Real-time notification
    try:
        from services.notification_service import notify_new_order, notify_user_order_placed
        await notify_new_order(order)
        await notify_user_order_placed(order)
    except Exception as e:
        logger.warning(f"Payment notification failed for {order_id}: {e}")


# ─── Vendor Credit: Create Razorpay Order ───

class VendorCreditOrder(BaseModel):
    amount_inr: int  # Amount in INR

@router.post("/vendor-credit/create-order")
async def create_vendor_credit_order(data: VendorCreditOrder, user: Dict = Depends(get_current_user)):
    """Create a Razorpay order for vendor credit purchase."""
    if data.amount_inr <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    try:
        razorpay_order = razorpay_client.order.create({
            "amount": data.amount_inr * 100,  # Convert to paise
            "currency": "INR",
            "receipt": f"credit_{generate_id('')}"[:40],
            "payment_capture": 1,
            "notes": {
                "type": "vendor_credit_purchase",
                "vendor_user_id": user["user_id"],
                "amount_inr": str(data.amount_inr)
            }
        })
    except Exception as e:
        logger.error(f"Razorpay order for credit purchase failed: {e}")
        raise HTTPException(status_code=500, detail="Payment gateway error. Please try again.")

    return {
        "razorpay_order_id": razorpay_order["id"],
        "razorpay_key_id": RAZORPAY_KEY_ID,
        "amount": razorpay_order["amount"],
        "currency": razorpay_order["currency"],
        "amount_inr": data.amount_inr,
    }


class VerifyVendorCreditPayment(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    amount_inr: int

@router.post("/vendor-credit/verify")
async def verify_vendor_credit_payment(data: VerifyVendorCreditPayment, user: Dict = Depends(get_current_user)):
    """Verify vendor credit payment and add credits."""
    # Verify signature
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": data.razorpay_order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "razorpay_signature": data.razorpay_signature,
        })
    except Exception as e:
        logger.warning(f"Vendor credit payment verification failed: {e}")
        raise HTTPException(status_code=400, detail="Payment verification failed.")

    # Get vendor from user
    vendor = await db.vendors.find_one({"email": user.get("email")}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    vendor_id = vendor["vendor_id"]

    # Calculate credits
    pricing = await db.platform_pricing.find_one({"key": "vendor_monetization"}, {"_id": 0})
    rate = 1
    if pricing and pricing.get("values", {}).get("credit_rate_inr"):
        rate = pricing["values"]["credit_rate_inr"]
    credits = int(data.amount_inr / rate)

    # Add credits
    txn = {
        "txn_id": generate_id("txn_"),
        "vendor_id": vendor_id,
        "type": "purchase",
        "amount_inr": data.amount_inr,
        "credits": credits,
        "rate": rate,
        "payment_id": data.razorpay_payment_id,
        "razorpay_order_id": data.razorpay_order_id,
        "status": "success",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.credit_transactions.insert_one(txn)

    await db.vendor_wallets.update_one(
        {"vendor_id": vendor_id},
        {
            "$inc": {"balance": credits, "total_purchased": credits},
            "$set": {"is_paid": True},
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )

    wallet = await db.vendor_wallets.find_one({"vendor_id": vendor_id}, {"_id": 0})
    return {
        "message": "Credits added successfully",
        "credits_added": credits,
        "new_balance": wallet.get("balance", 0),
        "payment_id": data.razorpay_payment_id
    }
