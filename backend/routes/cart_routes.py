from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List
from datetime import datetime, timezone

from config import db
from models.schemas import CartItem, CartResponse
from auth import get_current_user, generate_id

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
            total += product["price"] * item["quantity"]

    cart["total"] = total
    return CartResponse(**cart)


@router.post("/add", response_model=CartResponse)
async def add_to_cart(item: CartItem, user: Dict = Depends(get_current_user)):
    product = await db.products.find_one({"product_id": item.product_id, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product["stock"] < item.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

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
            item_exists = True
            break

    if not item_exists:
        cart["items"].append(item.model_dump())

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
async def get_upsell_suggestions(max_price: int = 300, user: Dict = Depends(get_current_user)):
    """Get product suggestions under max_price for cart upsell"""
    cart = await db.carts.find_one({"user_id": user["user_id"]}, {"_id": 0})
    cart_product_ids = [i["product_id"] for i in (cart.get("items", []) if cart else [])]

    products = await db.products.find(
        {"is_active": True, "price": {"$lte": max_price}, "stock": {"$gt": 0}, "product_id": {"$nin": cart_product_ids}},
        {"_id": 0}
    ).sort("created_at", -1).limit(8).to_list(8)

    if len(products) < 4:
        extra = await db.products.find(
            {"is_active": True, "price": {"$lte": 500}, "stock": {"$gt": 0}, "product_id": {"$nin": cart_product_ids + [p["product_id"] for p in products]}},
            {"_id": 0}
        ).limit(8 - len(products)).to_list(8 - len(products))
        products.extend(extra)

    return products
