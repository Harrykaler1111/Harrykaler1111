from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from config import db
from auth import get_admin_user, check_permission

router = APIRouter(prefix="/popup", tags=["Popup"])


class PopupConfig(BaseModel):
    enabled: bool = False
    title: str = ""
    description: str = ""
    image: str = ""
    video: str = ""
    cta_text: str = ""
    cta_link: str = ""
    delay_seconds: int = 1
    force_show: bool = False
    reappear_interval_minutes: int = 0


POPUP_DOC_ID = "site_popup_config"


@router.get("/config")
async def get_popup_config():
    """Public endpoint — frontend calls this on page load"""
    config = await db.site_config.find_one({"config_id": POPUP_DOC_ID}, {"_id": 0})
    if not config:
        return {"enabled": False}
    return {k: v for k, v in config.items() if k != "config_id"}


@router.get("/admin/config")
async def get_popup_config_admin(admin: Dict = Depends(get_admin_user)):
    """Admin endpoint — full config with all fields"""
    config = await db.site_config.find_one({"config_id": POPUP_DOC_ID}, {"_id": 0})
    if not config:
        return PopupConfig().model_dump()
    return {k: v for k, v in config.items() if k != "config_id"}


@router.put("/admin/config")
async def update_popup_config(config: PopupConfig, admin: Dict = Depends(get_admin_user)):
    """Admin endpoint — update popup configuration"""
    if not check_permission(admin, "platform_settings", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    data = config.model_dump()
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    data["updated_by"] = admin.get("admin_id", "")

    await db.site_config.update_one(
        {"config_id": POPUP_DOC_ID},
        {"$set": {**data, "config_id": POPUP_DOC_ID}},
        upsert=True,
    )
    return {"message": "Popup config updated", **data}
