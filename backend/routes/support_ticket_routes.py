from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import logging

from config import db
from auth import get_admin_user, get_current_user, get_current_vendor, check_permission, generate_id

logger = logging.getLogger(__name__)
router = APIRouter(tags=["support-tickets"])

# ========== CONSTANTS ==========
TICKET_CATEGORIES = [
    "payment", "order", "refund", "vendor_collaboration",
    "influencer", "account_login", "technical_bug", "other"
]

CATEGORY_LABELS = {
    "payment": "Payment Issues",
    "order": "Order Issues",
    "refund": "Refund Issues",
    "vendor_collaboration": "Vendor Collaboration",
    "influencer": "Influencer Issues",
    "account_login": "Account / Login Issues",
    "technical_bug": "Technical Bug",
    "other": "Other"
}

SLA_HOURS = {"high": 4, "medium": 12, "low": 24}

TICKET_STATUSES = ["open", "assigned", "in_progress", "waiting_for_user", "resolved", "closed"]


# ========== SCHEMAS ==========
class CreateTicket(BaseModel):
    title: str
    description: str
    category: str
    priority: str = "medium"
    attachments: List[str] = []
    linked_order_id: Optional[str] = None


class TicketReply(BaseModel):
    message: str
    attachments: List[str] = []


class KBArticleCreate(BaseModel):
    title: str
    content: str
    category: str


# ========== HELPER ==========
def compute_sla_deadline(priority: str) -> str:
    hours = SLA_HOURS.get(priority, 24)
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


def ticket_summary(t: dict) -> dict:
    return {k: v for k, v in t.items() if k != "_id"}


@router.get("/tickets/categories")
async def get_ticket_categories():
    return [{"value": k, "label": v} for k, v in CATEGORY_LABELS.items()]


# ========== USER TICKET ENDPOINTS ==========

@router.post("/tickets")
async def create_ticket(data: CreateTicket, user: Dict = Depends(get_current_user)):
    """Any logged-in user can create a ticket"""
    if data.category not in TICKET_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {TICKET_CATEGORIES}")
    if data.priority not in SLA_HOURS:
        raise HTTPException(status_code=400, detail="Priority must be low, medium, or high")

    ticket = {
        "ticket_id": generate_id("tkt_"),
        "user_id": user["user_id"],
        "user_type": "customer",
        "user_name": user.get("name", ""),
        "user_email": user.get("email", ""),
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "priority": data.priority,
        "status": "open",
        "assigned_to": None,
        "assigned_name": None,
        "attachments": data.attachments,
        "linked_order_id": data.linked_order_id,
        "sla_deadline": compute_sla_deadline(data.priority),
        "escalated": False,
        "escalated_at": None,
        "replies": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
        "closed_at": None,
    }
    await db.tickets.insert_one(ticket)
    ticket.pop("_id", None)
    return {"message": "Ticket created", "ticket": ticket}


@router.get("/tickets/me")
async def get_my_tickets(
    status: Optional[str] = None,
    skip: int = 0, limit: int = 50,
    user: Dict = Depends(get_current_user)
):
    query = {"user_id": user["user_id"]}
    if status:
        query["status"] = status
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.tickets.count_documents(query)
    return {"tickets": tickets, "total": total}


