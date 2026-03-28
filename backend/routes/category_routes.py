from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone

from config import db
from auth import get_admin_user, check_permission, generate_id

router = APIRouter(prefix="/categories", tags=["categories"])


# ============== PUBLIC ENDPOINTS ==============

@router.get("")
async def get_categories():
    """Get all active categories with their sub-categories"""
    categories = await db.categories.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("position", 1).to_list(100)

    for cat in categories:
        subs = await db.sub_categories.find(
            {"category_id": cat["category_id"], "is_active": True},
            {"_id": 0}
        ).sort("position", 1).to_list(50)
        cat["sub_categories"] = subs

    return categories


@router.get("/{category_id}")
async def get_category(category_id: str):
    cat = await db.categories.find_one({"category_id": category_id, "is_active": True}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    subs = await db.sub_categories.find(
        {"category_id": category_id, "is_active": True},
        {"_id": 0}
    ).sort("position", 1).to_list(50)
    cat["sub_categories"] = subs
    return cat


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/all")
async def admin_get_all_categories(admin: Dict = Depends(get_admin_user)):
    """Admin: get all categories including inactive"""
    categories = await db.categories.find({}, {"_id": 0}).sort("position", 1).to_list(100)
    for cat in categories:
        subs = await db.sub_categories.find(
            {"category_id": cat["category_id"]}, {"_id": 0}
        ).sort("position", 1).to_list(50)
        cat["sub_categories"] = subs
        cat["product_count"] = await db.products.count_documents({"category": cat["name"], "is_active": True})
    return categories


@router.post("/admin")
async def create_category(data: Dict, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "products", "create"):
        raise HTTPException(status_code=403, detail="Permission denied")

    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")

    existing = await db.categories.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")

    max_pos = await db.categories.find_one({}, sort=[("position", -1)])
    position = (max_pos.get("position", 0) + 1) if max_pos else 1

    cat = {
        "category_id": generate_id("cat_"),
        "name": name,
        "slug": name.lower().replace(" ", "-"),
        "description": data.get("description", ""),
        "image": data.get("image", ""),
        "position": data.get("position", position),
        "is_active": True,
        "show_in_nav": data.get("show_in_nav", True),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.categories.insert_one(cat)
    cat.pop("_id", None)
    return cat


@router.put("/admin/{category_id}")
async def update_category(category_id: str, data: Dict, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "products", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    cat = await db.categories.find_one({"category_id": category_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    old_name = cat.get("name")
    allowed = ["name", "description", "image", "position", "is_active", "show_in_nav"]
    update = {k: v for k, v in data.items() if k in allowed}

    if "name" in update:
        update["slug"] = update["name"].lower().replace(" ", "-")
        # Update products with old category name
        if update["name"] != old_name:
            await db.products.update_many(
                {"category": old_name},
                {"$set": {"category": update["name"]}}
            )

    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.categories.update_one({"category_id": category_id}, {"$set": update})
    updated = await db.categories.find_one({"category_id": category_id}, {"_id": 0})
    return updated


@router.delete("/admin/{category_id}")
async def delete_category(category_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "products", "delete"):
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.categories.delete_one({"category_id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")

    # Also delete sub-categories
    await db.sub_categories.delete_many({"category_id": category_id})
    return {"message": "Category deleted"}


# ============== SUB-CATEGORY ENDPOINTS ==============

@router.post("/admin/{category_id}/sub")
async def create_sub_category(category_id: str, data: Dict, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "products", "create"):
        raise HTTPException(status_code=403, detail="Permission denied")

    cat = await db.categories.find_one({"category_id": category_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Parent category not found")

    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Sub-category name is required")

    max_pos = await db.sub_categories.find_one({"category_id": category_id}, sort=[("position", -1)])
    position = (max_pos.get("position", 0) + 1) if max_pos else 1

    sub = {
        "sub_category_id": generate_id("subcat_"),
        "category_id": category_id,
        "category_name": cat["name"],
        "name": name,
        "slug": name.lower().replace(" ", "-"),
        "description": data.get("description", ""),
        "position": data.get("position", position),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sub_categories.insert_one(sub)
    sub.pop("_id", None)
    return sub


@router.put("/admin/sub/{sub_category_id}")
async def update_sub_category(sub_category_id: str, data: Dict, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "products", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    sub = await db.sub_categories.find_one({"sub_category_id": sub_category_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Sub-category not found")

    old_name = sub.get("name")
    allowed = ["name", "description", "position", "is_active"]
    update = {k: v for k, v in data.items() if k in allowed}

    if "name" in update:
        update["slug"] = update["name"].lower().replace(" ", "-")
        if update["name"] != old_name:
            await db.products.update_many(
                {"sub_category": old_name},
                {"$set": {"sub_category": update["name"]}}
            )

    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.sub_categories.update_one({"sub_category_id": sub_category_id}, {"$set": update})
    updated = await db.sub_categories.find_one({"sub_category_id": sub_category_id}, {"_id": 0})
    return updated


@router.delete("/admin/sub/{sub_category_id}")
async def delete_sub_category(sub_category_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "products", "delete"):
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.sub_categories.delete_one({"sub_category_id": sub_category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sub-category not found")
    return {"message": "Sub-category deleted"}
