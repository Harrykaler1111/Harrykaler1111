from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging

from config import db
from models.schemas import SuspensionLogResponse
from auth import get_admin_user, check_permission, generate_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/user-control", tags=["admin-user-control"])

VALID_ACTIONS = ["suspend", "disconnect", "discontinue", "reactivate"]
BLOCKED_STATUSES = ("suspended", "disconnected", "discontinued")


async def log_action(entity_type: str, entity_id: str, entity_name: str, action: str, reason: str, admin: Dict):
    await db.suspension_logs.insert_one({
        "log_id": generate_id("log_"),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_name": entity_name,
        "action": action,
        "reason": reason,
        "admin_id": admin["admin_id"],
        "admin_name": admin["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })


async def apply_vendor_side_effects(vendor_id: str, action: str):
    if action in ("suspend", "disconnect", "discontinue"):
        await db.vendor_products.update_many(
            {"vendor_id": vendor_id},
            {"$set": {"is_active": False}}
        )
        await db.products.update_many(
            {"vendor_id": vendor_id},
            {"$set": {"is_active": False}}
        )
        logger.info(f"Vendor {vendor_id} products hidden due to {action}")
    elif action == "reactivate":
        await db.vendor_products.update_many(
            {"vendor_id": vendor_id, "approval_status": "approved"},
            {"$set": {"is_active": True}}
        )
        await db.products.update_many(
            {"vendor_id": vendor_id, "is_vendor_product": True},
            {"$set": {"is_active": True}}
        )
        logger.info(f"Vendor {vendor_id} products restored after reactivation")


async def apply_influencer_side_effects(influencer_id: str, action: str):
    if action in ("suspend", "disconnect", "discontinue"):
        await db.influencers.update_one(
            {"influencer_id": influencer_id},
            {"$set": {"automation_enabled": False}}
        )
        logger.info(f"Influencer {influencer_id} automation disabled due to {action}")


# ============== VENDOR ACTIONS ==============

@router.put("/vendor/{vendor_id}/{action}")
async def vendor_action(vendor_id: str, action: str, reason: str = "Policy violation", admin: Dict = Depends(get_admin_user)):
    if action not in VALID_ACTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid action. Must be one of: {VALID_ACTIONS}")

    perm_action = "reactivate" if action == "reactivate" else ("disconnect" if action in ("disconnect", "discontinue") else "suspend")
    if not check_permission(admin, "vendors", perm_action):
        raise HTTPException(status_code=403, detail="Permission denied")

    vendor = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    if action == "reactivate":
        new_status = "approved"
    elif action == "discontinue":
        new_status = "discontinued"
    else:
        new_status = action + "ed" if not action.endswith("ed") else action

    await db.vendors.update_one(
        {"vendor_id": vendor_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    await apply_vendor_side_effects(vendor_id, action)
    await log_action("vendor", vendor_id, vendor.get("store_name", ""), action, reason, admin)

    return {"message": f"Vendor {action}d successfully", "new_status": new_status}


# ============== INFLUENCER ACTIONS ==============

@router.put("/influencer/{influencer_id}/{action}")
async def influencer_action(influencer_id: str, action: str, reason: str = "Policy violation", admin: Dict = Depends(get_admin_user)):
    if action not in VALID_ACTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid action. Must be one of: {VALID_ACTIONS}")

    perm_action = "reactivate" if action == "reactivate" else ("disconnect" if action in ("disconnect", "discontinue") else "suspend")
    if not check_permission(admin, "influencers", perm_action):
        raise HTTPException(status_code=403, detail="Permission denied")

    influencer = await db.influencers.find_one({"influencer_id": influencer_id}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")

    if action == "reactivate":
        new_status = "approved"
    elif action == "discontinue":
        new_status = "discontinued"
    else:
        new_status = action + "ed" if not action.endswith("ed") else action

    await db.influencers.update_one(
        {"influencer_id": influencer_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    await apply_influencer_side_effects(influencer_id, action)
    await log_action("influencer", influencer_id, influencer.get("name", ""), action, reason, admin)

    return {"message": f"Influencer {action}d successfully", "new_status": new_status}


# ============== RESELLER ACTIONS ==============

@router.put("/reseller/{reseller_id}/{action}")
async def reseller_action(reseller_id: str, action: str, reason: str = "Policy violation", admin: Dict = Depends(get_admin_user)):
    if action not in VALID_ACTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid action. Must be one of: {VALID_ACTIONS}")

    perm_action = "reactivate" if action == "reactivate" else "suspend"
    if not check_permission(admin, "resellers", perm_action):
        raise HTTPException(status_code=403, detail="Permission denied")

    reseller = await db.resellers.find_one({"reseller_id": reseller_id}, {"_id": 0})
    if not reseller:
        raise HTTPException(status_code=404, detail="Reseller not found")

    if action == "reactivate":
        new_status = "approved"
    elif action == "discontinue":
        new_status = "discontinued"
    else:
        new_status = action + "ed" if not action.endswith("ed") else action

    await db.resellers.update_one(
        {"reseller_id": reseller_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    await log_action("reseller", reseller_id, reseller.get("name", ""), action, reason, admin)

    return {"message": f"Reseller {action}d successfully", "new_status": new_status}


# ============== SUSPENSION HISTORY ==============

@router.get("/history")
async def get_all_suspension_history(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    admin: Dict = Depends(get_admin_user)
):
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id

    logs = await db.suspension_logs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return logs


@router.get("/history/{entity_type}/{entity_id}")
async def get_entity_history(entity_type: str, entity_id: str, admin: Dict = Depends(get_admin_user)):
    logs = await db.suspension_logs.find(
        {"entity_type": entity_type, "entity_id": entity_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return logs
