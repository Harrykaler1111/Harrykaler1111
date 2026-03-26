from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from config import db
from auth import get_admin_user, get_current_user, get_current_vendor, check_permission, generate_id

logger = logging.getLogger(__name__)
router = APIRouter(tags=["returns"])

RETURN_REASONS = [
    "defective", "wrong_item", "not_as_described", "size_issue",
    "damaged_in_transit", "late_delivery", "changed_mind", "other"
]

RETURN_STATUSES = [
    "requested", "vendor_approved", "vendor_rejected",
    "item_shipped_back", "item_received", "refund_processing",
    "refunded", "closed", "disputed"
]


class ReturnRequest(BaseModel):
    order_id: str
    reason: str
    description: str
    attachments: List[str] = []


class ReturnResponse(BaseModel):
    message: str
    attachments: List[str] = []


class DisputeEscalation(BaseModel):
    reason: str


@router.get("/returns/reasons")
async def get_return_reasons():
    labels = {
        "defective": "Defective Product",
        "wrong_item": "Wrong Item Received",
        "not_as_described": "Not As Described",
        "size_issue": "Size/Fit Issue",
        "damaged_in_transit": "Damaged in Transit",
        "late_delivery": "Late Delivery",
        "changed_mind": "Changed My Mind",
        "other": "Other"
    }
    return [{"value": k, "label": v} for k, v in labels.items()]


# ========== USER ENDPOINTS ==========

