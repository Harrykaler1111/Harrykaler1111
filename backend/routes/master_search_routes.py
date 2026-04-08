"""
Admin Master Search — enter any display_id and get full data.
Also handles migration and global ID utilities.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Optional
from datetime import datetime, timezone

from config import db
from auth import get_admin_user, generate_id
from display_ids import generate_display_id, migrate_existing_users, ROLE_PREFIXES

router = APIRouter(prefix="/admin/master", tags=["admin-master-search"])


def _prefix_to_role(display_id: str) -> Optional[str]:
    """Map display_id prefix to role/type."""
    prefix = display_id.split("-")[0].upper() if "-" in display_id else ""
    reverse_map = {v: k for k, v in ROLE_PREFIXES.items()}
    return reverse_map.get(prefix)


async def _find_user_by_display_id(display_id: str):
    """Find user across all collections by display_id."""
    role = _prefix_to_role(display_id)

    # Search in order based on prefix hint
    collections = [
        ("vendors", "vendor_id", "vendor"),
        ("resellers", "reseller_id", "reseller"),
        ("affiliates", "affiliate_id", "affiliate"),
        ("influencers", "influencer_id", "influencer"),
        ("admin_users", "admin_id", "admin"),
    ]

    # Prioritize the collection matching the prefix
    if role:
        collections.sort(key=lambda c: 0 if c[2] == role else 1)

    for coll, id_field, user_role in collections:
        user = await db[coll].find_one({"display_id": display_id}, {"_id": 0})
        if user:
            return {**user, "user_role": user_role, "internal_id": user.get(id_field, ""), "collection": coll}

    return None


@router.get("/search/{display_id}")
async def master_search(display_id: str, admin: Dict = Depends(get_admin_user)):
    """
    Admin Master Search — enter ANY display_id and get full data:
    profile, products, promotions, credits, issues, activity logs.
    """
    display_id = display_id.strip().upper()
    role = _prefix_to_role(display_id)

    # ── Handle non-user IDs (ISS, PRM, CRD) ──
    if role == "issue":
        ticket = await db.support_tickets.find_one({"display_id": display_id}, {"_id": 0})
        if not ticket:
            raise HTTPException(status_code=404, detail=f"Issue {display_id} not found")
        return {"type": "issue", "data": ticket}

    if role == "promotion":
        promo = await db.promotion_requests.find_one({"display_id": display_id}, {"_id": 0})
        if not promo:
            raise HTTPException(status_code=404, detail=f"Promotion {display_id} not found")
        return {"type": "promotion", "data": promo}

    if role == "credit_txn":
        txn = await db.credit_transactions.find_one({"display_id": display_id}, {"_id": 0})
        if not txn:
            raise HTTPException(status_code=404, detail=f"Transaction {display_id} not found")
        return {"type": "credit_transaction", "data": txn}

    # ── Find user ──
    user = await _find_user_by_display_id(display_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"No user found with ID {display_id}")

    internal_id = user["internal_id"]
    user_role = user["user_role"]

    # ── Gather all related data ──

    # 1. Products (for vendors)
    products = []
    if user_role == "vendor":
        products = await db.products.find(
            {"vendor_id": internal_id},
            {"_id": 0, "product_id": 1, "name": 1, "price": 1, "is_active": 1, "created_at": 1, "images": {"$slice": 1}}
        ).sort("created_at", -1).limit(50).to_list(50)
        vendor_products = await db.vendor_products.find(
            {"vendor_id": internal_id},
            {"_id": 0, "product_id": 1, "name": 1, "price": 1, "approval_status": 1, "created_at": 1, "images": {"$slice": 1}}
        ).sort("created_at", -1).limit(50).to_list(50)
        products.extend(vendor_products)

    # 2. Credit wallet & transactions
    wallet = await db.vendor_wallets.find_one({"vendor_id": internal_id}, {"_id": 0})
    credit_transactions = await db.credit_transactions.find(
        {"vendor_id": internal_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)

    # 3. Promotions
    promotions = await db.promotion_requests.find(
        {"vendor_id": internal_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)

    # 4. Active boosts
    boosts = await db.reel_boosts.find(
        {"vendor_id": internal_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)

    # 5. Featured entries
    featured = await db.featured_vendors.find(
        {"vendor_id": internal_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)

    # 6. Issues/Tickets
    issues = await db.support_tickets.find(
        {"$or": [{"user_id": internal_id}, {"vendor_id": internal_id}]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)

    # 7. Activity logs
    activity = await db.action_history.find(
        {"user_id": internal_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(100).to_list(100)

    # 8. Orders (for vendors — as seller)
    orders = []
    if user_role == "vendor":
        orders = await db.orders.find(
            {"items.vendor_id": internal_id},
            {"_id": 0, "order_id": 1, "status": 1, "total": 1, "created_at": 1}
        ).sort("created_at", -1).limit(50).to_list(50)
    elif user_role in ("reseller", "affiliate"):
        orders = await db.orders.find(
            {"$or": [{"reseller_id": internal_id}, {"affiliate_id": internal_id}, {"referral_id": internal_id}]},
            {"_id": 0, "order_id": 1, "status": 1, "total": 1, "created_at": 1}
        ).sort("created_at", -1).limit(50).to_list(50)

    # 9. Analytics
    analytics = await db.vendor_analytics.find_one({"vendor_id": internal_id}, {"_id": 0})

    # Remove sensitive fields
    for key in ["password", "password_hash", "hashed_password"]:
        user.pop(key, None)

    return {
        "type": "user",
        "profile": user,
        "products": products,
        "wallet": wallet,
        "credit_transactions": credit_transactions,
        "promotions": promotions,
        "boosts": boosts,
        "featured": featured,
        "issues": issues,
        "activity": activity,
        "orders": orders,
        "analytics": analytics,
        "summary": {
            "total_products": len(products),
            "total_promotions": len(promotions),
            "active_boosts": sum(1 for b in boosts if b.get("is_active") and b.get("expires_at", "") > datetime.now(timezone.utc).isoformat()),
            "total_issues": len(issues),
            "open_issues": sum(1 for i in issues if i.get("status") in ("open", "assigned", "in_progress")),
            "total_orders": len(orders),
            "total_activity": len(activity),
            "credit_balance": wallet.get("balance", 0) if wallet else 0,
            "credits_spent": wallet.get("total_spent", 0) if wallet else 0,
        }
    }


@router.get("/search-autocomplete")
async def search_autocomplete(q: str = Query("", min_length=1), admin: Dict = Depends(get_admin_user)):
    """Quick search across all user types by display_id or name."""
    q = q.strip()
    results = []

    collections = [
        ("vendors", "vendor_id", "vendor", "store_name"),
        ("resellers", "reseller_id", "reseller", "name"),
        ("affiliates", "affiliate_id", "affiliate", "name"),
        ("influencers", "influencer_id", "influencer", "name"),
        ("admin_users", "admin_id", "admin", "name"),
    ]

    for coll, id_field, role, name_field in collections:
        query = {"$or": [
            {"display_id": {"$regex": q, "$options": "i"}},
            {name_field: {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]}
        docs = await db[coll].find(query, {"_id": 0, id_field: 1, "display_id": 1, name_field: 1, "email": 1}).limit(5).to_list(5)
        for d in docs:
            results.append({
                "display_id": d.get("display_id", ""),
                "internal_id": d.get(id_field, ""),
                "name": d.get(name_field, ""),
                "email": d.get("email", ""),
                "role": role
            })

    return results[:15]


@router.post("/run-migration")
async def run_migration(admin: Dict = Depends(get_admin_user)):
    """Run display_id migration for all existing records."""
    stats = await migrate_existing_users()
    return {"message": "Migration complete", "migrated": stats}
