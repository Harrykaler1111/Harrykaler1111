"""
Notification API routes — list, mark-read, unread count, preferences.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict
from datetime import datetime, timezone

from config import db
from auth import get_admin_user, get_current_vendor

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ---- Vendor endpoints ----

@router.get("/vendor/list")
async def vendor_list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    unread_only: bool = False,
    vendor: Dict = Depends(get_current_vendor)
):
    vid = vendor["vendor_id"]
    query = {"user_id": vid}
    if unread_only:
        query["is_read"] = False
    items = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.notifications.count_documents(query)
    unread = await db.notifications.count_documents({"user_id": vid, "is_read": False})
    return {"notifications": items, "total": total, "unread_count": unread}


@router.get("/vendor/unread-count")
async def vendor_unread_count(vendor: Dict = Depends(get_current_vendor)):
    count = await db.notifications.count_documents({"user_id": vendor["vendor_id"], "is_read": False})
    return {"unread_count": count}


@router.put("/vendor/read/{notification_id}")
async def vendor_mark_read(notification_id: str, vendor: Dict = Depends(get_current_vendor)):
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": vendor["vendor_id"]},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


@router.put("/vendor/read-all")
async def vendor_mark_all_read(vendor: Dict = Depends(get_current_vendor)):
    result = await db.notifications.update_many(
        {"user_id": vendor["vendor_id"], "is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Marked {result.modified_count} as read"}


# ---- Admin endpoints ----

@router.get("/admin/list")
async def admin_list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    unread_only: bool = False,
    admin: Dict = Depends(get_admin_user)
):
    aid = admin["admin_id"]
    query = {"user_id": aid}
    if unread_only:
        query["is_read"] = False
    items = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.notifications.count_documents(query)
    unread = await db.notifications.count_documents({"user_id": aid, "is_read": False})
    return {"notifications": items, "total": total, "unread_count": unread}


@router.get("/admin/unread-count")
async def admin_unread_count(admin: Dict = Depends(get_admin_user)):
    count = await db.notifications.count_documents({"user_id": admin["admin_id"], "is_read": False})
    return {"unread_count": count}


@router.put("/admin/read/{notification_id}")
async def admin_mark_read(notification_id: str, admin: Dict = Depends(get_admin_user)):
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": admin["admin_id"]},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


@router.put("/admin/read-all")
async def admin_mark_all_read(admin: Dict = Depends(get_admin_user)):
    result = await db.notifications.update_many(
        {"user_id": admin["admin_id"], "is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Marked {result.modified_count} as read"}
