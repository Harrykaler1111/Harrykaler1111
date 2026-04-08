from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone
import uuid
import logging

from config import db, DEFAULT_COMMISSION_RATE, PLATFORM_COMMISSION_RATE
from models.schemas import OrderCreate, OrderResponse
from models.enums import TransactionType
from auth import get_current_user, generate_id
from routes.checkout_settings_routes import get_checkout_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["orders"])


async def log_order_event(order_id: str, event_type: str, title: str, description: str = "",
                          actor_type: str = "system", actor_id: str = None, actor_name: str = None, meta: dict = None):
    """Log an event to the order timeline."""
    event = {
        "event_id": generate_id("evt_"),
        "order_id": order_id,
        "event_type": event_type,
        "title": title,
        "description": description,
        "actor_type": actor_type,
        "actor_id": actor_id,
        "actor_name": actor_name,
        "meta": meta or {},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.order_events.insert_one(event)
    return event


async def credit_influencer_commission(influencer_id: str, order_id: str, order_total: float, commission_rate: float):
    commission_amount = order_total * (commission_rate / 100)

    influencer = await db.influencers.find_one({"influencer_id": influencer_id}, {"_id": 0})
    if not influencer:
        return 0.0

    current_balance = influencer.get("wallet_balance", 0.0)
    new_balance = current_balance + commission_amount

    await db.wallet_transactions.insert_one({
        "transaction_id": generate_id("txn_"),
        "influencer_id": influencer_id,
        "type": TransactionType.COMMISSION.value,
        "amount": commission_amount,
        "balance_after": new_balance,
        "description": f"Commission for order {order_id}",
        "order_id": order_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    await db.influencers.update_one(
        {"influencer_id": influencer_id},
        {
            "$set": {"wallet_balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()},
            "$inc": {"total_earnings": commission_amount, "total_conversions": 1}
        }
    )

    logger.info(f"Credited Rs.{commission_amount} to influencer {influencer_id} for order {order_id}")
    return commission_amount


async def credit_vendor_wallet(vendor_id: str, order_id: str, vendor_amount: float):
    vendor = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
    if not vendor:
        return

    current_balance = vendor.get("wallet_balance", 0.0)
    new_balance = current_balance + vendor_amount

    await db.vendor_wallet_transactions.insert_one({
        "transaction_id": generate_id("vtxn_"),
        "vendor_id": vendor_id,
        "type": TransactionType.SALE_CREDIT.value,
        "amount": vendor_amount,
        "balance_after": new_balance,
        "description": f"Sale earnings for order {order_id}",
        "order_id": order_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    await db.vendors.update_one(
        {"vendor_id": vendor_id},
        {
            "$set": {"wallet_balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()},
            "$inc": {"total_sales": vendor_amount, "total_orders": 1}
        }
    )

    logger.info(f"Credited Rs.{vendor_amount} to vendor {vendor_id} for order {order_id}")


async def record_platform_commission(order_id: str, amount: float, vendor_id: str = None):
    await db.platform_transactions.insert_one({
        "transaction_id": generate_id("ptxn_"),
        "order_id": order_id,
        "type": "platform_commission",
        "amount": amount,
        "vendor_id": vendor_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })


@router.post("", response_model=OrderResponse)
async def create_order(order: OrderCreate, user: Dict = Depends(get_current_user), ref: Optional[str] = None):
    cart = await db.carts.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not cart or not cart["items"]:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Load checkout settings
    checkout_cfg = await get_checkout_settings()
    payment_method = order.payment_method if order.payment_method in ("prepaid", "cod") else "prepaid"

    items = []
    subtotal = 0
    vendor_id = None
    vendor_name = None

    for item in cart["items"]:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if not product:
            continue
        if product["stock"] < item["quantity"]:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product['name']}")

        # Use reseller price override if validated, otherwise base price
        effective_price = item.get("price_override") or product["price"]
        item_total = effective_price * item["quantity"]
        subtotal += item_total

        item_vendor_id = product.get("vendor_id")
        item_vendor_name = product.get("vendor_name", "")

        if item_vendor_id and not vendor_id:
            vendor_id = item_vendor_id
            vendor_name = item_vendor_name

        items.append({
            **item,
            "product_name": product["name"],
            "product_image": product["images"][0] if product["images"] else None,
            "price": effective_price,
            "base_price": product["price"],
            "item_total": item_total,
            "vendor_id": item_vendor_id,
            "vendor_name": item_vendor_name,
            "is_vendor_product": product.get("is_vendor_product", False),
            "reseller_id": item.get("reseller_id"),
        })

    # ============== COD VALIDATION ==============
    cod_charge = 0.0
    prepaid_discount_amount = 0.0
    cod_advance = 0.0
    cod_remaining = 0.0

    if payment_method == "cod":
        if not checkout_cfg.get("cod_enabled"):
            raise HTTPException(status_code=400, detail="Cash on Delivery is currently disabled")

        cod_max = checkout_cfg.get("cod_max_order_value", 10000)
        if subtotal > cod_max:
            raise HTTPException(status_code=400, detail=f"COD is not available for orders above Rs.{cod_max}")

        # Check COD limits per user
        pending_cod = await db.orders.count_documents({
            "user_id": user["user_id"],
            "payment_method": "cod",
            "status": {"$in": ["pending", "confirmed", "processing", "shipped", "cod_confirmed"]}
        })
        max_cod = checkout_cfg.get("max_cod_per_user", 3)
        if pending_cod >= max_cod:
            raise HTTPException(status_code=400, detail=f"Maximum {max_cod} pending COD orders allowed")

        # Check blocked users
        if checkout_cfg.get("block_repeat_fake_users"):
            cancelled_cod = await db.orders.count_documents({
                "user_id": user["user_id"],
                "payment_method": "cod",
                "status": "cancelled"
            })
            if cancelled_cod >= 3:
                raise HTTPException(status_code=400, detail="COD is not available for your account")

        cod_charge = float(checkout_cfg.get("cod_charge", 0))

        # Calculate COD advance
        if checkout_cfg.get("cod_advance_enabled") and subtotal >= checkout_cfg.get("cod_advance_threshold", 1000):
            cod_advance = float(checkout_cfg.get("cod_advance_amount", 500))

    elif payment_method == "prepaid":
        if checkout_cfg.get("prepaid_discount_enabled"):
            prepaid_discount_amount = float(checkout_cfg.get("prepaid_discount", 0))

    # ============== DISCOUNT & AFFILIATE ==============
    discount = 0
    affiliate_id = None
    influencer_id = None

    if order.coupon_code:
        coupon = await db.coupons.find_one({"code": order.coupon_code.upper(), "is_active": True}, {"_id": 0})
        if coupon:
            if coupon["discount_type"] == "percentage":
                discount = subtotal * (coupon["discount_value"] / 100)
            else:
                discount = coupon["discount_value"]
            affiliate_id = coupon.get("affiliate_id")
            await db.coupons.update_one({"code": order.coupon_code.upper()}, {"$inc": {"used_count": 1}})

    if ref:
        influencer = await db.influencers.find_one({"referral_code": ref}, {"_id": 0})
        if influencer:
            influencer_id = influencer["influencer_id"]
        else:
            affiliate = await db.affiliates.find_one({"referral_code": ref}, {"_id": 0})
            if affiliate:
                affiliate_id = affiliate["affiliate_id"]
            else:
                collab = await db.collaboration_requests.find_one(
                    {"referral_code": ref, "status": "accepted"}, {"_id": 0}
                )
                if collab:
                    influencer_id = collab.get("influencer_id")
                    if not vendor_id:
                        vendor_id = collab.get("vendor_id")

    # ============== SHIPPING ==============
    free_threshold = checkout_cfg.get("free_shipping_threshold", 2999)
    shipping_charge = 0 if subtotal >= free_threshold else float(checkout_cfg.get("shipping_charge", 199))

    # ============== TOTAL CALCULATION ==============
    total = subtotal - discount - prepaid_discount_amount + cod_charge + shipping_charge
    cod_remaining = max(0, total - cod_advance) if payment_method == "cod" and cod_advance > 0 else (total if payment_method == "cod" else 0)

    # ============== RISK SCORING ==============
    risk_level = "low"
    risk_factors = []

    if payment_method == "cod":
        risk_factors.append("cod_order")
        if subtotal > checkout_cfg.get("high_risk_threshold", 3000):
            risk_factors.append("high_value")
            risk_level = "high"

        pending_cod_count = await db.orders.count_documents({
            "user_id": user["user_id"],
            "payment_method": "cod",
            "status": {"$in": ["pending", "confirmed", "processing", "shipped", "cod_confirmed"]}
        })
        if pending_cod_count >= 2:
            risk_factors.append("multiple_cod")
            risk_level = "high" if risk_level == "high" else "medium"

    order_id = generate_id("order_")
    razorpay_order_id = f"order_{uuid.uuid4().hex[:16]}"

    # Determine initial status
    if payment_method == "cod":
        initial_status = "cod_confirmed" if cod_advance == 0 else "pending_advance"
        payment_status = "cod" if cod_advance == 0 else "advance_pending"
    else:
        initial_status = "pending"
        payment_status = "pending"

    # Pre-calculate commission splits
    platform_commission = 0.0
    influencer_commission_amount = 0.0
    vendor_amount = 0.0

    if vendor_id:
        platform_commission = total * (PLATFORM_COMMISSION_RATE / 100)
        if influencer_id:
            inf = await db.influencers.find_one({"influencer_id": influencer_id}, {"_id": 0})
            inf_rate = inf.get("commission_rate", DEFAULT_COMMISSION_RATE) if inf else DEFAULT_COMMISSION_RATE
            influencer_commission_amount = total * (inf_rate / 100)
        vendor_amount = total - platform_commission - influencer_commission_amount

    order_doc = {
        "order_id": order_id,
        "user_id": user["user_id"],
        "items": items,
        "subtotal": subtotal,
        "discount": discount,
        "total": round(total, 2),
        "status": initial_status,
        "shipping_address": order.shipping_address,
        "payment_method": payment_method,
        "payment_status": payment_status,
        "razorpay_order_id": razorpay_order_id,
        "coupon_code": order.coupon_code,
        "affiliate_id": affiliate_id,
        "influencer_id": influencer_id,
        "referral_code": ref,
        "vendor_id": vendor_id,
        "vendor_name": vendor_name,
        "platform_commission": round(platform_commission, 2),
        "influencer_commission": round(influencer_commission_amount, 2),
        "vendor_amount": round(vendor_amount, 2),
        # New COD/Prepaid fields
        "cod_charge": cod_charge,
        "prepaid_discount": prepaid_discount_amount,
        "cod_advance_amount": cod_advance,
        "cod_remaining": round(cod_remaining, 2),
        "shipping_charge": shipping_charge,
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "risk_reviewed": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.orders.insert_one(order_doc)

    for item in items:
        await db.products.update_one(
            {"product_id": item["product_id"]},
            {"$inc": {"stock": -item["quantity"]}}
        )
        if item.get("vendor_id"):
            await db.vendor_products.update_one(
                {"product_id": item["product_id"]},
                {"$inc": {"stock": -item["quantity"]}}
            )

    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    # Log order placed event
    method_label = "Prepaid" if payment_method == "prepaid" else "Cash on Delivery"
    await log_order_event(
        order_id, "order_placed", "Order Placed",
        f"Order #{order_id[-6:]} placed for Rs.{total:,.0f} via {method_label} with {len(items)} item(s)",
        actor_type="customer", actor_id=user["user_id"], actor_name=user.get("name", "Customer")
    )

    # ============== WHATSAPP NOTIFICATIONS ==============
    try:
        from services.interakt_service import notify_order_placed, notify_cod_confirmation, track_user
        from routes.whatsapp_routes import get_wa_settings as get_wa_cfg

        wa_settings = await get_wa_cfg()
        customer_phone = order.shipping_address.get("phone", "") if isinstance(order.shipping_address, dict) else ""
        customer_name = user.get("name", "Customer")

        if customer_phone:
            # Track user in Interakt
            track_user(customer_phone, traits={
                "name": customer_name,
                "email": user.get("email", ""),
                "user_id": user["user_id"]
            })

            # Order placed notification
            if wa_settings.get("order_placed_enabled", True):
                notify_order_placed(
                    phone=customer_phone,
                    order_id=order_id,
                    customer_name=customer_name,
                    total=round(total, 2),
                    items_count=len(items),
                    payment_method=payment_method
                )

            # COD confirmation request
            if payment_method == "cod" and wa_settings.get("cod_confirmation_enabled", True):
                notify_cod_confirmation(
                    phone=customer_phone,
                    order_id=order_id,
                    customer_name=customer_name,
                    total=round(total, 2)
                )

            # Log WhatsApp message
            await db.whatsapp_messages.insert_one({
                "message_id": generate_id("wmsg_"),
                "phone": customer_phone,
                "message_type": "order_placed",
                "order_id": order_id,
                "delivery_status": "sent",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    except Exception as e:
        logger.warning(f"WhatsApp notification failed for order {order_id}: {e}")

    # ============== REAL-TIME NOTIFICATIONS ==============
    try:
        from services.notification_service import notify_new_order
        await notify_new_order(order_doc)
    except Exception as e:
        logger.warning(f"Notification trigger failed for order {order_id}: {e}")

    return OrderResponse(**order_doc)


@router.get("", response_model=List[OrderResponse])
async def get_orders(user: Dict = Depends(get_current_user), skip: int = 0, limit: int = 20):
    orders = await db.orders.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [OrderResponse(**o) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, user: Dict = Depends(get_current_user)):
    order = await db.orders.find_one(
        {"order_id": order_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderResponse(**order)


@router.post("/{order_id}/payment/verify")
async def verify_payment(order_id: str, razorpay_payment_id: str, razorpay_signature: str, user: Dict = Depends(get_current_user)):
    order = await db.orders.find_one({"order_id": order_id, "user_id": user["user_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.get("payment_status") == "paid":
        return {"message": "Already paid", "status": "paid"}

    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "payment_status": "paid",
            "razorpay_payment_id": razorpay_payment_id,
            "status": "confirmed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    total = order["total"]
    actual_influencer_commission = 0.0
    actual_platform_commission = 0.0
    actual_vendor_amount = 0.0

    # Step 1: Credit influencer commission
    if order.get("influencer_id"):
        influencer = await db.influencers.find_one({"influencer_id": order["influencer_id"]}, {"_id": 0})
        if influencer:
            commission_rate = influencer.get("commission_rate", DEFAULT_COMMISSION_RATE)
            actual_influencer_commission = await credit_influencer_commission(
                order["influencer_id"], order_id, total, commission_rate
            )

    # Step 2: Credit affiliate commission (separate from influencer)
    if order.get("affiliate_id"):
        affiliate = await db.affiliates.find_one({"affiliate_id": order["affiliate_id"]}, {"_id": 0})
        if affiliate:
            commission = total * (affiliate["commission_rate"] / 100)
            await db.affiliates.update_one(
                {"affiliate_id": order["affiliate_id"]},
                {"$inc": {"total_earnings": commission, "total_conversions": 1}}
            )

    # Step 3: If vendor product, do the full commission split
    if order.get("vendor_id"):
        actual_platform_commission = total * (PLATFORM_COMMISSION_RATE / 100)
        actual_vendor_amount = total - actual_platform_commission - actual_influencer_commission

        # Credit vendor wallet
        await credit_vendor_wallet(order["vendor_id"], order_id, actual_vendor_amount)

        # Record platform commission
        await record_platform_commission(order_id, actual_platform_commission, order["vendor_id"])

        # Update vendor product stats
        for item in order.get("items", []):
            if item.get("vendor_id"):
                await db.vendor_products.update_one(
                    {"product_id": item["product_id"]},
                    {"$inc": {"total_sold": item["quantity"], "total_revenue": item["item_total"]}}
                )

        # Update order with actual settlement amounts
        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {
                "platform_commission": round(actual_platform_commission, 2),
                "influencer_commission": round(actual_influencer_commission, 2),
                "vendor_amount": round(actual_vendor_amount, 2),
                "settlement_status": "settled"
            }}
        )

        logger.info(
            f"Order {order_id} settled: Total={total}, "
            f"Platform={actual_platform_commission}, "
            f"Influencer={actual_influencer_commission}, "
            f"Vendor={actual_vendor_amount}"
        )

    # Record in sales_tracking collection for analytics
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

    # Update collaboration sales tracking if referral code matches a collab
    if order.get("referral_code"):
        await db.collaboration_requests.update_one(
            {"referral_code": order["referral_code"], "status": "accepted"},
            {"$inc": {"sales_count": 1, "sales_revenue": total, "commission_earned": actual_influencer_commission}}
        )
        await db.vendor_influencer_links.update_one(
            {"referral_code": order["referral_code"]},
            {"$inc": {"sales_count": 1, "sales_revenue": total, "commission_earned": actual_influencer_commission}}
        )

    # Log payment and confirmation events
    await log_order_event(
        order_id, "payment_verified", "Payment Confirmed",
        f"Payment of ₹{total:,.0f} verified successfully",
        actor_type="system"
    )
    await log_order_event(
        order_id, "status_change", "Order Confirmed",
        "Your order has been confirmed and is being prepared",
        actor_type="system", meta={"old_status": "pending", "new_status": "confirmed"}
    )

    return {
        "message": "Payment verified and commissions settled",
        "status": "paid",
        "settlement": {
            "total": total,
            "platform_commission": round(actual_platform_commission, 2),
            "influencer_commission": round(actual_influencer_commission, 2),
            "vendor_amount": round(actual_vendor_amount, 2)
        }
    }


# ============== ORDER TIMELINE ==============

@router.get("/{order_id}/timeline")
async def get_order_timeline(order_id: str, user: Dict = Depends(get_current_user)):
    """Get order timeline events for customer view (generic, no admin names)"""
    order = await db.orders.find_one({"order_id": order_id, "user_id": user["user_id"]}, {"_id": 0, "order_id": 1})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    events = await db.order_events.find(
        {"order_id": order_id},
        {"_id": 0, "actor_id": 0, "actor_name": 0}
    ).sort("created_at", 1).to_list(100)

    # Sanitize: customer sees generic actor_type only
    for e in events:
        if e.get("actor_type") == "admin":
            e["actor_type"] = "system"
        e.pop("meta", None)

    return events


# ============== MARKETPLACE ANALYTICS ==============

@router.get("/analytics/marketplace")
async def get_marketplace_analytics():
    """Public-facing marketplace stats"""
    total_vendors = await db.vendors.count_documents({"status": "approved"})
    total_products = await db.products.count_documents({"is_active": True})
    total_vendor_products = await db.products.count_documents({"is_active": True, "is_vendor_product": True})

    pipeline = [
        {"$match": {"is_vendor_sale": True}},
        {"$group": {
            "_id": None,
            "total_sales": {"$sum": "$total"},
            "total_platform_commission": {"$sum": "$platform_commission"},
            "total_influencer_commission": {"$sum": "$influencer_commission"},
            "total_vendor_earnings": {"$sum": "$vendor_amount"},
            "count": {"$sum": 1}
        }}
    ]
    result = await db.sales_tracking.aggregate(pipeline).to_list(1)
    stats = result[0] if result else {
        "total_sales": 0, "total_platform_commission": 0,
        "total_influencer_commission": 0, "total_vendor_earnings": 0, "count": 0
    }

    return {
        "total_vendors": total_vendors,
        "total_products": total_products,
        "total_vendor_products": total_vendor_products,
        "total_marketplace_sales": stats.get("total_sales", 0),
        "total_platform_revenue": stats.get("total_platform_commission", 0),
        "total_influencer_payouts": stats.get("total_influencer_commission", 0),
        "total_vendor_earnings": stats.get("total_vendor_earnings", 0),
        "total_vendor_orders": stats.get("count", 0)
    }
