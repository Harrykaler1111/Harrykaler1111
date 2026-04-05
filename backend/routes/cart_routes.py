from fastapi import APIRouter, HTTPException, Depends, Request
import os
from typing import Dict, List
from datetime import datetime, timezone

from config import db
from models.schemas import CartItem, CartResponse
from auth import get_current_user, get_admin_user, generate_id

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("", response_model=CartResponse)
async def get_cart(user: Dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not cart:
        cart = {
            "cart_id": generate_id("cart_"),
            "user_id": user["user_id"],
            "items": [],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.carts.insert_one(cart)

    total = 0
    for item in cart["items"]:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if product:
            item["product"] = product
            # Use reseller price override if present, otherwise base price
            effective_price = item.get("price_override") or product["price"]
            total += effective_price * item["quantity"]

    cart["total"] = total
    return CartResponse(**cart)


@router.post("/add", response_model=CartResponse)
async def add_to_cart(item: CartItem, user: Dict = Depends(get_current_user)):
    product = await db.products.find_one({"product_id": item.product_id, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product["stock"] < item.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    # Validate reseller price override (prevents URL manipulation)
    validated_override = None
    validated_reseller_id = None
    if item.reseller_id and item.price_override:
        reseller_link = await db.reseller_links.find_one({
            "user_id": item.reseller_id,
            "product_id": item.product_id,
            "reseller_price": item.price_override
        }, {"_id": 0})
        if reseller_link and item.price_override >= product["price"]:
            validated_override = item.price_override
            validated_reseller_id = item.reseller_id

    cart = await db.carts.find_one({"user_id": user["user_id"]})
    if not cart:
        cart = {
            "cart_id": generate_id("cart_"),
            "user_id": user["user_id"],
            "items": [],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.carts.insert_one(cart)

    item_exists = False
    for existing_item in cart["items"]:
        if (existing_item["product_id"] == item.product_id and
            existing_item["size"] == item.size and
            existing_item["color"] == item.color):
            existing_item["quantity"] += item.quantity
            # Update reseller override if present
            if validated_override:
                existing_item["reseller_id"] = validated_reseller_id
                existing_item["price_override"] = validated_override
            item_exists = True
            break

    if not item_exists:
        item_data = item.model_dump()
        if validated_override:
            item_data["reseller_id"] = validated_reseller_id
            item_data["price_override"] = validated_override
        else:
            item_data.pop("reseller_id", None)
            item_data.pop("price_override", None)
        cart["items"].append(item_data)

    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": cart["items"], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return await get_cart(user)


@router.put("/update", response_model=CartResponse)
async def update_cart_item(item: CartItem, user: Dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["user_id"]})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    for existing_item in cart["items"]:
        if (existing_item["product_id"] == item.product_id and
            existing_item["size"] == item.size and
            existing_item["color"] == item.color):
            if item.quantity <= 0:
                cart["items"].remove(existing_item)
            else:
                existing_item["quantity"] = item.quantity
            break

    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": cart["items"], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return await get_cart(user)


@router.delete("/item/{product_id}")
async def remove_from_cart(product_id: str, size: str, color: str, user: Dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["user_id"]})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    cart["items"] = [
        item for item in cart["items"]
        if not (item["product_id"] == product_id and item["size"] == size and item["color"] == color)
    ]

    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": cart["items"], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"message": "Item removed from cart"}


@router.delete("/clear")
async def clear_cart(user: Dict = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Cart cleared"}


@router.get("/upsell-suggestions")
async def get_upsell_suggestions(max_price: int = 500, request: Request = None):
    """Get product suggestions for cart upsell — works for both guests and logged-in users"""
    from routes.auth_routes import get_current_user
    cart_product_ids = []
    try:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            import jwt
            payload = jwt.decode(token, os.environ.get("JWT_SECRET", "pigma-secret-2024"), algorithms=["HS256"])
            user_id = payload.get("user_id")
            if user_id:
                cart = await db.carts.find_one({"user_id": user_id}, {"_id": 0})
                cart_product_ids = [i["product_id"] for i in (cart.get("items", []) if cart else [])]
    except Exception:
        pass

    base_filter = {
        "is_active": True, "stock": {"$gt": 0},
        "product_id": {"$nin": cart_product_ids},
        "images.0": {"$exists": True}
    }

    # Priority 0: Admin-curated upsell products
    admin_picks = await db.upsell_products.find({}, {"_id": 0}).sort("priority", 1).to_list(20)
    admin_pick_ids = [u["product_id"] for u in admin_picks if u["product_id"] not in cart_product_ids]

    priority_products = []
    if admin_pick_ids:
        curated = await db.products.find(
            {"product_id": {"$in": admin_pick_ids}, "is_active": True, "stock": {"$gt": 0}, "images.0": {"$exists": True}},
            {"_id": 0}
        ).to_list(20)
        # Sort by admin priority
        pick_order = {pid: i for i, pid in enumerate(admin_pick_ids)}
        curated.sort(key=lambda p: pick_order.get(p["product_id"], 999))
        priority_products.extend(curated[:8])

    seen_ids = [p["product_id"] for p in priority_products]

    # Priority 1: Fill remaining slots with general products
    remaining = 8 - len(priority_products)
    if remaining > 0:
        general = await db.products.find(
            {**base_filter, "price": {"$lte": max_price},
             "product_id": {"$nin": cart_product_ids + seen_ids}},
            {"_id": 0}
        ).sort("created_at", -1).limit(remaining).to_list(remaining)
        priority_products.extend(general)
        seen_ids.extend([p["product_id"] for p in general])

    # Priority 2: Broader range items if still short
    remaining = 8 - len(priority_products)
    if remaining > 0:
        extra = await db.products.find(
            {**base_filter,
             "product_id": {"$nin": cart_product_ids + seen_ids}},
            {"_id": 0}
        ).sort("price", 1).limit(remaining).to_list(remaining)
        priority_products.extend(extra)

    return priority_products


# ============== ADMIN UPSELL MANAGEMENT ==============

@router.get("/admin/upsell-products")
async def get_admin_upsell_products(admin: Dict = Depends(get_admin_user)):
    """Get all admin-curated upsell products with their details"""
    upsells = await db.upsell_products.find({}, {"_id": 0}).sort("priority", 1).to_list(50)

    product_ids = [u["product_id"] for u in upsells]
    if not product_ids:
        return []

    products = await db.products.find(
        {"product_id": {"$in": product_ids}},
        {"_id": 0}
    ).to_list(50)
    prod_map = {p["product_id"]: p for p in products}

    result = []
    for u in upsells:
        p = prod_map.get(u["product_id"])
        if p:
            result.append({**p, "upsell_priority": u["priority"], "upsell_id": u["upsell_id"]})

    return result


@router.post("/admin/upsell-products")
async def add_upsell_product(data: Dict, admin: Dict = Depends(get_admin_user)):
    """Add a product to the upsell list"""
    product_id = data.get("product_id")
    if not product_id:
        raise HTTPException(status_code=400, detail="product_id required")

    product = await db.products.find_one({"product_id": product_id}, {"_id": 0, "product_id": 1, "name": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = await db.upsell_products.find_one({"product_id": product_id})
    if existing:
        raise HTTPException(status_code=400, detail="Product already in upsell list")

    max_pri = await db.upsell_products.find_one({}, sort=[("priority", -1)])
    priority = (max_pri.get("priority", 0) + 1) if max_pri else 1

    upsell = {
        "upsell_id": generate_id("ups_"),
        "product_id": product_id,
        "priority": data.get("priority", priority),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.upsell_products.insert_one(upsell)
    upsell.pop("_id", None)
    return {"message": f"Added {product['name']} to upsell list", **upsell}


@router.put("/admin/upsell-products/{upsell_id}")
async def update_upsell_priority(upsell_id: str, data: Dict, admin: Dict = Depends(get_admin_user)):
    """Update upsell product priority"""
    result = await db.upsell_products.update_one(
        {"upsell_id": upsell_id},
        {"$set": {"priority": data.get("priority", 1)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Upsell product not found")
    return {"message": "Priority updated"}


@router.delete("/admin/upsell-products/{upsell_id}")
async def remove_upsell_product(upsell_id: str, admin: Dict = Depends(get_admin_user)):
    """Remove a product from the upsell list"""
    result = await db.upsell_products.delete_one({"upsell_id": upsell_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Removed from upsell list"}
