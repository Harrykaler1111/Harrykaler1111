"""
Notification API routes — list, mark-read, unread count, preferences.
"""
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from pydantic import BaseModel

from config import db
from auth import get_admin_user, get_current_vendor, get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])

DEFAULT_PREFS = {
    "order": True,
    "issue": True,
    "promotion": True,
    "credit": True,
    "kyc": True,
    "system": True,
    "sound_high": True,
    "sound_medium": False,
    "quiet_hours_enabled": False,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "08:00",
}


class NotifPrefsUpdate(BaseModel):
    order: Optional[bool] = None
    issue: Optional[bool] = None
    promotion: Optional[bool] = None
    credit: Optional[bool] = None
    kyc: Optional[bool] = None
    system: Optional[bool] = None
    sound_high: Optional[bool] = None
    sound_medium: Optional[bool] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None


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


# ════════════════════════════════════════════════
# Preferences
# ════════════════════════════════════════════════

async def _get_prefs(user_id: str) -> dict:
    doc = await db.notification_prefs.find_one({"user_id": user_id}, {"_id": 0})
    if doc:
        return {**DEFAULT_PREFS, **{k: v for k, v in doc.items() if k != "user_id" and k != "updated_at"}}
    return {**DEFAULT_PREFS}


@router.get("/vendor/preferences")
async def vendor_get_prefs(vendor: Dict = Depends(get_current_vendor)):
    return await _get_prefs(vendor["vendor_id"])


