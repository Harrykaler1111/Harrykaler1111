from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone

from config import db
from auth import get_admin_user, check_permission, generate_id

router = APIRouter(prefix="/policies", tags=["policies"])


# ============== PUBLIC ENDPOINTS ==============

@router.get("")
async def get_all_policies():
    """Get all published policies"""
    policies = await db.policies.find(
        {"is_published": True},
        {"_id": 0}
    ).sort("position", 1).to_list(20)
    return policies


@router.get("/{slug}")
async def get_policy_by_slug(slug: str):
    """Get a single policy by its slug"""
    policy = await db.policies.find_one(
        {"slug": slug, "is_published": True},
        {"_id": 0}
    )
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/all")
async def admin_get_all_policies(admin: Dict = Depends(get_admin_user)):
    """Admin: get all policies including unpublished"""
    policies = await db.policies.find({}, {"_id": 0}).sort("position", 1).to_list(20)
    return policies


@router.post("/admin")
async def create_policy(data: Dict, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "platform_settings", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    title = data.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    slug = data.get("slug", title.lower().replace(" ", "-").replace("&", "and"))

    existing = await db.policies.find_one({"slug": slug})
    if existing:
        raise HTTPException(status_code=400, detail="Policy with this slug already exists")

    max_pos = await db.policies.find_one({}, sort=[("position", -1)])
    position = (max_pos.get("position", 0) + 1) if max_pos else 1

    policy = {
        "policy_id": generate_id("pol_"),
        "title": title,
        "slug": slug,
        "content": data.get("content", ""),
        "position": data.get("position", position),
        "is_published": data.get("is_published", True),
        "last_updated_by": admin.get("name", "Admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.policies.insert_one(policy)
    policy.pop("_id", None)
    return policy


@router.put("/admin/{policy_id}")
async def update_policy(policy_id: str, data: Dict, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "platform_settings", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    policy = await db.policies.find_one({"policy_id": policy_id})
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    allowed = ["title", "slug", "content", "position", "is_published"]
    update = {k: v for k, v in data.items() if k in allowed}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["last_updated_by"] = admin.get("name", "Admin")

    await db.policies.update_one({"policy_id": policy_id}, {"$set": update})
    updated = await db.policies.find_one({"policy_id": policy_id}, {"_id": 0})
    return updated


@router.delete("/admin/{policy_id}")
async def delete_policy(policy_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "platform_settings", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.policies.delete_one({"policy_id": policy_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Policy not found")
    return {"message": "Policy deleted"}
