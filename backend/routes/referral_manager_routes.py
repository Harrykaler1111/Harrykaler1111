from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from config import db
from auth import get_admin_user, get_current_user, get_current_vendor, check_permission, generate_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/referrals", tags=["referral-commissions"])


# ========== REFERRAL COMMISSION TRACKING ==========

@router.get("/stats")
async def get_referral_stats(admin: Dict = Depends(get_admin_user)):
    """Get referral commission stats"""
    settings = await db.platform_settings.find_one({"setting_id": "global"}, {"_id": 0})
    vendor_rate = settings.get("vendor_referral_commission", 1.0) if settings else 1.0
    influencer_rate = settings.get("influencer_referral_commission", 1.0) if settings else 1.0

    vendor_referrals = await db.vendor_referrals.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    influencer_referrals = await db.influencer_referrals.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

    return {
        "vendor_referral_rate": vendor_rate,
        "influencer_referral_rate": influencer_rate,
        "vendor_referrals": vendor_referrals,
        "influencer_referrals": influencer_referrals,
        "total_vendor_referrals": len(vendor_referrals),
        "total_influencer_referrals": len(influencer_referrals),
    }


class CustomCommission(BaseModel):
    user_id: str
    user_type: str
    custom_rate: float


@router.put("/custom-rate")
async def set_custom_referral_rate(data: CustomCommission, admin: Dict = Depends(get_admin_user)):
    """Super admin sets custom referral rate for a specific user"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can set custom rates")

    await db.custom_referral_rates.update_one(
        {"user_id": data.user_id, "user_type": data.user_type},
        {"$set": {
            "user_id": data.user_id,
            "user_type": data.user_type,
            "custom_rate": data.custom_rate,
            "set_by": admin.get("admin_id", ""),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": f"Custom referral rate set to {data.custom_rate}% for {data.user_id}"}


# ========== VENDOR REFERRAL ==========

@router.post("/vendor/record")
async def record_vendor_referral(referred_vendor_id: str, referrer_vendor_id: str, admin: Dict = Depends(get_admin_user)):
    """Record a vendor referral (vendor referred another vendor)"""
    existing = await db.vendor_referrals.find_one({
        "referred_vendor_id": referred_vendor_id, "referrer_vendor_id": referrer_vendor_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="This referral already exists")

    referral = {
        "referral_id": generate_id("vref_"),
        "referrer_vendor_id": referrer_vendor_id,
        "referred_vendor_id": referred_vendor_id,
        "total_commission_earned": 0.0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.vendor_referrals.insert_one(referral)
    return {"message": "Vendor referral recorded", "referral_id": referral["referral_id"]}


# ========== DEDICATED MANAGER SYSTEM ==========

class AssignManager(BaseModel):
    target_id: str
    target_type: str
    manager_admin_id: str


@router.post("/managers/assign")
async def assign_manager(data: AssignManager, admin: Dict = Depends(get_admin_user)):
    """Assign a dedicated manager (admin user) to a vendor/influencer/user"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can assign managers")

    manager = await db.admin_users.find_one({"admin_id": data.manager_admin_id}, {"_id": 0})
    if not manager:
        raise HTTPException(status_code=404, detail="Manager admin not found")

    target_collection = {
        "vendor": "vendors", "influencer": "influencers", "user": "users"
    }.get(data.target_type)
    if not target_collection:
        raise HTTPException(status_code=400, detail="Invalid target type")

    id_field = {"vendor": "vendor_id", "influencer": "influencer_id", "user": "user_id"}.get(data.target_type)
    target = await db[target_collection].find_one({id_field: data.target_id})
    if not target:
        raise HTTPException(status_code=404, detail=f"{data.target_type} not found")

    assignment = {
        "assignment_id": generate_id("mgr_"),
        "target_id": data.target_id,
        "target_type": data.target_type,
        "manager_admin_id": data.manager_admin_id,
        "manager_name": manager.get("name", ""),
        "manager_email": manager.get("email", ""),
        "manager_role": manager.get("role", ""),
        "is_active": True,
        "assigned_by": admin.get("admin_id", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.manager_assignments.update_one(
        {"target_id": data.target_id, "target_type": data.target_type},
        {"$set": assignment},
        upsert=True
    )

    return {"message": f"Manager assigned to {data.target_type}", "assignment": {k: v for k, v in assignment.items() if k != "_id"}}


@router.get("/managers")
async def get_all_manager_assignments(
    target_type: Optional[str] = None,
    admin: Dict = Depends(get_admin_user)
):
    """Get all manager assignments"""
    query = {"is_active": True}
    if target_type:
        query["target_type"] = target_type
    assignments = await db.manager_assignments.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return assignments


@router.get("/managers/{target_type}/{target_id}")
async def get_assigned_manager(target_type: str, target_id: str):
    """Public: Get the manager assigned to a vendor/influencer"""
    assignment = await db.manager_assignments.find_one(
        {"target_id": target_id, "target_type": target_type, "is_active": True},
        {"_id": 0}
    )
    if not assignment:
        return {"has_manager": False}
    return {
        "has_manager": True,
        "manager_name": assignment.get("manager_name", ""),
        "manager_email": assignment.get("manager_email", ""),
    }


@router.delete("/managers/{target_type}/{target_id}")
async def remove_manager(target_type: str, target_id: str, admin: Dict = Depends(get_admin_user)):
    """Remove manager assignment"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can remove managers")

    result = await db.manager_assignments.update_one(
        {"target_id": target_id, "target_type": target_type},
        {"$set": {"is_active": False, "removed_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"message": "Manager assignment removed"}
