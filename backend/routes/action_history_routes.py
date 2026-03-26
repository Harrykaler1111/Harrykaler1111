from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Optional
from datetime import datetime, timezone

from config import db
from auth import get_admin_user, get_current_user, get_current_vendor, generate_id, check_permission

router = APIRouter(prefix="/action-history", tags=["action-history"])


async def log_action(user_id: str, user_type: str, action: str, details: str = "", metadata: dict = None):
    doc = {
        "action_id": generate_id("act_"),
        "user_id": user_id,
        "user_type": user_type,
        "action": action,
        "details": details,
        "metadata": metadata or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.action_history.insert_one(doc)


@router.get("/admin")
async def get_all_action_history(
    user_type: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    admin: Dict = Depends(get_admin_user)
):
    """Admin: View action history for any user type"""
    query = {}
    if user_type:
        query["user_type"] = user_type
    if user_id:
        query["user_id"] = user_id
    if action:
        query["action"] = {"$regex": action, "$options": "i"}

    history = await db.action_history.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.action_history.count_documents(query)
    return {"history": history, "total": total}


@router.get("/me")
async def get_my_action_history(
    skip: int = 0,
    limit: int = 30,
    user: Dict = Depends(get_current_user)
):
    """User: View own action history"""
    history = await db.action_history.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    return history


@router.get("/vendor/me")
async def get_vendor_action_history(
    skip: int = 0,
    limit: int = 30,
    vendor: Dict = Depends(get_current_vendor)
):
    """Vendor: View own action history"""
    history = await db.action_history.find(
        {"user_id": vendor["vendor_id"]}, {"_id": 0}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    return history
