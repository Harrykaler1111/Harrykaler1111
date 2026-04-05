from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from config import db
from auth import get_current_vendor, get_admin_user, generate_id

router = APIRouter(prefix="/vendor-credits", tags=["vendor-credits"])


class PurchaseCredits(BaseModel):
    amount: int  # INR
    credits: int  # credits to add


class SpendCredits(BaseModel):
    product_id: str
    credits: int
    placement: str = "upsell"  # upsell | featured


@router.get("/wallet")
async def get_wallet(vendor: Dict = Depends(get_current_vendor)):
    wallet = await db.vendor_wallets.find_one({"vendor_id": vendor["vendor_id"]}, {"_id": 0})
    if not wallet:
        wallet = {
            "vendor_id": vendor["vendor_id"],
            "balance": 0,
            "total_purchased": 0,
            "total_spent": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.vendor_wallets.insert_one(wallet)
        wallet.pop("_id", None)
    return wallet


@router.post("/purchase")
async def purchase_credits(data: PurchaseCredits, vendor: Dict = Depends(get_current_vendor)):
    if data.amount <= 0 or data.credits <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    # Mocked Razorpay — simulate payment success
    payment_id = f"pay_mock_{generate_id('')}"

    txn = {
        "txn_id": generate_id("txn_"),
        "vendor_id": vendor["vendor_id"],
        "type": "purchase",
        "amount_inr": data.amount,
        "credits": data.credits,
        "payment_id": payment_id,
        "status": "success",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.credit_transactions.insert_one(txn)

    await db.vendor_wallets.update_one(
        {"vendor_id": vendor["vendor_id"]},
        {
            "$inc": {"balance": data.credits, "total_purchased": data.credits},
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )

    wallet = await db.vendor_wallets.find_one({"vendor_id": vendor["vendor_id"]}, {"_id": 0})
    return {"payment_id": payment_id, "credits_added": data.credits, "new_balance": wallet.get("balance", 0)}


@router.post("/spend")
async def spend_credits(data: SpendCredits, vendor: Dict = Depends(get_current_vendor)):
    if data.credits <= 0:
        raise HTTPException(status_code=400, detail="Invalid credits")

    wallet = await db.vendor_wallets.find_one({"vendor_id": vendor["vendor_id"]}, {"_id": 0})
    if not wallet or wallet.get("balance", 0) < data.credits:
        raise HTTPException(status_code=400, detail="Insufficient credits")

    # Verify product belongs to vendor
    product = await db.vendor_products.find_one(
        {"product_id": data.product_id, "vendor_id": vendor["vendor_id"]},
        {"_id": 0, "product_id": 1, "name": 1}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Deduct credits
    await db.vendor_wallets.update_one(
        {"vendor_id": vendor["vendor_id"]},
        {"$inc": {"balance": -data.credits, "total_spent": data.credits}}
    )

    # Create promotion
    promo = {
        "promo_id": generate_id("promo_"),
        "vendor_id": vendor["vendor_id"],
        "product_id": data.product_id,
        "product_name": product.get("name", ""),
        "credits_spent": data.credits,
        "placement": data.placement,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": None  # Credits-based, active until deactivated
    }
    await db.product_promotions.insert_one(promo)

    txn = {
        "txn_id": generate_id("txn_"),
        "vendor_id": vendor["vendor_id"],
        "type": "spend",
        "credits": -data.credits,
        "product_id": data.product_id,
        "placement": data.placement,
        "status": "success",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.credit_transactions.insert_one(txn)

    wallet = await db.vendor_wallets.find_one({"vendor_id": vendor["vendor_id"]}, {"_id": 0})
    return {"promo_id": promo["promo_id"], "credits_spent": data.credits, "new_balance": wallet.get("balance", 0)}


@router.get("/transactions")
async def get_transactions(vendor: Dict = Depends(get_current_vendor)):
    txns = await db.credit_transactions.find(
        {"vendor_id": vendor["vendor_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return txns


@router.get("/promotions")
async def get_promotions(vendor: Dict = Depends(get_current_vendor)):
    promos = await db.product_promotions.find(
        {"vendor_id": vendor["vendor_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return promos


@router.get("/upsell-products")
async def get_upsell_products():
    """Public endpoint: Get promoted products for cart upsell section."""
    promos = await db.product_promotions.find(
        {"is_active": True, "placement": {"$in": ["upsell", "featured"]}},
        {"_id": 0}
    ).sort("credits_spent", -1).limit(10).to_list(10)

    product_ids = [p["product_id"] for p in promos]
    if not product_ids:
        return []

    products = await db.vendor_products.find(
        {"product_id": {"$in": product_ids}, "is_active": True, "approval_status": "approved", "images.0": {"$exists": True}},
        {"_id": 0}
    ).to_list(10)

    return products