@router.post("/returns")
async def create_return_request(data: ReturnRequest, user: Dict = Depends(get_current_user)):
    if data.reason not in RETURN_REASONS:
        raise HTTPException(status_code=400, detail=f"Invalid reason. Choose from: {RETURN_REASONS}")

    order = await db.orders.find_one({"order_id": data.order_id, "user_id": user["user_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("status") not in ("confirmed", "delivered"):
        raise HTTPException(status_code=400, detail="Returns only allowed for confirmed/delivered orders")

    existing = await db.returns.find_one({"order_id": data.order_id, "status": {"$nin": ["closed", "refunded"]}})
    if existing:
        raise HTTPException(status_code=400, detail="Active return request already exists for this order")

    ret = {
        "return_id": generate_id("ret_"),
        "order_id": data.order_id,
        "user_id": user["user_id"],
        "user_name": user.get("name", ""),
        "user_email": user.get("email", ""),
        "vendor_id": order.get("vendor_id"),
        "vendor_name": order.get("vendor_name", ""),
        "order_total": order.get("total", 0),
        "reason": data.reason,
        "description": data.description,
        "attachments": data.attachments,
        "status": "requested",
        "refund_amount": order.get("total", 0),
        "vendor_response": None,
        "admin_override": None,
        "dispute": None,
        "messages": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.returns.insert_one(ret)
    ret.pop("_id", None)

    await db.orders.update_one(
        {"order_id": data.order_id},
        {"$set": {"return_status": "requested", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"message": "Return request submitted", "return": ret}


@router.get("/returns/me")
async def get_my_returns(user: Dict = Depends(get_current_user)):
    returns = await db.returns.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return returns


@router.get("/returns/{return_id}")
async def get_return_detail(return_id: str, user: Dict = Depends(get_current_user)):
    ret = await db.returns.find_one({"return_id": return_id, "user_id": user["user_id"]}, {"_id": 0})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    return ret


@router.post("/returns/{return_id}/message")
async def user_add_message(return_id: str, data: ReturnResponse, user: Dict = Depends(get_current_user)):
    ret = await db.returns.find_one({"return_id": return_id, "user_id": user["user_id"]})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")

    msg = {
        "sender_id": user["user_id"],
        "sender_type": "customer",
        "sender_name": user.get("name", ""),
        "message": data.message,
        "attachments": data.attachments,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.returns.update_one(
        {"return_id": return_id},
        {"$push": {"messages": msg}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Message added"}


@router.post("/returns/{return_id}/dispute")
async def escalate_to_dispute(return_id: str, data: DisputeEscalation, user: Dict = Depends(get_current_user)):
    ret = await db.returns.find_one({"return_id": return_id, "user_id": user["user_id"]})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    if ret["status"] not in ("vendor_rejected",):
        raise HTTPException(status_code=400, detail="Can only dispute after vendor rejection")

    await db.returns.update_one(
        {"return_id": return_id},
        {"$set": {
            "status": "disputed",
            "dispute": {
                "reason": data.reason,
                "escalated_at": datetime.now(timezone.utc).isoformat(),
                "escalated_by": user["user_id"]
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Dispute escalated to admin"}


# ========== VENDOR ENDPOINTS ==========

@router.get("/vendors/returns")
async def vendor_get_returns(
    status: Optional[str] = None,
    vendor: Dict = Depends(get_current_vendor)
):
    query = {"vendor_id": vendor["vendor_id"]}
    if status:
        query["status"] = status
    returns = await db.returns.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return returns


@router.put("/vendors/returns/{return_id}/approve")
async def vendor_approve_return(return_id: str, vendor: Dict = Depends(get_current_vendor)):
    ret = await db.returns.find_one({"return_id": return_id, "vendor_id": vendor["vendor_id"]})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    if ret["status"] != "requested":
        raise HTTPException(status_code=400, detail="Can only approve pending returns")

    await db.returns.update_one(
        {"return_id": return_id},
        {"$set": {
            "status": "vendor_approved",
            "vendor_response": {
                "action": "approved",
                "responded_at": datetime.now(timezone.utc).isoformat()
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    await db.orders.update_one(
        {"order_id": ret["order_id"]},
        {"$set": {"return_status": "approved"}}
    )
    return {"message": "Return approved"}


@router.put("/vendors/returns/{return_id}/reject")
async def vendor_reject_return(return_id: str, reason: str = "Does not meet return policy", vendor: Dict = Depends(get_current_vendor)):
    ret = await db.returns.find_one({"return_id": return_id, "vendor_id": vendor["vendor_id"]})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    if ret["status"] != "requested":
        raise HTTPException(status_code=400, detail="Can only reject pending returns")

    await db.returns.update_one(
        {"return_id": return_id},
        {"$set": {
            "status": "vendor_rejected",
            "vendor_response": {
                "action": "rejected",
                "reason": reason,
                "responded_at": datetime.now(timezone.utc).isoformat()
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    await db.orders.update_one(
        {"order_id": ret["order_id"]},
        {"$set": {"return_status": "rejected"}}
    )
    return {"message": "Return rejected"}


@router.post("/vendors/returns/{return_id}/message")
async def vendor_add_message(return_id: str, data: ReturnResponse, vendor: Dict = Depends(get_current_vendor)):
    ret = await db.returns.find_one({"return_id": return_id, "vendor_id": vendor["vendor_id"]})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")

    msg = {
        "sender_id": vendor["vendor_id"],
        "sender_type": "vendor",
        "sender_name": vendor.get("store_name", ""),
        "message": data.message,
        "attachments": data.attachments,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.returns.update_one(
        {"return_id": return_id},
        {"$push": {"messages": msg}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Message added"}


# ========== ADMIN ENDPOINTS ==========

@router.get("/admin/returns")
async def admin_list_returns(
    status: Optional[str] = None,
    disputed: Optional[bool] = None,
    skip: int = 0, limit: int = 50,
    admin: Dict = Depends(get_admin_user)
):
    if not check_permission(admin, "orders", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    query = {}
    if status:
        query["status"] = status
    if disputed:
        query["status"] = "disputed"

    returns = await db.returns.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.returns.count_documents(query)

    stats = {
        "total": await db.returns.count_documents({}),
        "requested": await db.returns.count_documents({"status": "requested"}),
        "approved": await db.returns.count_documents({"status": "vendor_approved"}),
        "rejected": await db.returns.count_documents({"status": "vendor_rejected"}),
        "disputed": await db.returns.count_documents({"status": "disputed"}),
        "refunded": await db.returns.count_documents({"status": "refunded"}),
    }

    return {"returns": returns, "total": total, "stats": stats}


@router.put("/admin/returns/{return_id}/override")
async def admin_override_return(return_id: str, status: str, refund_amount: Optional[float] = None, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "orders", "update"):
        raise HTTPException(status_code=403, detail="Permission denied")
    if status not in RETURN_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status")

    ret = await db.returns.find_one({"return_id": return_id})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")

    update = {
        "status": status,
        "admin_override": {
            "admin_id": admin["admin_id"],
            "admin_name": admin.get("name", ""),
            "action": status,
            "override_at": datetime.now(timezone.utc).isoformat()
        },
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if refund_amount is not None:
        update["refund_amount"] = refund_amount

    # If refunding, process the refund (mocked)
    if status == "refunded":
        update["refunded_at"] = datetime.now(timezone.utc).isoformat()
        await db.orders.update_one(
            {"order_id": ret["order_id"]},
            {"$set": {"return_status": "refunded", "payment_status": "refunded"}}
        )

    await db.returns.update_one({"return_id": return_id}, {"$set": update})
    return {"message": f"Return status overridden to {status}"}


@router.post("/admin/returns/{return_id}/message")
async def admin_add_message(return_id: str, data: ReturnResponse, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "orders", "update"):
        raise HTTPException(status_code=403, detail="Permission denied")

    ret = await db.returns.find_one({"return_id": return_id})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")

    msg = {
        "sender_id": admin["admin_id"],
        "sender_type": "admin",
        "sender_name": admin.get("name", "Admin"),
        "message": data.message,
        "attachments": data.attachments,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.returns.update_one(
        {"return_id": return_id},
        {"$push": {"messages": msg}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Message added"}
