from fastapi import APIRouter, Depends
from typing import Dict, Optional
from datetime import datetime, timezone

from config import db
from auth import get_current_user, generate_id

router = APIRouter(tags=["misc"])


@router.get("/track/click/{referral_code}")
async def track_referral_click(referral_code: str, product_id: Optional[str] = None):
    influencer = await db.influencers.find_one({"referral_code": referral_code})
    if influencer:
        await db.influencers.update_one(
            {"referral_code": referral_code},
            {"$inc": {"total_clicks": 1}}
        )

        await db.referral_clicks.insert_one({
            "click_id": generate_id("click_"),
            "referral_code": referral_code,
            "type": "influencer",
            "influencer_id": influencer["influencer_id"],
            "product_id": product_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        return {"type": "influencer", "code": referral_code}

    affiliate = await db.affiliates.find_one({"referral_code": referral_code})
    if affiliate:
        await db.affiliates.update_one(
            {"referral_code": referral_code},
            {"$inc": {"total_clicks": 1}}
        )

        await db.referral_clicks.insert_one({
            "click_id": generate_id("click_"),
            "referral_code": referral_code,
            "type": "affiliate",
            "affiliate_id": affiliate["affiliate_id"],
            "product_id": product_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        return {"type": "affiliate", "code": referral_code}

    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Invalid referral code")


@router.get("/categories")
async def get_categories():
    categories = await db.products.distinct("category")
    return categories


@router.get("/")
async def root():
    return {"message": "Pigma API", "version": "2.0.0"}


@router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}
