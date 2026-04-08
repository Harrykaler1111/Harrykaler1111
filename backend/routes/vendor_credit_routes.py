from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import logging

from config import db
from auth import get_current_vendor, get_admin_user, generate_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vendor-credits", tags=["vendor-credits"])

# ─── Default pricing (overridden by admin in platform_pricing collection) ───
DEFAULT_PRICING = {
    "credit_rate_inr": 1,            # ₹1 = 1 credit
    "reel_boost_per_hour": 5,        # 5 credits/hour
    "reel_boost_per_day": 30,        # 30 credits/day
    "reel_boost_per_week": 150,      # 150 credits/week
    "reel_boost_per_month": 400,     # 400 credits/month
    "cart_placement_credits": 20,    # 20 credits per "You may also like" placement
    "featured_vendor_week": 999,     # ₹999/week (INR, not credits)
    "featured_vendor_month": 2999,   # ₹2999/month (INR, not credits)
    "free_vendor_reel_limit": 3,     # Free vendors: 3 products in reels
}


async def get_pricing() -> dict:
    """Get current platform pricing (admin-configurable)."""
    stored = await db.platform_pricing.find_one({"key": "vendor_monetization"}, {"_id": 0})
    if stored:
        merged = {**DEFAULT_PRICING, **stored.get("values", {})}
        return merged
    return DEFAULT_PRICING.copy()


# ─── Pydantic models ───

class PurchaseCredits(BaseModel):
    amount_inr: int

class BoostProduct(BaseModel):
    product_id: str
    duration: str  # "hour", "day", "week", "month"
    quantity: int = 1  # number of units (e.g., 3 hours, 7 days)

class CartPlacement(BaseModel):
    product_id: str

class FeaturedVendor(BaseModel):
    duration: str  # "week" or "month"

class SpendCredits(BaseModel):
    product_id: str
    credits: int
    placement: str = "upsell"


# ─── Admin: Pricing Management ───

class UpdatePricing(BaseModel):
    credit_rate_inr: Optional[float] = None
    reel_boost_per_hour: Optional[int] = None
    reel_boost_per_day: Optional[int] = None
    reel_boost_per_week: Optional[int] = None
    reel_boost_per_month: Optional[int] = None
    cart_placement_credits: Optional[int] = None
    featured_vendor_week: Optional[int] = None
    featured_vendor_month: Optional[int] = None
    free_vendor_reel_limit: Optional[int] = None


@router.get("/pricing")
async def get_public_pricing():
    """Public: get current credit pricing."""
    return await get_pricing()


