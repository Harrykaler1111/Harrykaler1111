from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Dict, Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import logging
import os

from config import db
from auth import get_admin_user, check_permission, generate_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/site", tags=["site-settings"])


# ============== HERO VIDEO MANAGEMENT ==============

class HeroVideoUpdate(BaseModel):
    video_url: Optional[str] = None
    poster_url: Optional[str] = None


@router.get("/hero-video")
async def get_hero_video():
    """Public: Get current hero video settings"""
    settings = await db.site_settings.find_one({"setting_id": "hero_video"}, {"_id": 0})
    if not settings:
        return {
            "setting_id": "hero_video",
            "video_url": "https://assets.mixkit.co/videos/52278/52278-720.mp4",
            "poster_url": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1920&q=80",
            "updated_at": None
        }
    return settings


@router.put("/hero-video")
async def update_hero_video(data: HeroVideoUpdate, admin: Dict = Depends(get_admin_user)):
    """Super admin: Update hero video URL"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can change hero video")

    update = {"updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin["admin_id"]}
    if data.video_url is not None:
        update["video_url"] = data.video_url
    if data.poster_url is not None:
        update["poster_url"] = data.poster_url

    await db.site_settings.update_one(
        {"setting_id": "hero_video"},
        {"$set": {**update, "setting_id": "hero_video"}},
        upsert=True
    )
    return {"message": "Hero video updated"}


@router.post("/hero-video/upload")
async def upload_hero_video(file: UploadFile = File(...), admin: Dict = Depends(get_admin_user)):
    """Super admin: Upload a new hero video file"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can upload hero video")

    allowed = {"video/mp4", "video/webm"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only MP4 and WebM videos are allowed")

    data = await file.read()
    max_size = 50 * 1024 * 1024  # 50MB
    if len(data) > max_size:
        raise HTTPException(status_code=400, detail="Video must be under 50MB")

    # Upload to object storage
    from routes.upload_routes import put_object
    ext = "mp4" if "mp4" in file.content_type else "webm"
    path = f"pigma/assets/hero_video_{generate_id('')[:8]}.{ext}"
    put_object(path, data, file.content_type)

    # Build the serve URL
    video_url = f"/api/uploads/assets/{path.replace('pigma/assets/', '')}"

    await db.site_settings.update_one(
        {"setting_id": "hero_video"},
        {"$set": {
            "setting_id": "hero_video",
            "video_url": video_url,
            "uploaded_path": path,
            "file_size": len(data),
            "content_type": file.content_type,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin["admin_id"]
        }},
        upsert=True
    )

    return {"message": "Hero video uploaded", "video_url": video_url}


# ============== TIERED REFERRAL COMMISSION ==============

class CommissionTier(BaseModel):
    min_referrals: int
    max_referrals: int  # -1 for unlimited
    rate: float  # percentage


class TieredCommissionUpdate(BaseModel):
    tiers: List[CommissionTier]
    is_enabled: bool = True


@router.get("/referral-tiers")
async def get_referral_tiers(admin: Dict = Depends(get_admin_user)):
    """Get tiered referral commission configuration"""
    settings = await db.site_settings.find_one({"setting_id": "referral_tiers"}, {"_id": 0})
    if not settings:
        return {
            "setting_id": "referral_tiers",
            "is_enabled": True,
            "tiers": [
                {"min_referrals": 1, "max_referrals": 9, "rate": 1.0},
                {"min_referrals": 10, "max_referrals": 49, "rate": 1.5},
                {"min_referrals": 50, "max_referrals": -1, "rate": 2.0}
            ]
        }
    return settings


@router.put("/referral-tiers")
async def update_referral_tiers(data: TieredCommissionUpdate, admin: Dict = Depends(get_admin_user)):
    """Super admin: Configure tiered referral commissions"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can configure referral tiers")

    tiers_list = [t.model_dump() for t in data.tiers]
    await db.site_settings.update_one(
        {"setting_id": "referral_tiers"},
        {"$set": {
            "setting_id": "referral_tiers",
            "tiers": tiers_list,
            "is_enabled": data.is_enabled,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin["admin_id"]
        }},
        upsert=True
    )
    return {"message": "Referral tiers updated", "tiers": tiers_list}


@router.get("/referral-tiers/report")
async def get_referral_tier_report(admin: Dict = Depends(get_admin_user)):
    """Get report of all referrers with their tier and commission earned"""
    # Get tiers config
    settings = await db.site_settings.find_one({"setting_id": "referral_tiers"}, {"_id": 0})
    tiers = settings.get("tiers", []) if settings else [
        {"min_referrals": 1, "max_referrals": 9, "rate": 1.0},
        {"min_referrals": 10, "max_referrals": 49, "rate": 1.5},
        {"min_referrals": 50, "max_referrals": -1, "rate": 2.0}
    ]

    # Get all influencers with referral counts
    influencers = await db.influencers.find({}, {"_id": 0}).to_list(500)
    resellers = await db.resellers.find({}, {"_id": 0}).to_list(500)
    vendors = await db.vendors.find({}, {"_id": 0}).to_list(500)

    def get_tier(referral_count):
        for t in sorted(tiers, key=lambda x: x["min_referrals"]):
            max_r = t["max_referrals"]
            if t["min_referrals"] <= referral_count and (max_r == -1 or referral_count <= max_r):
                return t
        return tiers[-1] if tiers else {"rate": 1.0, "min_referrals": 0, "max_referrals": -1}

    report = []
    for inf in influencers:
        ref_count = inf.get("referral_count", 0)
        tier = get_tier(ref_count)
        report.append({
            "user_id": inf.get("user_id", ""),
            "name": inf.get("name", inf.get("instagram_handle", "")),
            "type": "influencer",
            "referral_count": ref_count,
            "current_rate": tier["rate"],
            "tier_range": f"{tier['min_referrals']}-{tier['max_referrals'] if tier['max_referrals'] != -1 else '∞'}",
            "total_earned": inf.get("total_earned", 0)
        })

    for r in resellers:
        ref_count = r.get("referral_count", 0)
        tier = get_tier(ref_count)
        report.append({
            "user_id": r.get("user_id", ""),
            "name": r.get("name", ""),
            "type": "reseller",
            "referral_count": ref_count,
            "current_rate": tier["rate"],
            "tier_range": f"{tier['min_referrals']}-{tier['max_referrals'] if tier['max_referrals'] != -1 else '∞'}",
            "total_earned": r.get("total_earned", 0)
        })

    report.sort(key=lambda x: x["referral_count"], reverse=True)
    return {"report": report, "tiers": tiers}


# ============== INSTAGRAM AUTO DM SYSTEM (MOCKED) ==============

class InstagramDMRule(BaseModel):
    trigger_keyword: str
    dm_message: str
    is_active: bool = True


@router.get("/instagram/config")
async def get_instagram_config(admin: Dict = Depends(get_admin_user)):
    """Get Instagram auto-DM configuration"""
    config = await db.site_settings.find_one({"setting_id": "instagram_dm"}, {"_id": 0})
    if not config:
        return {
            "setting_id": "instagram_dm",
            "is_connected": False,
            "instagram_handle": "",
            "rules": [],
            "dm_history": [],
            "stats": {"total_dms_sent": 0, "total_comments_tracked": 0}
        }
    return config


@router.put("/instagram/config")
async def update_instagram_config(
    instagram_handle: str = "",
    access_token: str = "",
    admin: Dict = Depends(get_admin_user)
):
    """Configure Instagram connection (MOCKED)"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin")

    is_connected = bool(instagram_handle and access_token)

    await db.site_settings.update_one(
        {"setting_id": "instagram_dm"},
        {"$set": {
            "setting_id": "instagram_dm",
            "instagram_handle": instagram_handle,
            "access_token_set": bool(access_token),
            "is_connected": is_connected,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Instagram config updated", "is_connected": is_connected}


@router.post("/instagram/rules")
async def add_dm_rule(rule: InstagramDMRule, admin: Dict = Depends(get_admin_user)):
    """Add an auto-DM rule"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin")

    rule_doc = {
        **rule.model_dump(),
        "rule_id": generate_id("igr_"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.site_settings.update_one(
        {"setting_id": "instagram_dm"},
        {"$push": {"rules": rule_doc}, "$set": {"setting_id": "instagram_dm"}},
        upsert=True
    )
    return {"message": "DM rule added", "rule": rule_doc}


@router.delete("/instagram/rules/{rule_id}")
async def delete_dm_rule(rule_id: str, admin: Dict = Depends(get_admin_user)):
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin")
    await db.site_settings.update_one(
        {"setting_id": "instagram_dm"},
        {"$pull": {"rules": {"rule_id": rule_id}}}
    )
    return {"message": "Rule deleted"}


@router.post("/instagram/test-dm")
async def test_dm_send(rule_id: str = "", username: str = "test_user", admin: Dict = Depends(get_admin_user)):
    """Test sending a DM (MOCKED - simulates API call)"""
    config = await db.site_settings.find_one({"setting_id": "instagram_dm"}, {"_id": 0})
    rules = config.get("rules", []) if config else []

    rule = next((r for r in rules if r.get("rule_id") == rule_id), None)
    msg = rule["dm_message"] if rule else "Hello! Thanks for your interest."

    # MOCKED: Log the simulated DM
    dm_log = {
        "dm_id": generate_id("dm_"),
        "username": username,
        "message": msg,
        "rule_id": rule_id or "manual",
        "status": "sent_mock",
        "sent_at": datetime.now(timezone.utc).isoformat()
    }

    await db.site_settings.update_one(
        {"setting_id": "instagram_dm"},
        {"$push": {"dm_history": {"$each": [dm_log], "$slice": -100}},
         "$inc": {"stats.total_dms_sent": 1}},
    )

    return {"message": f"MOCK DM sent to @{username}", "dm": dm_log}


# ============== WHATSAPP CART REMINDER (MOCKED) ==============

class WhatsAppConfig(BaseModel):
    is_enabled: bool = False
    reminder_delay_hours: int = 24
    message_template: str = "Hi {name}! You left items in your Pigma cart. Complete your purchase now: {cart_link}"


@router.get("/whatsapp/config")
async def get_whatsapp_config(admin: Dict = Depends(get_admin_user)):
    """Get WhatsApp cart reminder configuration"""
    config = await db.site_settings.find_one({"setting_id": "whatsapp_reminders"}, {"_id": 0})
    if not config:
        return {
            "setting_id": "whatsapp_reminders",
            "is_enabled": False,
            "is_connected": False,
            "phone_number": "",
            "reminder_delay_hours": 24,
            "message_template": "Hi {name}! You left items in your Pigma cart. Complete your purchase now: {cart_link}",
            "reminders_sent": 0,
            "recent_reminders": []
        }
    return config


@router.put("/whatsapp/config")
async def update_whatsapp_config(data: WhatsAppConfig, admin: Dict = Depends(get_admin_user)):
    """Update WhatsApp reminder settings"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin")

    await db.site_settings.update_one(
        {"setting_id": "whatsapp_reminders"},
        {"$set": {
            "setting_id": "whatsapp_reminders",
            "is_enabled": data.is_enabled,
            "reminder_delay_hours": data.reminder_delay_hours,
            "message_template": data.message_template,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "WhatsApp config updated"}


@router.post("/whatsapp/connect")
async def connect_whatsapp(phone_number: str = "", api_key: str = "", admin: Dict = Depends(get_admin_user)):
    """Connect WhatsApp Business API (MOCKED)"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin")

    is_connected = bool(phone_number and api_key)
    await db.site_settings.update_one(
        {"setting_id": "whatsapp_reminders"},
        {"$set": {
            "setting_id": "whatsapp_reminders",
            "is_connected": is_connected,
            "phone_number": phone_number,
            "api_key_set": bool(api_key),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "WhatsApp connected" if is_connected else "WhatsApp disconnected", "is_connected": is_connected}


@router.post("/whatsapp/test-reminder")
async def test_cart_reminder(user_phone: str = "+911234567890", user_name: str = "Test User", admin: Dict = Depends(get_admin_user)):
    """Send test cart reminder (MOCKED)"""
    config = await db.site_settings.find_one({"setting_id": "whatsapp_reminders"}, {"_id": 0})
    template = config.get("message_template", "Hi {name}! Check out your cart.") if config else "Hi {name}! Check out your cart."

    msg = template.replace("{name}", user_name).replace("{cart_link}", "https://pigma.com/cart")

    reminder_log = {
        "reminder_id": generate_id("wrem_"),
        "user_phone": user_phone,
        "user_name": user_name,
        "message": msg,
        "status": "sent_mock",
        "sent_at": datetime.now(timezone.utc).isoformat()
    }

    await db.site_settings.update_one(
        {"setting_id": "whatsapp_reminders"},
        {"$push": {"recent_reminders": {"$each": [reminder_log], "$slice": -50}},
         "$inc": {"reminders_sent": 1},
         "$set": {"setting_id": "whatsapp_reminders"}},
        upsert=True
    )

    return {"message": f"MOCK reminder sent to {user_phone}", "reminder": reminder_log}


# ============== TRACKING PIXELS (PUBLIC) ==============

@router.get("/tracking-pixels")
async def get_tracking_pixels():
    """Public: Get pixel IDs for frontend injection"""
    settings = await db.platform_settings.find_one({"setting_id": "global"}, {"_id": 0})
    return {
        "meta_pixel_id": settings.get("meta_pixel_id") if settings else None,
        "google_ads_id": settings.get("google_ads_id") if settings else None
    }