@router.put("/vendor/preferences")
async def vendor_update_prefs(body: NotifPrefsUpdate, vendor: Dict = Depends(get_current_vendor)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No preferences to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.notification_prefs.update_one(
        {"user_id": vendor["vendor_id"]},
        {"$set": updates, "$setOnInsert": {"user_id": vendor["vendor_id"]}},
        upsert=True
    )
    return await _get_prefs(vendor["vendor_id"])


@router.get("/admin/preferences")
async def admin_get_prefs(admin: Dict = Depends(get_admin_user)):
    return await _get_prefs(admin["admin_id"])


@router.put("/admin/preferences")
async def admin_update_prefs(body: NotifPrefsUpdate, admin: Dict = Depends(get_admin_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No preferences to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.notification_prefs.update_one(
        {"user_id": admin["admin_id"]},
        {"$set": updates, "$setOnInsert": {"user_id": admin["admin_id"]}},
        upsert=True
    )
    return await _get_prefs(admin["admin_id"])


# ---- User (buyer/customer) endpoints ----

@router.get("/user/list")
async def user_list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    unread_only: bool = False,
    user: Dict = Depends(get_current_user)
):
    uid = user["user_id"]
    query = {"user_id": uid}
    if unread_only:
        query["is_read"] = False
    items = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.notifications.count_documents(query)
    unread = await db.notifications.count_documents({"user_id": uid, "is_read": False})
    return {"notifications": items, "total": total, "unread_count": unread}


@router.get("/user/unread-count")
async def user_unread_count(user: Dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["user_id"], "is_read": False})
    return {"unread_count": count}


@router.put("/user/read/{notification_id}")
async def user_mark_read(notification_id: str, user: Dict = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


@router.put("/user/read-all")
async def user_mark_all_read(user: Dict = Depends(get_current_user)):
    result = await db.notifications.update_many(
        {"user_id": user["user_id"], "is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Marked {result.modified_count} as read"}



# ════════════════════════════════════════════════
# Notification Center — Advanced Query + Bulk Ops
# ════════════════════════════════════════════════

class BulkReadRequest(BaseModel):
    notification_ids: List[str]

class BulkDeleteRequest(BaseModel):
    notification_ids: List[str]


async def _center_query(user_id: str, skip: int, limit: int, search: str, ntype: str, status: str, priority: str, date_from: str, date_to: str):
    """Shared center query logic for admin/vendor/user."""
    query = {"user_id": user_id}

    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"message": {"$regex": search, "$options": "i"}},
        ]
    if ntype and ntype != "all":
        query["type"] = ntype
    if status == "unread":
        query["is_read"] = False
    elif status == "read":
        query["is_read"] = True
    if priority and priority != "all":
        query["priority"] = priority
    if date_from:
        query.setdefault("created_at", {})["$gte"] = date_from
    if date_to:
        query.setdefault("created_at", {})["$lte"] = date_to

    items = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.notifications.count_documents(query)
    unread = await db.notifications.count_documents({"user_id": user_id, "is_read": False})
    return {"notifications": items, "total": total, "unread_count": unread, "page": skip // limit + 1, "pages": (total + limit - 1) // limit}


@router.get("/admin/center")
async def admin_notification_center(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(""),
    type: str = Query("all"),
    status: str = Query("all"),
    priority: str = Query("all"),
    date_from: str = Query(""),
    date_to: str = Query(""),
    admin: Dict = Depends(get_admin_user),
):
    return await _center_query(admin["admin_id"], skip, limit, search, type, status, priority, date_from, date_to)


@router.get("/vendor/center")
async def vendor_notification_center(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(""),
    type: str = Query("all"),
    status: str = Query("all"),
    priority: str = Query("all"),
    date_from: str = Query(""),
    date_to: str = Query(""),
    vendor: Dict = Depends(get_current_vendor),
):
    return await _center_query(vendor["vendor_id"], skip, limit, search, type, status, priority, date_from, date_to)


@router.get("/user/center")
async def user_notification_center(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(""),
    type: str = Query("all"),
    status: str = Query("all"),
    priority: str = Query("all"),
    date_from: str = Query(""),
    date_to: str = Query(""),
    user: Dict = Depends(get_current_user),
):
    return await _center_query(user["user_id"], skip, limit, search, type, status, priority, date_from, date_to)


# Bulk mark as read
@router.put("/admin/bulk-read")
async def admin_bulk_read(body: BulkReadRequest, admin: Dict = Depends(get_admin_user)):
    result = await db.notifications.update_many(
        {"notification_id": {"$in": body.notification_ids}, "user_id": admin["admin_id"]},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"modified": result.modified_count}


@router.put("/vendor/bulk-read")
async def vendor_bulk_read(body: BulkReadRequest, vendor: Dict = Depends(get_current_vendor)):
    result = await db.notifications.update_many(
        {"notification_id": {"$in": body.notification_ids}, "user_id": vendor["vendor_id"]},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"modified": result.modified_count}


@router.put("/user/bulk-read")
async def user_bulk_read(body: BulkReadRequest, user: Dict = Depends(get_current_user)):
    result = await db.notifications.update_many(
        {"notification_id": {"$in": body.notification_ids}, "user_id": user["user_id"]},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"modified": result.modified_count}


# Bulk delete
@router.delete("/admin/bulk-delete")
async def admin_bulk_delete(body: BulkDeleteRequest, admin: Dict = Depends(get_admin_user)):
    result = await db.notifications.delete_many(
        {"notification_id": {"$in": body.notification_ids}, "user_id": admin["admin_id"]}
    )
    return {"deleted": result.deleted_count}


@router.delete("/vendor/bulk-delete")
async def vendor_bulk_delete(body: BulkDeleteRequest, vendor: Dict = Depends(get_current_vendor)):
    result = await db.notifications.delete_many(
        {"notification_id": {"$in": body.notification_ids}, "user_id": vendor["vendor_id"]}
    )
    return {"deleted": result.deleted_count}


@router.delete("/user/bulk-delete")
async def user_bulk_delete(body: BulkDeleteRequest, user: Dict = Depends(get_current_user)):
    result = await db.notifications.delete_many(
        {"notification_id": {"$in": body.notification_ids}, "user_id": user["user_id"]}
    )
    return {"deleted": result.deleted_count}
