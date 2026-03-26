from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from config import db
from auth import get_admin_user, check_permission, generate_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/rewards", tags=["rewards"])


class CreateRewardCampaign(BaseModel):
    title: str
    description: str
    target_amount: float
    reward_description: str
    reward_image: Optional[str] = None
    target_user_types: List[str] = ["vendor", "influencer"]
    start_date: str
    end_date: str


class TagUserToCampaign(BaseModel):
    user_id: str
    user_type: str
    user_name: Optional[str] = None


# ========== CAMPAIGN CRUD ==========

@router.post("/campaigns")
async def create_reward_campaign(data: CreateRewardCampaign, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "platform_settings", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    campaign = {
        "campaign_id": generate_id("rwc_"),
        "title": data.title,
        "description": data.description,
        "target_amount": data.target_amount,
        "reward_description": data.reward_description,
        "reward_image": data.reward_image,
        "target_user_types": data.target_user_types,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "is_active": True,
        "tagged_users": [],
        "created_by": admin["admin_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reward_campaigns.insert_one(campaign)
    campaign.pop("_id", None)
    return {"message": "Campaign created", "campaign": campaign}


@router.get("/campaigns")
async def list_reward_campaigns(active_only: bool = False, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "platform_settings", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    query = {"is_active": True} if active_only else {}
    campaigns = await db.reward_campaigns.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)

    for c in campaigns:
        for user in c.get("tagged_users", []):
            if user["user_type"] == "vendor":
                vendor = await db.vendors.find_one({"vendor_id": user["user_id"]}, {"_id": 0, "total_sales": 1})
                user["current_progress"] = vendor.get("total_sales", 0) if vendor else 0
            elif user["user_type"] == "influencer":
                links = await db.vendor_influencer_links.find(
                    {"influencer_id": user["user_id"]}, {"_id": 0, "sales_revenue": 1}
                ).to_list(100)
                user["current_progress"] = sum(l.get("sales_revenue", 0) for l in links)
            user["target_reached"] = user.get("current_progress", 0) >= c["target_amount"]

    return campaigns


@router.post("/campaigns/{campaign_id}/tag")
async def tag_user_to_campaign(campaign_id: str, data: TagUserToCampaign, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "platform_settings", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    campaign = await db.reward_campaigns.find_one({"campaign_id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    existing = [u for u in campaign.get("tagged_users", []) if u["user_id"] == data.user_id]
    if existing:
        raise HTTPException(status_code=400, detail="User already tagged")

    user_entry = {
        "user_id": data.user_id,
        "user_type": data.user_type,
        "user_name": data.user_name or "",
        "tagged_at": datetime.now(timezone.utc).isoformat(),
        "current_progress": 0,
        "target_reached": False,
    }

    await db.reward_campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$push": {"tagged_users": user_entry}}
    )
    return {"message": "User tagged to campaign"}


@router.delete("/campaigns/{campaign_id}")
async def deactivate_campaign(campaign_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "platform_settings", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.reward_campaigns.update_one(
        {"campaign_id": campaign_id}, {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deactivated"}


# ========== PUBLIC: Vendor/Influencer can see their campaigns ==========

@router.get("/my-campaigns")
async def get_my_campaigns(user_id: str, user_type: str):
    campaigns = await db.reward_campaigns.find(
        {"is_active": True, "tagged_users.user_id": user_id}, {"_id": 0}
    ).to_list(20)

    result = []
    for c in campaigns:
        my_entry = next((u for u in c.get("tagged_users", []) if u["user_id"] == user_id), None)
        if my_entry:
            if user_type == "vendor":
                vendor = await db.vendors.find_one({"vendor_id": user_id}, {"_id": 0, "total_sales": 1})
                my_entry["current_progress"] = vendor.get("total_sales", 0) if vendor else 0
            elif user_type == "influencer":
                links = await db.vendor_influencer_links.find(
                    {"influencer_id": user_id}, {"_id": 0, "sales_revenue": 1}
                ).to_list(100)
                my_entry["current_progress"] = sum(l.get("sales_revenue", 0) for l in links)
            my_entry["target_reached"] = my_entry.get("current_progress", 0) >= c["target_amount"]

        result.append({
            "campaign_id": c["campaign_id"],
            "title": c["title"],
            "description": c["description"],
            "target_amount": c["target_amount"],
            "reward_description": c["reward_description"],
            "reward_image": c.get("reward_image"),
            "start_date": c["start_date"],
            "end_date": c["end_date"],
            "my_progress": my_entry,
        })
    return result
