from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone

from config import db
from auth import get_admin_user, check_permission, generate_id

router = APIRouter(prefix="/bundles", tags=["bundles"])


# ============== PUBLIC ENDPOINTS ==============

@router.get("")
async def get_active_bundles():
    """Get all active bundles with populated product data"""
    bundles = await db.bundles.find({"is_active": True}, {"_id": 0}).sort("created_at", -1).to_list(50)

    for bundle in bundles:
        products = []
        for pid in bundle.get("product_ids", []):
            product = await db.products.find_one(
                {"product_id": pid, "is_active": True},
                {"_id": 0, "product_id": 1, "name": 1, "price": 1, "compare_price": 1,
                 "images": 1, "sizes": 1, "colors": 1, "stock": 1, "category": 1}
            )
            if product:
                products.append(product)
        bundle["products"] = products

        # Calculate bundle pricing
        original_total = sum(p["price"] for p in products)
        if bundle["discount_type"] == "percentage":
            discount_amount = round(original_total * bundle["discount_value"] / 100, 2)
        else:
            discount_amount = bundle["discount_value"]
        bundle["original_total"] = original_total
        bundle["discount_amount"] = min(discount_amount, original_total)
        bundle["bundle_price"] = round(max(original_total - discount_amount, 0), 2)

    return bundles


@router.get("/for-product/{product_id}")
async def get_bundles_for_product(product_id: str):
    """Get active bundles containing a specific product"""
    bundles = await db.bundles.find(
        {"product_ids": product_id, "is_active": True},
        {"_id": 0}
    ).to_list(10)

    for bundle in bundles:
        products = []
        for pid in bundle.get("product_ids", []):
            product = await db.products.find_one(
                {"product_id": pid, "is_active": True},
                {"_id": 0, "product_id": 1, "name": 1, "price": 1, "compare_price": 1,
                 "images": 1, "sizes": 1, "colors": 1, "stock": 1, "category": 1}
            )
            if product:
                products.append(product)
        bundle["products"] = products

        original_total = sum(p["price"] for p in products)
        if bundle["discount_type"] == "percentage":
            discount_amount = round(original_total * bundle["discount_value"] / 100, 2)
        else:
            discount_amount = bundle["discount_value"]
        bundle["original_total"] = original_total
        bundle["discount_amount"] = min(discount_amount, original_total)
        bundle["bundle_price"] = round(max(original_total - discount_amount, 0), 2)

    return bundles


@router.get("/{bundle_id}")
async def get_bundle(bundle_id: str):
    """Get a single bundle with product details"""
    bundle = await db.bundles.find_one({"bundle_id": bundle_id}, {"_id": 0})
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")

    products = []
    for pid in bundle.get("product_ids", []):
        product = await db.products.find_one(
            {"product_id": pid, "is_active": True},
            {"_id": 0, "product_id": 1, "name": 1, "price": 1, "compare_price": 1,
             "images": 1, "sizes": 1, "colors": 1, "stock": 1, "category": 1,
             "description": 1, "average_rating": 1}
        )
        if product:
            products.append(product)
    bundle["products"] = products

    original_total = sum(p["price"] for p in products)
    if bundle["discount_type"] == "percentage":
        discount_amount = round(original_total * bundle["discount_value"] / 100, 2)
    else:
        discount_amount = bundle["discount_value"]
    bundle["original_total"] = original_total
    bundle["discount_amount"] = min(discount_amount, original_total)
    bundle["bundle_price"] = round(max(original_total - discount_amount, 0), 2)

    return bundle


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/all")
async def admin_get_all_bundles(admin: Dict = Depends(get_admin_user)):
    """Get all bundles (including inactive) for admin"""
    bundles = await db.bundles.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

    for bundle in bundles:
        products = []
        for pid in bundle.get("product_ids", []):
            product = await db.products.find_one(
                {"product_id": pid},
                {"_id": 0, "product_id": 1, "name": 1, "price": 1, "images": 1, "is_active": 1}
            )
            if product:
                products.append(product)
        bundle["products"] = products
        original_total = sum(p["price"] for p in products)
        if bundle["discount_type"] == "percentage":
            discount_amount = round(original_total * bundle["discount_value"] / 100, 2)
        else:
            discount_amount = bundle["discount_value"]
        bundle["original_total"] = original_total
        bundle["discount_amount"] = min(discount_amount, original_total)
        bundle["bundle_price"] = round(max(original_total - discount_amount, 0), 2)

    return bundles


@router.post("/admin")
async def create_bundle(data: Dict, admin: Dict = Depends(get_admin_user)):
    """Create a new bundle deal"""
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Bundle name is required")

    product_ids = data.get("product_ids", [])
    if len(product_ids) < 2:
        raise HTTPException(status_code=400, detail="Bundle must contain at least 2 products")
    if len(product_ids) > 6:
        raise HTTPException(status_code=400, detail="Bundle can contain maximum 6 products")

    discount_type = data.get("discount_type", "percentage")
    if discount_type not in ("percentage", "flat"):
        raise HTTPException(status_code=400, detail="Invalid discount type")

    discount_value = float(data.get("discount_value", 0))
    if discount_value <= 0:
        raise HTTPException(status_code=400, detail="Discount value must be greater than 0")
    if discount_type == "percentage" and discount_value > 50:
        raise HTTPException(status_code=400, detail="Percentage discount cannot exceed 50%")

    bundle_id = generate_id("bundle_")
    bundle_doc = {
        "bundle_id": bundle_id,
        "name": name,
        "description": data.get("description", ""),
        "product_ids": product_ids,
        "discount_type": discount_type,
        "discount_value": discount_value,
        "image": data.get("image", ""),
        "badge_text": data.get("badge_text", "DEAL"),
        "is_active": data.get("is_active", True),
        "created_by": admin.get("admin_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.bundles.insert_one(bundle_doc)
    bundle_doc.pop("_id", None)
    return {"message": "Bundle created", **bundle_doc}


@router.put("/admin/{bundle_id}")
async def update_bundle(bundle_id: str, data: Dict, admin: Dict = Depends(get_admin_user)):
    """Update a bundle"""
    bundle = await db.bundles.find_one({"bundle_id": bundle_id}, {"_id": 0})
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")

    allowed = {"name", "description", "product_ids", "discount_type", "discount_value",
               "image", "badge_text", "is_active"}
    updates = {k: v for k, v in data.items() if k in allowed}

    if "product_ids" in updates:
        if len(updates["product_ids"]) < 2:
            raise HTTPException(status_code=400, detail="Bundle must contain at least 2 products")

    if "discount_type" in updates and updates["discount_type"] not in ("percentage", "flat"):
        raise HTTPException(status_code=400, detail="Invalid discount type")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.bundles.update_one({"bundle_id": bundle_id}, {"$set": updates})
    updated = await db.bundles.find_one({"bundle_id": bundle_id}, {"_id": 0})
    return {"message": "Bundle updated", **updated}


@router.delete("/admin/{bundle_id}")
async def delete_bundle(bundle_id: str, admin: Dict = Depends(get_admin_user)):
    """Delete a bundle"""
    result = await db.bundles.delete_one({"bundle_id": bundle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bundle not found")
    return {"message": "Bundle deleted"}
