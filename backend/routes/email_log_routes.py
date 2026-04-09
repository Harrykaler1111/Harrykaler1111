"""
Email log routes — Admin can view email delivery status per order.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Optional
from config import db
from routes.admin_routes import get_admin_user

router = APIRouter(prefix="/email-logs", tags=["email-logs"])


@router.get("")
async def get_email_logs(
    order_id: Optional[str] = None,
    status: Optional[str] = None,
    recipient_type: Optional[str] = None,
    limit: int = Query(50, le=200),
    skip: int = 0,
    admin: Dict = Depends(get_admin_user),
):
    """Get email delivery logs (admin only)."""
    query = {}
    if order_id:
        query["order_id"] = order_id
    if status:
        query["status"] = status
    if recipient_type:
        query["recipient_type"] = recipient_type

    logs = await db.email_logs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.email_logs.count_documents(query)

    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    summary_raw = await db.email_logs.aggregate(pipeline).to_list(10)
    summary = {r["_id"]: r["count"] for r in summary_raw}

    return {
        "logs": logs,
        "total": total,
        "summary": summary,
    }


@router.get("/order/{order_id}")
async def get_order_email_logs(order_id: str, admin: Dict = Depends(get_admin_user)):
    """Get all emails sent for a specific order."""
    logs = await db.email_logs.find({"order_id": order_id}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return {"logs": logs, "order_id": order_id}
