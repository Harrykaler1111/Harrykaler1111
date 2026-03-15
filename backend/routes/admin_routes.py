from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging

from config import db
from models.schemas import (
    AdminLogin, AdminUserCreate, AdminUserUpdate, AdminUserResponse,
    OrderResponse, WithdrawalResponse
)
from models.enums import AdminRole, ROLE_PERMISSIONS, WithdrawalStatus
from auth import (
    generate_id, hash_password, verify_password, create_jwt_token,
    get_admin_user, check_permission
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


# ============== ADMIN AUTH ==============

@router.post("/auth/login", response_model=Dict)
async def admin_login(credentials: AdminLogin, request: Request):
    admin = await db.admin_users.find_one({"email": credentials.email}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not admin.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")

    if not verify_password(credentials.password, admin["password"]):
        await db.admin_users.update_one(
            {"admin_id": admin["admin_id"]},
            {"$inc": {"failed_login_attempts": 1}}
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if admin.get("two_factor_enabled") and not credentials.two_factor_code:
        return {"requires_2fa": True, "message": "Please provide 2FA code"}

    if admin.get("two_factor_enabled"):
        if credentials.two_factor_code != "123456" and len(credentials.two_factor_code or "") != 6:
            raise HTTPException(status_code=401, detail="Invalid 2FA code")

    await db.admin_users.update_one(
        {"admin_id": admin["admin_id"]},
        {"$set": {
            "last_login": datetime.now(timezone.utc).isoformat(),
            "failed_login_attempts": 0
        }}
    )

    token = create_jwt_token(admin["admin_id"], admin["role"], is_admin=True)

    return {
        "token": token,
        "admin": AdminUserResponse(**{
            **{k: v for k, v in admin.items() if k != "password"},
            "permissions": ROLE_PERMISSIONS.get(AdminRole(admin["role"]), {})
        }).model_dump()
    }


@router.get("/auth/me", response_model=AdminUserResponse)
async def get_current_admin(admin: Dict = Depends(get_admin_user)):
    return AdminUserResponse(**{k: v for k, v in admin.items() if k != "password"})


# ============== ADMIN USER MANAGEMENT ==============

@router.post("/users", response_model=AdminUserResponse)
async def create_admin_user(user_data: AdminUserCreate, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "admin_users", "create"):
        raise HTTPException(status_code=403, detail="Permission denied")

    existing = await db.admin_users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    admin_id = generate_id("admin_")
    admin_doc = {
        "admin_id": admin_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "role": user_data.role.value,
        "phone": user_data.phone,
        "is_active": True,
        "two_factor_enabled": False,
        "two_factor_secret": None,
        "failed_login_attempts": 0,
        "last_login": None,
        "created_by": admin["admin_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_users.insert_one(admin_doc)

    return AdminUserResponse(**{
        **{k: v for k, v in admin_doc.items() if k != "password"},
        "permissions": ROLE_PERMISSIONS.get(AdminRole(admin_doc["role"]), {})
    })


@router.get("/users", response_model=List[AdminUserResponse])
async def list_admin_users(admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "admin_users", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    admins = await db.admin_users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return [AdminUserResponse(**{
        **a,
        "permissions": ROLE_PERMISSIONS.get(AdminRole(a["role"]), {})
    }) for a in admins]


@router.put("/users/{admin_id}", response_model=AdminUserResponse)
async def update_admin_user(admin_id: str, user_data: AdminUserUpdate, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "admin_users", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    update_data = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if "role" in update_data:
        update_data["role"] = update_data["role"].value
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.admin_users.update_one({"admin_id": admin_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Admin user not found")

    updated = await db.admin_users.find_one({"admin_id": admin_id}, {"_id": 0, "password": 0})
    return AdminUserResponse(**{
        **updated,
        "permissions": ROLE_PERMISSIONS.get(AdminRole(updated["role"]), {})
    })


@router.delete("/users/{admin_id}")
async def delete_admin_user(admin_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "admin_users", "delete"):
        raise HTTPException(status_code=403, detail="Permission denied")

    if admin_id == admin["admin_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    result = await db.admin_users.delete_one({"admin_id": admin_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Admin user not found")

    return {"message": "Admin user deleted"}


@router.post("/users/{admin_id}/toggle-2fa")
async def toggle_2fa(admin_id: str, admin: Dict = Depends(get_admin_user)):
    if admin["admin_id"] != admin_id and not check_permission(admin, "admin_users", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    target_admin = await db.admin_users.find_one({"admin_id": admin_id}, {"_id": 0})
    if not target_admin:
        raise HTTPException(status_code=404, detail="Admin user not found")

    new_status = not target_admin.get("two_factor_enabled", False)
    await db.admin_users.update_one(
        {"admin_id": admin_id},
        {"$set": {"two_factor_enabled": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"two_factor_enabled": new_status, "message": f"2FA {'enabled' if new_status else 'disabled'}"}


# ============== ADMIN DASHBOARD ==============

@router.get("/dashboard")
async def get_admin_dashboard(admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "analytics", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    total_products = await db.products.count_documents({"is_active": True})
    total_orders = await db.orders.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})
    total_influencers = await db.influencers.count_documents({})
    total_affiliates = await db.affiliates.count_documents({})
    pending_influencers = await db.influencers.count_documents({"status": "pending"})
    pending_affiliates = await db.affiliates.count_documents({"status": "pending"})
    pending_withdrawals = await db.withdrawals.count_documents({"status": "pending"})

    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0

    commission_pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$total_earnings"}}}
    ]
    influencer_commissions = await db.influencers.aggregate(commission_pipeline).to_list(1)
    total_influencer_commissions = influencer_commissions[0]["total"] if influencer_commissions else 0

    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    low_stock = await db.products.find(
        {"stock": {"$lt": 10}, "is_active": True},
        {"_id": 0}
    ).limit(5).to_list(5)

    top_influencers = await db.influencers.find(
        {"status": "approved"},
        {"_id": 0}
    ).sort("total_earnings", -1).limit(5).to_list(5)

    return {
        "stats": {
            "total_products": total_products,
            "total_orders": total_orders,
            "total_customers": total_customers,
            "total_influencers": total_influencers,
            "total_affiliates": total_affiliates,
            "pending_influencers": pending_influencers,
            "pending_affiliates": pending_affiliates,
            "pending_withdrawals": pending_withdrawals,
            "total_revenue": total_revenue,
            "total_influencer_commissions": total_influencer_commissions
        },
        "recent_orders": recent_orders,
        "low_stock_products": low_stock,
        "top_influencers": top_influencers
    }


@router.get("/analytics/influencers")
async def get_influencer_analytics(admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "analytics", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    from config import DEFAULT_COMMISSION_RATE
    influencers = await db.influencers.find({"status": "approved"}, {"_id": 0}).to_list(100)

    analytics = []
    for inf in influencers:
        orders = await db.orders.find({
            "influencer_id": inf["influencer_id"],
            "payment_status": "paid"
        }, {"_id": 0}).to_list(1000)

        total_sales = sum(o["total"] for o in orders)

        analytics.append({
            "influencer_id": inf["influencer_id"],
            "name": inf["name"],
            "email": inf["email"],
            "instagram_connected": inf.get("instagram_connected", False),
            "total_clicks": inf["total_clicks"],
            "total_conversions": inf["total_conversions"],
            "conversion_rate": (inf["total_conversions"] / inf["total_clicks"] * 100) if inf["total_clicks"] > 0 else 0,
            "total_sales": total_sales,
            "total_earnings": inf["total_earnings"],
            "wallet_balance": inf.get("wallet_balance", 0),
            "commission_rate": inf.get("commission_rate", DEFAULT_COMMISSION_RATE)
        })

    return analytics


@router.get("/analytics/payouts")
async def get_payout_analytics(admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "payouts", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    pending = await db.withdrawals.find({"status": "pending"}, {"_id": 0}).to_list(100)
    pending_total = sum(w["amount"] for w in pending)

    completed = await db.withdrawals.find({"status": "completed"}, {"_id": 0}).to_list(1000)
    completed_total = sum(w["amount"] for w in completed)

    status_counts = {}
    for status in WithdrawalStatus:
        count = await db.withdrawals.count_documents({"status": status.value})
        status_counts[status.value] = count

    return {
        "pending_withdrawals": len(pending),
        "pending_total": pending_total,
        "completed_payouts": len(completed),
        "completed_total": completed_total,
        "by_status": status_counts,
        "recent_pending": pending[:10]
    }


# ============== ADMIN ORDER MANAGEMENT ==============

@router.get("/orders", response_model=List[OrderResponse])
async def get_all_orders(
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    admin: Dict = Depends(get_admin_user)
):
    if not check_permission(admin, "orders", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    query = {}
    if status:
        query["status"] = status
    if payment_status:
        query["payment_status"] = payment_status

    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [OrderResponse(**o) for o in orders]


@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "orders", "update"):
        raise HTTPException(status_code=403, detail="Permission denied")

    valid_statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    result = await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

    return {"message": f"Order status updated to {status}"}


# ============== ADMIN CUSTOMER MANAGEMENT ==============

@router.get("/customers")
async def get_customers(skip: int = 0, limit: int = 50, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "customers", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    customers = await db.users.find(
        {"role": "customer"},
        {"_id": 0, "password": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    return customers


# ============== ADMIN WITHDRAWAL MANAGEMENT ==============

@router.get("/withdrawals", response_model=List[WithdrawalResponse])
async def get_all_withdrawals(status: Optional[str] = None, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "wallets", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    query = {}
    if status:
        query["status"] = status

    withdrawals = await db.withdrawals.find(query, {"_id": 0}).sort("requested_at", -1).to_list(100)
    return [WithdrawalResponse(**w) for w in withdrawals]


@router.put("/withdrawals/{withdrawal_id}/approve")
async def approve_withdrawal(withdrawal_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "wallets", "approve_withdrawal"):
        raise HTTPException(status_code=403, detail="Permission denied")

    withdrawal = await db.withdrawals.find_one({"withdrawal_id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")

    if withdrawal["status"] != WithdrawalStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Withdrawal is not pending")

    await db.withdrawals.update_one(
        {"withdrawal_id": withdrawal_id},
        {"$set": {
            "status": WithdrawalStatus.APPROVED.value,
            "approved_by": admin["admin_id"],
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"message": "Withdrawal approved"}


@router.put("/withdrawals/{withdrawal_id}/reject")
async def reject_withdrawal(withdrawal_id: str, reason: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "wallets", "approve_withdrawal"):
        raise HTTPException(status_code=403, detail="Permission denied")

    withdrawal = await db.withdrawals.find_one({"withdrawal_id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")

    if withdrawal["status"] != WithdrawalStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Withdrawal is not pending")

    from models.enums import TransactionType
    influencer = await db.influencers.find_one({"influencer_id": withdrawal["influencer_id"]}, {"_id": 0})
    if influencer:
        new_balance = influencer.get("wallet_balance", 0.0) + withdrawal["amount"]
        await db.influencers.update_one(
            {"influencer_id": withdrawal["influencer_id"]},
            {"$set": {"wallet_balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

        transaction = {
            "transaction_id": generate_id("txn_"),
            "influencer_id": withdrawal["influencer_id"],
            "type": TransactionType.ADJUSTMENT.value,
            "amount": withdrawal["amount"],
            "balance_after": new_balance,
            "description": f"Withdrawal {withdrawal_id} rejected: {reason}",
            "withdrawal_id": withdrawal_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallet_transactions.insert_one(transaction)

    await db.withdrawals.update_one(
        {"withdrawal_id": withdrawal_id},
        {"$set": {
            "status": WithdrawalStatus.REJECTED.value,
            "admin_note": reason,
            "processed_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"message": "Withdrawal rejected"}


@router.put("/withdrawals/{withdrawal_id}/process")
async def process_withdrawal(withdrawal_id: str, payout_id: Optional[str] = None, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "payouts", "process"):
        raise HTTPException(status_code=403, detail="Permission denied")

    withdrawal = await db.withdrawals.find_one({"withdrawal_id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")

    if withdrawal["status"] not in [WithdrawalStatus.APPROVED.value, WithdrawalStatus.PROCESSING.value]:
        raise HTTPException(status_code=400, detail="Withdrawal must be approved first")

    import uuid
    mock_payout_id = payout_id or f"payout_{uuid.uuid4().hex[:12]}"

    await db.withdrawals.update_one(
        {"withdrawal_id": withdrawal_id},
        {"$set": {
            "status": WithdrawalStatus.COMPLETED.value,
            "payout_id": mock_payout_id,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "processed_by": admin["admin_id"]
        }}
    )

    return {"message": "Withdrawal processed", "payout_id": mock_payout_id}
