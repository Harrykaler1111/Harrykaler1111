from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from config import db
from auth import get_admin_user, check_permission

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/settings", tags=["admin-settings"])

DEFAULT_SETTINGS = {
    "setting_id": "global",
    "commission_enabled": True,
    "platform_commission_rate": 15.0,
    "influencer_commission_rate": 10.0,
    "reseller_commission_rate": 5.0,
    "collab_platform_fee": 5.0,
    "min_withdrawal_amount": 1000,
    "auto_settle_on_delivery": True,
    "vendor_referral_commission": 1.0,
    "influencer_referral_commission": 1.0,
    "commission_targets": [],
    "commission_rewards": [],
    "updated_at": None,
    "updated_by": None,
}


class CommissionSettingsUpdate(BaseModel):
    commission_enabled: Optional[bool] = None
    platform_commission_rate: Optional[float] = None
    influencer_commission_rate: Optional[float] = None
    reseller_commission_rate: Optional[float] = None
    collab_platform_fee: Optional[float] = None
    min_withdrawal_amount: Optional[float] = None
    auto_settle_on_delivery: Optional[bool] = None
    vendor_referral_commission: Optional[float] = None
    influencer_referral_commission: Optional[float] = None
    meta_pixel_id: Optional[str] = None
    google_ads_id: Optional[str] = None


class CommissionTarget(BaseModel):
    name: str
    target_type: str  # "influencer", "reseller", "vendor"
    target_amount: float
    reward_type: str  # "bonus", "rate_increase"
    reward_value: float
    is_active: bool = True


@router.get("/commission")
async def get_commission_settings(admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "platform_settings", "view") and not check_permission(admin, "commissions", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    settings = await db.platform_settings.find_one({"setting_id": "global"}, {"_id": 0})
    if not settings:
        await db.platform_settings.insert_one(DEFAULT_SETTINGS.copy())
        settings = DEFAULT_SETTINGS.copy()

    return settings


@router.put("/commission")
async def update_commission_settings(data: CommissionSettingsUpdate, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "platform_settings", "edit"):
        raise HTTPException(status_code=403, detail="Only Super Admin can modify commission settings")

    settings = await db.platform_settings.find_one({"setting_id": "global"}, {"_id": 0})
    if not settings:
        await db.platform_settings.insert_one(DEFAULT_SETTINGS.copy())

    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_fields["updated_by"] = admin["admin_id"]

    await db.platform_settings.update_one(
        {"setting_id": "global"},
        {"$set": update_fields}
    )

    # Log the change
    await db.suspension_logs.insert_one({
        "log_id": f"settings_{datetime.now(timezone.utc).timestamp()}",
        "entity_type": "platform_settings",
        "entity_id": "global",
        "entity_name": "Commission Settings",
        "action": "update",
        "reason": f"Updated: {', '.join(update_fields.keys())}",
        "admin_id": admin["admin_id"],
        "admin_name": admin["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    logger.info(f"Commission settings updated by {admin['name']}: {update_fields}")
    return {"message": "Commission settings updated", "updated": update_fields}


@router.post("/commission/targets")
async def add_commission_target(target: CommissionTarget, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "platform_settings", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    target_doc = {
        **target.model_dump(),
        "target_id": f"target_{datetime.now(timezone.utc).timestamp()}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["admin_id"],
    }

    await db.platform_settings.update_one(
        {"setting_id": "global"},
        {"$push": {"commission_targets": target_doc}}
    )

    return {"message": "Target added", "target": target_doc}


@router.delete("/commission/targets/{target_id}")
async def remove_commission_target(target_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "platform_settings", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    await db.platform_settings.update_one(
        {"setting_id": "global"},
        {"$pull": {"commission_targets": {"target_id": target_id}}}
    )

    return {"message": "Target removed"}


@router.post("/commission/rewards")
async def add_commission_reward(target: CommissionTarget, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "platform_settings", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    reward_doc = {
        **target.model_dump(),
        "reward_id": f"reward_{datetime.now(timezone.utc).timestamp()}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["admin_id"],
    }

    await db.platform_settings.update_one(
        {"setting_id": "global"},
        {"$push": {"commission_rewards": reward_doc}}
    )

    return {"message": "Reward added", "reward": reward_doc}


@router.delete("/commission/rewards/{reward_id}")
async def remove_commission_reward(reward_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "platform_settings", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    await db.platform_settings.update_one(
        {"setting_id": "global"},
        {"$pull": {"commission_rewards": {"reward_id": reward_id}}}
    )

    return {"message": "Reward removed"}


# ============== CATEGORIES MANAGEMENT ==============

@router.get("/categories")
async def get_categories(admin: Dict = Depends(get_admin_user)):
    categories = await db.categories.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    return categories


@router.post("/categories")
async def create_category(name: str, description: str = "", admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "categories", "create"):
        raise HTTPException(status_code=403, detail="Permission denied")

    existing = await db.categories.find_one({"name": name})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")

    cat_doc = {
        "category_id": f"cat_{datetime.now(timezone.utc).timestamp()}",
        "name": name,
        "description": description,
        "product_count": 0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["admin_id"],
    }

    await db.categories.insert_one(cat_doc)
    return {"message": "Category created", "category": {k: v for k, v in cat_doc.items() if k != "_id"}}


@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "categories", "delete"):
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.categories.delete_one({"category_id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")

    return {"message": "Category deleted"}