@router.get("/tickets/{ticket_id}")
async def get_ticket_detail(ticket_id: str, user: Dict = Depends(get_current_user)):
    ticket = await db.tickets.find_one({"ticket_id": ticket_id, "user_id": user["user_id"]}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.post("/tickets/{ticket_id}/reply")
async def user_reply_ticket(ticket_id: str, data: TicketReply, user: Dict = Depends(get_current_user)):
    ticket = await db.tickets.find_one({"ticket_id": ticket_id, "user_id": user["user_id"]})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket["status"] == "closed":
        raise HTTPException(status_code=400, detail="Cannot reply to a closed ticket. Please reopen it first.")

    reply = {
        "reply_id": generate_id("rpl_"),
        "sender_id": user["user_id"],
        "sender_type": "user",
        "sender_name": user.get("name", ""),
        "message": data.message,
        "attachments": data.attachments,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    new_status = ticket["status"]
    if ticket["status"] == "waiting_for_user":
        new_status = "in_progress"

    await db.tickets.update_one(
        {"ticket_id": ticket_id},
        {
            "$push": {"replies": reply},
            "$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    return {"message": "Reply added", "reply": reply}


@router.put("/tickets/{ticket_id}/reopen")
async def reopen_ticket(ticket_id: str, user: Dict = Depends(get_current_user)):
    ticket = await db.tickets.find_one({"ticket_id": ticket_id, "user_id": user["user_id"]})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket["status"] not in ("resolved", "closed"):
        raise HTTPException(status_code=400, detail="Only resolved or closed tickets can be reopened")

    await db.tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {
            "status": "open",
            "resolved_at": None,
            "closed_at": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Ticket reopened"}


# ========== VENDOR TICKET ENDPOINTS ==========

@router.post("/vendors/tickets")
async def vendor_create_ticket(data: CreateTicket, vendor: Dict = Depends(get_current_vendor)):
    if data.category not in TICKET_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category")
    if data.priority not in SLA_HOURS:
        raise HTTPException(status_code=400, detail="Priority must be low, medium, or high")

    ticket = {
        "ticket_id": generate_id("tkt_"),
        "user_id": vendor["vendor_id"],
        "user_type": "vendor",
        "user_name": vendor.get("store_name", vendor.get("name", "")),
        "user_email": vendor.get("email", ""),
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "priority": data.priority,
        "status": "open",
        "assigned_to": None,
        "assigned_name": None,
        "attachments": data.attachments,
        "linked_order_id": data.linked_order_id,
        "sla_deadline": compute_sla_deadline(data.priority),
        "escalated": False,
        "escalated_at": None,
        "replies": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
        "closed_at": None,
    }
    await db.tickets.insert_one(ticket)
    ticket.pop("_id", None)
    return {"message": "Ticket created", "ticket": ticket}


@router.get("/vendors/tickets/me")
async def vendor_get_tickets(
    status: Optional[str] = None,
    skip: int = 0, limit: int = 50,
    vendor: Dict = Depends(get_current_vendor)
):
    query = {"user_id": vendor["vendor_id"]}
    if status:
        query["status"] = status
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.tickets.count_documents(query)
    return {"tickets": tickets, "total": total}


@router.get("/vendors/tickets/{ticket_id}")
async def vendor_get_ticket_detail(ticket_id: str, vendor: Dict = Depends(get_current_vendor)):
    ticket = await db.tickets.find_one({"ticket_id": ticket_id, "user_id": vendor["vendor_id"]}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.post("/vendors/tickets/{ticket_id}/reply")
async def vendor_reply_ticket(ticket_id: str, data: TicketReply, vendor: Dict = Depends(get_current_vendor)):
    ticket = await db.tickets.find_one({"ticket_id": ticket_id, "user_id": vendor["vendor_id"]})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket["status"] == "closed":
        raise HTTPException(status_code=400, detail="Cannot reply to a closed ticket")

    reply = {
        "reply_id": generate_id("rpl_"),
        "sender_id": vendor["vendor_id"],
        "sender_type": "vendor",
        "sender_name": vendor.get("store_name", ""),
        "message": data.message,
        "attachments": data.attachments,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    new_status = "in_progress" if ticket["status"] == "waiting_for_user" else ticket["status"]
    await db.tickets.update_one(
        {"ticket_id": ticket_id},
        {"$push": {"replies": reply}, "$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Reply added", "reply": reply}


@router.put("/vendors/tickets/{ticket_id}/reopen")
async def vendor_reopen_ticket(ticket_id: str, vendor: Dict = Depends(get_current_vendor)):
    ticket = await db.tickets.find_one({"ticket_id": ticket_id, "user_id": vendor["vendor_id"]})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket["status"] not in ("resolved", "closed"):
        raise HTTPException(status_code=400, detail="Only resolved/closed tickets can be reopened")
    await db.tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {"status": "open", "resolved_at": None, "closed_at": None, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Ticket reopened"}


# ========== ADMIN TICKET ENDPOINTS ==========

@router.get("/admin/tickets")
async def admin_list_tickets(
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    user_type: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    escalated: Optional[bool] = None,
    skip: int = 0, limit: int = 50,
    admin: Dict = Depends(get_admin_user)
):
    if not check_permission(admin, "tickets", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if priority:
        query["priority"] = priority
    if user_type:
        query["user_type"] = user_type
    if assigned_to:
        query["assigned_to"] = assigned_to
    if escalated is not None:
        query["escalated"] = escalated
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"ticket_id": {"$regex": search, "$options": "i"}},
            {"user_name": {"$regex": search, "$options": "i"}}
        ]

    tickets = await db.tickets.find(query, {"_id": 0, "replies": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.tickets.count_documents(query)
    return {"tickets": tickets, "total": total}


@router.get("/admin/tickets/analytics")
async def admin_ticket_analytics(admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "tickets", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    total = await db.tickets.count_documents({})
    open_count = await db.tickets.count_documents({"status": "open"})
    assigned_count = await db.tickets.count_documents({"status": "assigned"})
    in_progress = await db.tickets.count_documents({"status": "in_progress"})
    waiting = await db.tickets.count_documents({"status": "waiting_for_user"})
    resolved = await db.tickets.count_documents({"status": "resolved"})
    closed = await db.tickets.count_documents({"status": "closed"})
    escalated = await db.tickets.count_documents({"escalated": True})

    high_prio = await db.tickets.count_documents({"priority": "high", "status": {"$nin": ["resolved", "closed"]}})
    medium_prio = await db.tickets.count_documents({"priority": "medium", "status": {"$nin": ["resolved", "closed"]}})
    low_prio = await db.tickets.count_documents({"priority": "low", "status": {"$nin": ["resolved", "closed"]}})

    # Category breakdown
    category_pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    category_stats = await db.tickets.aggregate(category_pipeline).to_list(20)

    # Average resolution time for resolved tickets
    resolved_tickets = await db.tickets.find(
        {"status": {"$in": ["resolved", "closed"]}, "resolved_at": {"$ne": None}},
        {"_id": 0, "created_at": 1, "resolved_at": 1}
    ).to_list(500)

    avg_resolution_hours = 0
    if resolved_tickets:
        total_hours = 0
        count = 0
        for t in resolved_tickets:
            try:
                created = datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))
                resolved_dt = datetime.fromisoformat(t["resolved_at"].replace("Z", "+00:00"))
                total_hours += (resolved_dt - created).total_seconds() / 3600
                count += 1
            except Exception:
                pass
        if count > 0:
            avg_resolution_hours = round(total_hours / count, 1)

    return {
        "total": total,
        "by_status": {
            "open": open_count, "assigned": assigned_count, "in_progress": in_progress,
            "waiting_for_user": waiting, "resolved": resolved, "closed": closed
        },
        "escalated": escalated,
        "by_priority": {"high": high_prio, "medium": medium_prio, "low": low_prio},
        "by_category": [{"category": s["_id"], "label": CATEGORY_LABELS.get(s["_id"], s["_id"]), "count": s["count"]} for s in category_stats],
        "avg_resolution_hours": avg_resolution_hours
    }


@router.get("/admin/tickets/{ticket_id}")
async def admin_get_ticket(ticket_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "tickets", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")
    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.put("/admin/tickets/{ticket_id}/assign")
async def admin_assign_ticket(ticket_id: str, admin_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "tickets", "manage"):
        raise HTTPException(status_code=403, detail="Permission denied")

    target_admin = await db.admin_users.find_one({"admin_id": admin_id}, {"_id": 0})
    if not target_admin:
        raise HTTPException(status_code=404, detail="Target admin not found")

    ticket = await db.tickets.find_one({"ticket_id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    await db.tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {
            "assigned_to": admin_id,
            "assigned_name": target_admin.get("name", ""),
            "status": "assigned" if ticket["status"] == "open" else ticket["status"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": f"Ticket assigned to {target_admin.get('name', admin_id)}"}


@router.put("/admin/tickets/{ticket_id}/status")
async def admin_change_status(ticket_id: str, status: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "tickets", "manage"):
        raise HTTPException(status_code=403, detail="Permission denied")
    if status not in TICKET_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {TICKET_STATUSES}")

    update = {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if status == "resolved":
        update["resolved_at"] = datetime.now(timezone.utc).isoformat()
    elif status == "closed":
        update["closed_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": f"Ticket status changed to {status}"}


@router.post("/admin/tickets/{ticket_id}/reply")
async def admin_reply_ticket(ticket_id: str, data: TicketReply, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "tickets", "manage"):
        raise HTTPException(status_code=403, detail="Permission denied")

    ticket = await db.tickets.find_one({"ticket_id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    reply = {
        "reply_id": generate_id("rpl_"),
        "sender_id": admin["admin_id"],
        "sender_type": "support",
        "sender_name": admin.get("name", "Support"),
        "message": data.message,
        "attachments": data.attachments,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.tickets.update_one(
        {"ticket_id": ticket_id},
        {
            "$push": {"replies": reply},
            "$set": {
                "status": "waiting_for_user" if ticket["status"] != "resolved" else ticket["status"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    return {"message": "Reply sent", "reply": reply}


@router.put("/admin/tickets/{ticket_id}/escalate")
async def admin_escalate_ticket(ticket_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "tickets", "manage"):
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {
            "escalated": True,
            "escalated_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Ticket escalated to super admin"}


# ========== KNOWLEDGE BASE ==========

@router.get("/kb/articles")
async def get_kb_articles(category: Optional[str] = None):
    query = {"is_published": True}
    if category:
        query["category"] = category
    articles = await db.kb_articles.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return articles


@router.get("/kb/articles/{article_id}")
async def get_kb_article(article_id: str):
    article = await db.kb_articles.find_one({"article_id": article_id, "is_published": True}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.post("/admin/kb/articles")
async def create_kb_article(data: KBArticleCreate, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "tickets", "manage"):
        raise HTTPException(status_code=403, detail="Permission denied")

    article = {
        "article_id": generate_id("kb_"),
        "title": data.title,
        "content": data.content,
        "category": data.category,
        "is_published": True,
        "created_by": admin["admin_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.kb_articles.insert_one(article)
    article.pop("_id", None)
    return {"message": "Article created", "article": article}


@router.delete("/admin/kb/articles/{article_id}")
async def delete_kb_article(article_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "tickets", "manage"):
        raise HTTPException(status_code=403, detail="Permission denied")
    result = await db.kb_articles.update_one(
        {"article_id": article_id},
        {"$set": {"is_published": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"message": "Article deleted"}
