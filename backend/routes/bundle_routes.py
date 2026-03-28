from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone

from config import db
from auth import get_admin_user, check_permission, generate_id

router = APIRouter(prefix="/bundles", tags=["bundles"])

PRODUCT_FIELDS = {
    "_id": 0, "product_id": 1, "name": 1, "price": 1, "compare_price": 1,
    "images": 1, "sizes": 1, "colors": 1, "stock": 1, "category": 1,
    "description": 1, "average_rating": 1
}


def is_flash_active(bundle: Dict) -> bool:
    """Check if a flash sale is currently running"""
    start = bundle.get("flash_sale_start")
    end = bundle.get("flash_sale_end")
    if not start or not end:
        return False
    now = datetime.now(timezone.utc).isoformat()
    return start <= now <= end


def calc_bundle_pricing(bundle: Dict, products: List[Dict]) -> Dict:
    """Calculate bundle pricing including flash sale"""
    original_total = sum(p["price"] for p in products)

    # Base discount
    if bundle["discount_type"] == "percentage":
        base_discount = round(original_total * bundle["discount_value"] / 100, 2)
    else:
        base_discount = bundle["discount_value"]

    # Flash sale extra discount
    flash_active = is_flash_active(bundle)
    flash_extra = 0
    if flash_active:
        extra_type = bundle.get("flash_extra_discount_type", "percentage")
        extra_val = bundle.get("flash_extra_discount_value", 0)
        if extra_type == "percentage":
            flash_extra = round(original_total * extra_val / 100, 2)
        else:
            flash_extra = extra_val

    total_discount = min(base_discount + flash_extra, original_total)
    bundle_price = round(max(original_total - total_discount, 0), 2)

    return {
        "original_total": original_total,
        "base_discount": min(base_discount, original_total),
        "flash_extra_discount": flash_extra,
        "discount_amount": total_discount,
        "bundle_price": bundle_price,
        "flash_active": flash_active,
        "flash_sale_start": bundle.get("flash_sale_start"),
        "flash_sale_end": bundle.get("flash_sale_end"),
    }


async def populate_bundle(bundle: Dict, active_only: bool = True) -> Dict:
    """Populate products and calculate pricing for a bundle"""
    products = []
    for pid in bundle.get("product_ids", []):
        query = {"product_id": pid}
        if active_only:
            query["is_active"] = True
        product = await db.products.find_one(query, PRODUCT_FIELDS)
        if product:
            products.append(product)
    bundle["products"] = products
    bundle.update(calc_bundle_pricing(bundle, products))
    return bundle


# ============== PUBLIC ENDPOINTS ==============

@router.get("")
async def get_active_bundles():
    """Get all active bundles with populated product data"""
    bundles = await db.bundles.find({"is_active": True}, {"_id": 0}).sort("created_at", -1).to_list(50)
    for bundle in bundles:
        await populate_bundle(bundle)
    return bundles


@router.get("/flash-sales")
async def get_flash_sales():
    """Get bundles with active flash sales (running right now)"""
    now = datetime.now(timezone.utc).isoformat()
    bundles = await db.bundles.find({
        "is_active": True,
        "flash_sale_start": {"$lte": now},
        "flash_sale_end": {"$gte": now},
    }, {"_id": 0}).sort("flash_sale_end", 1).to_list(20)

    for bundle in bundles:
        await populate_bundle(bundle)
    return bundles


@router.get("/for-product/{product_id}")
async def get_bundles_for_product(product_id: str):
    """Get active bundles containing a specific product"""
    bundles = await db.bundles.find(
        {"product_ids": product_id, "is_active": True}, {"_id": 0}
    ).to_list(10)
    for bundle in bundles:
        await populate_bundle(bundle)
    return bundles


@router.get("/{bundle_id}")
async def get_bundle(bundle_id: str):
    """Get a single bundle with product details"""
    bundle = await db.bundles.find_one({"bundle_id": bundle_id}, {"_id": 0})
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    await populate_bundle(bundle)
    return bundle


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/all")
async def admin_get_all_bundles(admin: Dict = Depends(get_admin_user)):
    """Get all bundles (including inactive) for admin"""
    bundles = await db.bundles.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for bundle in bundles:
        await populate_bundle(bundle, active_only=False)
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
        # Flash sale fields
        "flash_sale_start": data.get("flash_sale_start"),
        "flash_sale_end": data.get("flash_sale_end"),
        "flash_extra_discount_type": data.get("flash_extra_discount_type", "percentage"),
        "flash_extra_discount_value": float(data.get("flash_extra_discount_value", 0)),
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
               "image", "badge_text", "is_active",
               "flash_sale_start", "flash_sale_end",
               "flash_extra_discount_type", "flash_extra_discount_value"}
    updates = {k: v for k, v in data.items() if k in allowed}

    if "product_ids" in updates:
        if len(updates["product_ids"]) < 2:
            raise HTTPException(status_code=400, detail="Bundle must contain at least 2 products")

    if "discount_type" in updates and updates["discount_type"] not in ("percentage", "flat"):
        raise HTTPException(status_code=400, detail="Invalid discount type")

    if "flash_extra_discount_value" in updates:
        updates["flash_extra_discount_value"] = float(updates["flash_extra_discount_value"])

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Check if flash sale is being newly activated
    was_flash = is_flash_active(bundle)
    await db.bundles.update_one({"bundle_id": bundle_id}, {"$set": updates})
    updated = await db.bundles.find_one({"bundle_id": bundle_id}, {"_id": 0})
    now_flash = is_flash_active(updated)

    # Trigger push notification if flash sale just started
    if now_flash and not was_flash:
        try:
            from routes.notification_routes import send_push_to_all
            await populate_bundle(updated)
            savings = updated.get("discount_amount", 0)
            await send_push_to_all(
                title=f"Flash Sale LIVE: {updated['name']}",
                body=f"Save Rs.{int(savings)} — Hurry, limited time only!",
                url=f"/bundle/{bundle_id}",
                tag=f"flash_{bundle_id}"
            )
        except Exception:
            pass  # Don't fail the update if notification fails

    return {"message": "Bundle updated", **updated}


@router.delete("/admin/{bundle_id}")
async def delete_bundle(bundle_id: str, admin: Dict = Depends(get_admin_user)):
    """Delete a bundle"""
    result = await db.bundles.delete_one({"bundle_id": bundle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bundle not found")
    return {"message": "Bundle deleted"}