@router.put("/admin/pricing")
async def update_pricing(data: UpdatePricing, admin: Dict = Depends(get_admin_user)):
    """Admin: update platform pricing."""
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    await db.platform_pricing.update_one(
        {"key": "vendor_monetization"},
        {"$set": {"values": updates, "updated_by": admin.get("admin_id"), "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    # Merge stored with new updates
    stored = await db.platform_pricing.find_one({"key": "vendor_monetization"}, {"_id": 0})
    current = stored.get("values", {}) if stored else {}
    current.update(updates)
    await db.platform_pricing.update_one(
        {"key": "vendor_monetization"},
        {"$set": {"values": current}}
    )
    return {"message": "Pricing updated", "pricing": {**DEFAULT_PRICING, **current}}


# ─── Vendor Wallet ───

@router.get("/wallet")
async def get_wallet(vendor: Dict = Depends(get_current_vendor)):
    wallet = await db.vendor_wallets.find_one({"vendor_id": vendor["vendor_id"]}, {"_id": 0})
    if not wallet:
        wallet = {
            "vendor_id": vendor["vendor_id"],
            "balance": 0,
            "total_purchased": 0,
            "total_spent": 0,
            "is_paid": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.vendor_wallets.insert_one(wallet)
        wallet.pop("_id", None)
    return wallet


@router.post("/purchase")
async def purchase_credits(data: PurchaseCredits, vendor: Dict = Depends(get_current_vendor)):
    """Vendor buys credits with INR (mock payment for now)."""
    if data.amount_inr <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    pricing = await get_pricing()
    rate = pricing["credit_rate_inr"]
    credits = int(data.amount_inr / rate)
    if credits <= 0:
        raise HTTPException(status_code=400, detail="Amount too low for any credits")

    payment_id = f"pay_{generate_id('')}"

    txn = {
        "txn_id": generate_id("txn_"),
        "vendor_id": vendor["vendor_id"],
        "type": "purchase",
        "amount_inr": data.amount_inr,
        "credits": credits,
        "rate": rate,
        "payment_id": payment_id,
        "status": "success",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.credit_transactions.insert_one(txn)

    await db.vendor_wallets.update_one(
        {"vendor_id": vendor["vendor_id"]},
        {
            "$inc": {"balance": credits, "total_purchased": credits},
            "$set": {"is_paid": True},
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )

    wallet = await db.vendor_wallets.find_one({"vendor_id": vendor["vendor_id"]}, {"_id": 0})
    return {"payment_id": payment_id, "credits_added": credits, "new_balance": wallet.get("balance", 0)}


# ─── Reel Boost ───

@router.post("/boost-reel")
async def boost_reel(data: BoostProduct, vendor: Dict = Depends(get_current_vendor)):
    """Vendor boosts a product in the reels feed for a duration."""
    pricing = await get_pricing()

    duration_key = f"reel_boost_per_{data.duration}"
    cost_per_unit = pricing.get(duration_key)
    if cost_per_unit is None:
        raise HTTPException(status_code=400, detail=f"Invalid duration: {data.duration}")

    total_credits = cost_per_unit * data.quantity
    wallet = await db.vendor_wallets.find_one({"vendor_id": vendor["vendor_id"]}, {"_id": 0})
    if not wallet or wallet.get("balance", 0) < total_credits:
        raise HTTPException(status_code=400, detail=f"Insufficient credits. Need {total_credits}, have {wallet.get('balance', 0) if wallet else 0}")

    # Verify product
    product = await db.products.find_one({"product_id": data.product_id, "vendor_id": vendor["vendor_id"]}, {"_id": 0, "product_id": 1, "name": 1})
    if not product:
        product = await db.vendor_products.find_one({"product_id": data.product_id, "vendor_id": vendor["vendor_id"]}, {"_id": 0, "product_id": 1, "name": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or doesn't belong to you")

    # Calculate expiry
    now = datetime.now(timezone.utc)
    duration_map = {"hour": timedelta(hours=data.quantity), "day": timedelta(days=data.quantity), "week": timedelta(weeks=data.quantity), "month": timedelta(days=30 * data.quantity)}
    expires_at = now + duration_map[data.duration]

    # Deduct credits
    await db.vendor_wallets.update_one(
        {"vendor_id": vendor["vendor_id"]},
        {"$inc": {"balance": -total_credits, "total_spent": total_credits}}
    )

    boost = {
        "boost_id": generate_id("boost_"),
        "vendor_id": vendor["vendor_id"],
        "product_id": data.product_id,
        "product_name": product.get("name", ""),
        "credits_spent": total_credits,
        "duration": data.duration,
        "quantity": data.quantity,
        "is_active": True,
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat()
    }
    await db.reel_boosts.insert_one(boost)

    txn = {
        "txn_id": generate_id("txn_"),
        "vendor_id": vendor["vendor_id"],
        "type": "reel_boost",
        "credits": -total_credits,
        "product_id": data.product_id,
        "duration": f"{data.quantity} {data.duration}(s)",
        "status": "success",
        "created_at": now.isoformat()
    }
    await db.credit_transactions.insert_one(txn)

    wallet = await db.vendor_wallets.find_one({"vendor_id": vendor["vendor_id"]}, {"_id": 0})
    return {"boost_id": boost["boost_id"], "credits_spent": total_credits, "expires_at": expires_at.isoformat(), "new_balance": wallet.get("balance", 0)}


# ─── Cart Placement (upsell) ───

@router.post("/cart-placement")
async def cart_placement(data: CartPlacement, vendor: Dict = Depends(get_current_vendor)):
    """Spend credits to place product in 'You may also like'."""
    pricing = await get_pricing()
    cost = pricing["cart_placement_credits"]

    wallet = await db.vendor_wallets.find_one({"vendor_id": vendor["vendor_id"]}, {"_id": 0})
    if not wallet or wallet.get("balance", 0) < cost:
        raise HTTPException(status_code=400, detail=f"Insufficient credits. Need {cost}")

    product = await db.products.find_one({"product_id": data.product_id, "vendor_id": vendor["vendor_id"]}, {"_id": 0, "product_id": 1, "name": 1})
    if not product:
        product = await db.vendor_products.find_one({"product_id": data.product_id, "vendor_id": vendor["vendor_id"]}, {"_id": 0, "product_id": 1, "name": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    await db.vendor_wallets.update_one(
        {"vendor_id": vendor["vendor_id"]},
        {"$inc": {"balance": -cost, "total_spent": cost}}
    )

    promo = {
        "promo_id": generate_id("promo_"),
        "vendor_id": vendor["vendor_id"],
        "product_id": data.product_id,
        "product_name": product.get("name", ""),
        "credits_spent": cost,
        "placement": "upsell",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.product_promotions.insert_one(promo)

    txn = {
        "txn_id": generate_id("txn_"),
        "vendor_id": vendor["vendor_id"],
        "type": "cart_placement",
        "credits": -cost,
        "product_id": data.product_id,
        "status": "success",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.credit_transactions.insert_one(txn)

    wallet = await db.vendor_wallets.find_one({"vendor_id": vendor["vendor_id"]}, {"_id": 0})
    return {"promo_id": promo["promo_id"], "credits_spent": cost, "new_balance": wallet.get("balance", 0)}


# ─── Featured Vendor ───

@router.post("/featured")
async def become_featured(data: FeaturedVendor, vendor: Dict = Depends(get_current_vendor)):
    """Vendor pays INR for featured placement (mock payment)."""
    pricing = await get_pricing()

    if data.duration == "week":
        cost_inr = pricing["featured_vendor_week"]
        delta = timedelta(weeks=1)
    elif data.duration == "month":
        cost_inr = pricing["featured_vendor_month"]
        delta = timedelta(days=30)
    else:
        raise HTTPException(status_code=400, detail="Duration must be 'week' or 'month'")

    now = datetime.now(timezone.utc)
    payment_id = f"pay_{generate_id('')}"

    featured = {
        "featured_id": generate_id("feat_"),
        "vendor_id": vendor["vendor_id"],
        "vendor_name": vendor.get("business_name", vendor.get("name", "")),
        "vendor_logo": vendor.get("logo", ""),
        "duration": data.duration,
        "cost_inr": cost_inr,
        "payment_id": payment_id,
        "is_active": True,
        "created_at": now.isoformat(),
        "expires_at": (now + delta).isoformat()
    }
    await db.featured_vendors.insert_one(featured)

    txn = {
        "txn_id": generate_id("txn_"),
        "vendor_id": vendor["vendor_id"],
        "type": "featured_vendor",
        "amount_inr": cost_inr,
        "duration": data.duration,
        "payment_id": payment_id,
        "status": "success",
        "created_at": now.isoformat()
    }
    await db.credit_transactions.insert_one(txn)

    return {"featured_id": featured["featured_id"], "cost_inr": cost_inr, "expires_at": featured["expires_at"]}


# ─── Public: Reels Feed (boosted first) ───

@router.get("/reels-feed")
async def reels_feed(limit: int = Query(50, ge=1, le=100)):
    """Public: Get products for reels feed, boosted products ranked first."""
    now = datetime.now(timezone.utc).isoformat()

    # Get active boosts
    active_boosts = await db.reel_boosts.find(
        {"is_active": True, "expires_at": {"$gt": now}},
        {"_id": 0, "product_id": 1, "credits_spent": 1}
    ).sort("credits_spent", -1).to_list(100)

    boosted_ids = [b["product_id"] for b in active_boosts]
    boost_scores = {b["product_id"]: b["credits_spent"] for b in active_boosts}

    # Fetch boosted products
    boosted = []
    if boosted_ids:
        boosted = await db.products.find(
            {"product_id": {"$in": boosted_ids}, "is_active": True, "images.0": {"$exists": True}},
            {"_id": 0}
        ).to_list(100)
        # Sort by credits spent (highest first)
        boosted.sort(key=lambda p: boost_scores.get(p["product_id"], 0), reverse=True)
        for p in boosted:
            p["is_boosted"] = True

    # Fill remaining with non-boosted products
    remaining = limit - len(boosted)
    if remaining > 0:
        exclude = set(boosted_ids)
        regular = await db.products.find(
            {"product_id": {"$nin": list(exclude)}, "is_active": True, "images.0": {"$exists": True}},
            {"_id": 0}
        ).to_list(remaining)
        for p in regular:
            p["is_boosted"] = False
    else:
        regular = []

    return {"products": boosted + regular, "boosted_count": len(boosted)}


# ─── Public: Vendor Products for Reel Strip ───

@router.get("/vendor-reel-strip/{vendor_id}")
async def vendor_reel_strip(vendor_id: str):
    """Get a vendor's products for the reel strip (swipe-left). Respects free vs paid limits."""
    pricing = await get_pricing()
    free_limit = pricing["free_vendor_reel_limit"]

    wallet = await db.vendor_wallets.find_one({"vendor_id": vendor_id}, {"_id": 0})
    is_paid = wallet.get("is_paid", False) if wallet else False

    query = {"vendor_id": vendor_id, "is_active": True, "images.0": {"$exists": True}}
    max_products = 200 if is_paid else free_limit

    products = await db.products.find(query, {"_id": 0}).limit(max_products).to_list(max_products)
    return {"products": products, "is_paid": is_paid, "limit": max_products}


@router.get("/group-products")
async def group_products(group_key: str = Query(...), group_value: str = Query(...)):
    """Public: Get products grouped by vendor_id or category for horizontal swipe."""
    if group_key == "vendor_id" and group_value:
        pricing = await get_pricing()
        free_limit = pricing["free_vendor_reel_limit"]
        wallet = await db.vendor_wallets.find_one({"vendor_id": group_value}, {"_id": 0})
        is_paid = wallet.get("is_paid", False) if wallet else False
        max_products = 200 if is_paid else free_limit
        query = {"vendor_id": group_value, "is_active": True, "images.0": {"$exists": True}}
        products = await db.products.find(query, {"_id": 0}).limit(max_products).to_list(max_products)
        return {"products": products, "is_paid": is_paid, "group_label": group_value}
    elif group_key == "category" and group_value:
        products = await db.products.find(
            {"category": group_value, "is_active": True, "images.0": {"$exists": True}},
            {"_id": 0}
        ).limit(20).to_list(20)
        return {"products": products, "is_paid": True, "group_label": group_value}
    else:
        return {"products": [], "is_paid": False, "group_label": ""}


# ─── Public: Featured Vendors ───

@router.get("/featured-vendors")
async def get_featured_vendors():
    """Public: Get currently featured vendors."""
    now = datetime.now(timezone.utc).isoformat()
    featured = await db.featured_vendors.find(
        {"is_active": True, "expires_at": {"$gt": now}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)

    vendor_ids = [f["vendor_id"] for f in featured]
    if not vendor_ids:
        return []

    # Fetch vendor info
    vendors = await db.vendors.find(
        {"vendor_id": {"$in": vendor_ids}, "is_active": True},
        {"_id": 0, "vendor_id": 1, "business_name": 1, "name": 1, "logo": 1}
    ).to_list(20)
    vendor_map = {v["vendor_id"]: v for v in vendors}

    result = []
    for f in featured:
        v = vendor_map.get(f["vendor_id"], {})
        result.append({
            "vendor_id": f["vendor_id"],
            "vendor_name": v.get("business_name") or v.get("name") or f.get("vendor_name", ""),
            "vendor_logo": v.get("logo") or f.get("vendor_logo", ""),
            "expires_at": f["expires_at"]
        })
    return result


# ─── Vendor Analytics ───

@router.get("/analytics")
async def vendor_analytics(vendor: Dict = Depends(get_current_vendor)):
    """Vendor analytics: views, clicks, orders, revenue."""
    vid = vendor["vendor_id"]

    # Product views from analytics collection
    total_views = await db.product_views.count_documents({"vendor_id": vid})

    # Orders containing vendor's products
    orders = await db.orders.find(
        {"items.vendor_id": vid, "status": {"$nin": ["cancelled"]}},
        {"_id": 0, "items": 1, "total_amount": 1}
    ).to_list(1000)

    total_orders = len(orders)
    total_revenue = 0
    for order in orders:
        for item in order.get("items", []):
            if item.get("vendor_id") == vid:
                total_revenue += item.get("price", 0) * item.get("quantity", 1)

    # Active boosts
    now = datetime.now(timezone.utc).isoformat()
    active_boosts = await db.reel_boosts.count_documents({"vendor_id": vid, "is_active": True, "expires_at": {"$gt": now}})

    # Active cart placements
    active_placements = await db.product_promotions.count_documents({"vendor_id": vid, "is_active": True})

    # Credit stats
    wallet = await db.vendor_wallets.find_one({"vendor_id": vid}, {"_id": 0})

    return {
        "total_views": total_views,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "active_boosts": active_boosts,
        "active_placements": active_placements,
        "credit_balance": wallet.get("balance", 0) if wallet else 0,
        "total_spent": wallet.get("total_spent", 0) if wallet else 0,
        "is_paid": wallet.get("is_paid", False) if wallet else False
    }


# ─── Track product view (for analytics) ───

@router.post("/track-view/{product_id}")
async def track_view(product_id: str):
    """Public: track a product view from reels."""
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0, "vendor_id": 1})
    if product:
        await db.product_views.insert_one({
            "product_id": product_id,
            "vendor_id": product.get("vendor_id", ""),
            "source": "reels",
            "viewed_at": datetime.now(timezone.utc).isoformat()
        })
    return {"ok": True}


# ─── Legacy endpoints (keep compatibility) ───

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
    """Public: Get promoted products for cart upsell section."""
    promos = await db.product_promotions.find(
        {"is_active": True, "placement": {"$in": ["upsell", "featured"]}},
        {"_id": 0}
    ).sort("credits_spent", -1).limit(10).to_list(10)

    product_ids = [p["product_id"] for p in promos]
    if not product_ids:
        return []

    products = await db.products.find(
        {"product_id": {"$in": product_ids}, "is_active": True, "images.0": {"$exists": True}},
        {"_id": 0}
    ).to_list(10)

    # Fallback to vendor_products if not found in products
    if len(products) < len(product_ids):
        found_ids = {p["product_id"] for p in products}
        missing = [pid for pid in product_ids if pid not in found_ids]
        if missing:
            extra = await db.vendor_products.find(
                {"product_id": {"$in": missing}, "is_active": True, "approval_status": "approved", "images.0": {"$exists": True}},
                {"_id": 0}
            ).to_list(10)
            products.extend(extra)

    return products


# ─── Admin: Manual credit add ───

class AdminAddCredits(BaseModel):
    vendor_id: str
    credits: int
    reason: str = "Manual top-up by admin"

@router.post("/admin/add-credits")
async def admin_add_credits(data: AdminAddCredits, admin: Dict = Depends(get_admin_user)):
    """Admin: manually add credits to a vendor."""
    if data.credits <= 0:
        raise HTTPException(status_code=400, detail="Credits must be positive")

    await db.vendor_wallets.update_one(
        {"vendor_id": data.vendor_id},
        {
            "$inc": {"balance": data.credits, "total_purchased": data.credits},
            "$set": {"is_paid": True},
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )

    txn = {
        "txn_id": generate_id("txn_"),
        "vendor_id": data.vendor_id,
        "type": "admin_topup",
        "credits": data.credits,
        "reason": data.reason,
        "admin_id": admin.get("admin_id"),
        "status": "success",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.credit_transactions.insert_one(txn)

    wallet = await db.vendor_wallets.find_one({"vendor_id": data.vendor_id}, {"_id": 0})
    return {"credits_added": data.credits, "new_balance": wallet.get("balance", 0)}


# ─── Admin: Get all boosts ───

@router.get("/admin/all-boosts")
async def admin_all_boosts(admin: Dict = Depends(get_admin_user)):
    boosts = await db.reel_boosts.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return boosts
