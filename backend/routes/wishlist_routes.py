from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List
from datetime import datetime, timezone

from config import db
from models.schemas import WishlistItem, ProductResponse
from auth import get_current_user

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=List[ProductResponse])
async def get_wishlist(user: Dict = Depends(get_current_user)):
    wishlist = await db.wishlists.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not wishlist:
        return []

    products = []
    for product_id in wishlist.get("product_ids", []):
        product = await db.products.find_one({"product_id": product_id, "is_active": True}, {"_id": 0})
        if product:
            products.append(ProductResponse(**product))

    return products


@router.post("/add")
async def add_to_wishlist(item: WishlistItem, user: Dict = Depends(get_current_user)):
    product = await db.products.find_one({"product_id": item.product_id, "is_active": True})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    await db.wishlists.update_one(
        {"user_id": user["user_id"]},
        {"$addToSet": {"product_ids": item.product_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    return {"message": "Added to wishlist"}


@router.delete("/{product_id}")
async def remove_from_wishlist(product_id: str, user: Dict = Depends(get_current_user)):
    await db.wishlists.update_one(
        {"user_id": user["user_id"]},
        {"$pull": {"product_ids": product_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Removed from wishlist"}
