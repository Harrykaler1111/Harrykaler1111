from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from config import db
from auth import get_admin_user, get_current_user, generate_id
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/booster", tags=["cart-booster"])


# ============== SCHEMAS ==============

class BoosterSlab(BaseModel):
    min_cart_value: float
    reward_type: str = "fixed"  # fixed, percentage, free_item
    reward_value: float = 0
    reward_label: str = ""  # e.g. "₹100 OFF"
    free_item_id: Optional[str] = None
    is_enabled: bool = True
    start_date: Optional[str] = None  # ISO datetime for time-based offers
    end_date: Optional[str] = None
    excluded_categories: List[str] = []
    excluded_products: List[str] = []


class BoosterMessages(BaseModel):
    bar_prefix: str = "Add"
    bar_suffix: str = "more to unlock reward"
    unlocked_text: str = "Reward unlocked!"
    max_unlocked_text: str = "Maximum reward unlocked!"
    urgency_text: str = "Almost there! Don't miss your discount"
    upsell_button_text: str = "View items under ₹300"
    near_threshold_text: str = "You're just {amount} away from saving {reward}"


# ============== PUBLIC ENDPOINTS ==============

@router.get("/config")
async def get_booster_config():
    """Public: Get active booster slabs and messages for frontend"""
    now = datetime.now(timezone.utc).isoformat()

    slabs_raw = await db.booster_slabs.find({"is_enabled": True}, {"_id": 0}).sort("min_cart_value", 1).to_list(20)

    # Filter by date range
    slabs = []
    for s in slabs_raw:
        start = s.get("start_date")
        end = s.get("end_date")
        if start and start > now:
            continue
        if end and end < now:
            continue
        slabs.append(s)

    messages = await db.site_settings.find_one({"setting_id": "booster_messages"}, {"_id": 0})
    if not messages:
        messages = BoosterMessages().model_dump()

    return {"slabs": slabs, "messages": messages}


@router.post("/track-unlock")
async def track_slab_unlock(slab_id: str, user: Dict = Depends(get_current_user)):
    """Track when a user unlocks a slab (for analytics)"""
    await db.booster_analytics.insert_one({
        "event_id": generate_id("bev_"),
        "user_id": user["user_id"],
        "slab_id": slab_id,
        "event": "slab_unlocked",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Tracked"}


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/slabs")
async def get_all_slabs(admin: Dict = Depends(get_admin_user)):
    """Admin: Get all slabs including disabled ones"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin")
    slabs = await db.booster_slabs.find({}, {"_id": 0}).sort("min_cart_value", 1).to_list(50)
    return slabs


@router.post("/admin/slabs")
async def create_slab(slab: BoosterSlab, admin: Dict = Depends(get_admin_user)):
    """Admin: Create a new booster slab"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin")

    doc = {
        **slab.model_dump(),
        "slab_id": generate_id("slab_"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["admin_id"]
    }
    await db.booster_slabs.insert_one(doc)
    doc.pop("_id", None)
    return {"message": "Slab created", "slab": doc}


@router.put("/admin/slabs/{slab_id}")
async def update_slab(slab_id: str, slab: BoosterSlab, admin: Dict = Depends(get_admin_user)):
    """Admin: Update a booster slab"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin")

    result = await db.booster_slabs.update_one(
        {"slab_id": slab_id},
        {"$set": {**slab.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Slab not found")
    return {"message": "Slab updated"}


@router.delete("/admin/slabs/{slab_id}")
async def delete_slab(slab_id: str, admin: Dict = Depends(get_admin_user)):
    """Admin: Delete a booster slab"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin")
    result = await db.booster_slabs.delete_one({"slab_id": slab_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Slab not found")
    return {"message": "Slab deleted"}


@router.get("/admin/messages")
async def get_booster_messages(admin: Dict = Depends(get_admin_user)):
    """Admin: Get custom messages"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin")
    messages = await db.site_settings.find_one({"setting_id": "booster_messages"}, {"_id": 0})
    if not messages:
        return {**BoosterMessages().model_dump(), "setting_id": "booster_messages"}
    return messages


@router.put("/admin/messages")
async def update_booster_messages(data: BoosterMessages, admin: Dict = Depends(get_admin_user)):
    """Admin: Update custom booster messages"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin")

    await db.site_settings.update_one(
        {"setting_id": "booster_messages"},
        {"$set": {**data.model_dump(), "setting_id": "booster_messages", "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Messages updated"}


@router.get("/admin/analytics")
async def get_booster_analytics(admin: Dict = Depends(get_admin_user)):
    """Admin: Get booster analytics"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin")

    # Slab unlock counts
    pipeline = [
        {"$match": {"event": "slab_unlocked"}},
        {"$group": {"_id": "$slab_id", "count": {"$sum": 1}, "unique_users": {"$addToSet": "$user_id"}}},
        {"$project": {"slab_id": "$_id", "unlock_count": "$count", "unique_users": {"$size": "$unique_users"}, "_id": 0}}
    ]
    slab_stats = await db.booster_analytics.aggregate(pipeline).to_list(50)

    # Total unlock events
    total_unlocks = await db.booster_analytics.count_documents({"event": "slab_unlocked"})

    # Recent orders for AOV calculation
    recent_orders = await db.orders.find(
        {"payment_status": "paid"}, {"_id": 0, "total": 1, "created_at": 1}
    ).sort("created_at", -1).limit(100).to_list(100)

    aov = round(sum(o.get("total", 0) for o in recent_orders) / max(len(recent_orders), 1), 2)

    # Orders with booster discount
    boosted_orders = await db.orders.count_documents({"booster_discount": {"$gt": 0}})

    return {
        "slab_stats": slab_stats,
        "total_unlocks": total_unlocks,
        "average_order_value": aov,
        "total_recent_orders": len(recent_orders),
        "boosted_orders": boosted_orders
    }


# ============== SEED DEFAULT SLABS ==============

async def seed_default_slabs():
    """Seed default booster slabs if none exist"""
    count = await db.booster_slabs.count_documents({})
    if count == 0:
        defaults = [
            {
                "slab_id": generate_id("slab_"),
                "min_cart_value": 1200,
                "reward_type": "fixed",
                "reward_value": 100,
                "reward_label": "₹100 OFF",
                "is_enabled": True,
                "excluded_categories": [],
                "excluded_products": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "slab_id": generate_id("slab_"),
                "min_cart_value": 3330,
                "reward_type": "fixed",
                "reward_value": 200,
                "reward_label": "₹200 OFF",
                "is_enabled": True,
                "excluded_categories": [],
                "excluded_products": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "slab_id": generate_id("slab_"),
                "min_cart_value": 5999,
                "reward_type": "percentage",
                "reward_value": 5,
                "reward_label": "5% OFF",
                "is_enabled": True,
                "excluded_categories": [],
                "excluded_products": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.booster_slabs.insert_many(defaults)
        logger.info("Seeded default booster slabs")
