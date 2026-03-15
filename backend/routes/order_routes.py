from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone
import uuid
import logging

from config import db, DEFAULT_COMMISSION_RATE
from models.schemas import OrderCreate, OrderResponse
from models.enums import TransactionType
from auth import get_current_user, generate_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["orders"])


async def credit_influencer_commission(influencer_id: str, order_id: str, order_total: float, commission_rate: float):
    commission_amount = order_total * (commission_rate / 100)

    influencer = await db.influencers.find_one({"influencer_id": influencer_id}, {"_id": 0})
    if not influencer:
        return

    current_balance = influencer.get("wallet_balance", 0.0)
    new_balance = current_balance + commission_amount

    transaction = {
        "transaction_id": generate_id("txn_"),
        "influencer_id": influencer_id,
        "type": TransactionType.COMMISSION.value,
        "amount": commission_amount,
        "balance_after": new_balance,
        "description": f"Commission for order {order_id}",
        "order_id": order_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wallet_transactions.insert_one(transaction)

    await db.influencers.update_one(
        {"influencer_id": influencer_id},
        {
            "$set": {"wallet_balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()},
            "$inc": {"total_earnings": commission_amount, "total_conversions": 1}
        }
    )

    logger.info(f"Credited Rs.{commission_amount} to influencer {influencer_id} for order {order_id}")


@router.post("", response_model=OrderResponse)
async def create_order(order: OrderCreate, user: Dict = Depends(get_current_user), ref: Optional[str] = None):
    cart = await db.carts.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not cart or not cart["items"]:
        raise HTTPException(status_code=400, detail="Cart is empty")

    items = []
    subtotal = 0
    for item in cart["items"]:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if not product:
            continue
        if product["stock"] < item["quantity"]:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product['name']}")

        item_total = product["price"] * item["quantity"]
        subtotal += item_total
        items.append({
            **item,
            "product_name": product["name"],
            "product_image": product["images"][0] if product["images"] else None,
            "price": product["price"],
            "item_total": item_total
        })

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

    total = subtotal - discount
    order_id = generate_id("order_")
    razorpay_order_id = f"order_{uuid.uuid4().hex[:16]}"

    order_doc = {
        "order_id": order_id,
        "user_id": user["user_id"],
        "items": items,
        "subtotal": subtotal,
        "discount": discount,
        "total": total,
        "status": "pending",
        "shipping_address": order.shipping_address,
        "payment_method": order.payment_method,
        "payment_status": "pending",
        "razorpay_order_id": razorpay_order_id,
        "coupon_code": order.coupon_code,
        "affiliate_id": affiliate_id,
        "influencer_id": influencer_id,
        "referral_code": ref,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.orders.insert_one(order_doc)

    for item in items:
        await db.products.update_one(
            {"product_id": item["product_id"]},
            {"$inc": {"stock": -item["quantity"]}}
        )

    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

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

    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "payment_status": "paid",
            "razorpay_payment_id": razorpay_payment_id,
            "status": "confirmed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    if order.get("influencer_id"):
        influencer = await db.influencers.find_one({"influencer_id": order["influencer_id"]}, {"_id": 0})
        if influencer:
            commission_rate = influencer.get("commission_rate", DEFAULT_COMMISSION_RATE)
            await credit_influencer_commission(order["influencer_id"], order_id, order["total"], commission_rate)

    if order.get("affiliate_id"):
        affiliate = await db.affiliates.find_one({"affiliate_id": order["affiliate_id"]}, {"_id": 0})
        if affiliate:
            commission = order["total"] * (affiliate["commission_rate"] / 100)
            await db.affiliates.update_one(
                {"affiliate_id": order["affiliate_id"]},
                {"$inc": {"total_earnings": commission, "total_conversions": 1}}
            )

    return {"message": "Payment verified", "status": "paid"}
