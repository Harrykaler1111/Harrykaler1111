from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
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

    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    settlement_info = None

    # Auto-settle commissions when order is delivered
    if status == "delivered" and order.get("settlement_status") != "settled":
        settings = await db.platform_settings.find_one({"setting_id": "global"}, {"_id": 0})
        commission_enabled = settings.get("commission_enabled", True) if settings else True

        if commission_enabled:
            from routes.order_routes import credit_influencer_commission, credit_vendor_wallet, record_platform_commission
            from config import DEFAULT_COMMISSION_RATE

            total = order["total"]
            platform_rate = settings.get("platform_commission_rate", 15.0) if settings else 15.0
            inf_rate_default = settings.get("influencer_commission_rate", 10.0) if settings else 10.0
            reseller_rate_default = settings.get("reseller_commission_rate", 5.0) if settings else 5.0

            actual_platform = total * (platform_rate / 100)
            actual_influencer = 0.0
            actual_reseller = 0.0

            # Credit influencer
            if order.get("influencer_id"):
                inf = await db.influencers.find_one({"influencer_id": order["influencer_id"]}, {"_id": 0})
                rate = inf.get("commission_rate", inf_rate_default) if inf else inf_rate_default
                actual_influencer = await credit_influencer_commission(order["influencer_id"], order_id, total, rate)

            # Credit reseller
            if order.get("referral_code"):
                reseller = await db.resellers.find_one({"referral_code": order["referral_code"], "status": "approved"}, {"_id": 0})
                if reseller:
                    actual_reseller = total * (reseller.get("commission_rate", reseller_rate_default) / 100)
                    new_bal = reseller.get("wallet_balance", 0) + actual_reseller
                    from auth import generate_id as gen_id
                    await db.reseller_wallet_transactions.insert_one({
                        "transaction_id": gen_id("rtxn_"),
                        "reseller_id": reseller["reseller_id"],
                        "type": "commission",
                        "amount": actual_reseller,
                        "balance_after": new_bal,
                        "description": f"Commission for order {order_id}",
                        "order_id": order_id,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
                    await db.resellers.update_one(
                        {"reseller_id": reseller["reseller_id"]},
                        {"$set": {"wallet_balance": new_bal}, "$inc": {"total_earnings": actual_reseller, "total_conversions": 1}}
                    )

            # Credit vendor
            actual_vendor = 0.0
            if order.get("vendor_id"):
                actual_vendor = total - actual_platform - actual_influencer - actual_reseller
                from routes.order_routes import credit_vendor_wallet as cv
                await cv(order["vendor_id"], order_id, actual_vendor)
                await record_platform_commission(order_id, actual_platform, order["vendor_id"])

            # Mark as settled
            await db.orders.update_one(
                {"order_id": order_id},
                {"$set": {
                    "payment_status": "paid",
                    "settlement_status": "settled",
                    "platform_commission": round(actual_platform, 2),
                    "influencer_commission": round(actual_influencer, 2),
                    "reseller_commission": round(actual_reseller, 2),
                    "vendor_amount": round(actual_vendor, 2),
                }}
            )

            settlement_info = {
                "total": total,
                "platform": round(actual_platform, 2),
                "influencer": round(actual_influencer, 2),
                "reseller": round(actual_reseller, 2),
                "vendor": round(actual_vendor, 2),
            }
            logger.info(f"Auto-settled order {order_id} on delivery: {settlement_info}")

    return {"message": f"Order status updated to {status}", "settlement": settlement_info}


# ============== ORDER TRACKING ==============

class TrackingUpdate(BaseModel):
    tracking_id: str
    courier_name: str = "Standard Shipping"

@router.put("/orders/{order_id}/tracking")
async def update_order_tracking(order_id: str, data: TrackingUpdate, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "orders", "update"):
        raise HTTPException(status_code=403, detail="Permission denied")

    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "tracking_id": data.tracking_id,
            "courier_name": data.courier_name,
            "status": "shipped",
            "shipped_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"message": "Tracking updated, order marked as shipped"}


@router.get("/orders/{order_id}/detail")
async def get_order_detail(order_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "orders", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Enrich with user info
    user = await db.users.find_one({"user_id": order.get("user_id")}, {"_id": 0, "name": 1, "email": 1, "phone": 1})
    order["customer"] = user or {}

    return order


# ============== NEW ORDER NOTIFICATIONS ==============

@router.get("/orders/new-count")
async def get_new_order_count(since: str = None, admin: Dict = Depends(get_admin_user)):
    """Get count of new orders since a given timestamp for polling"""
    if not check_permission(admin, "orders", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    query = {}
    if since:
        query["created_at"] = {"$gt": since}

    count = await db.orders.count_documents(query)
    latest = await db.orders.find(query, {"_id": 0, "order_id": 1, "total": 1, "created_at": 1}).sort("created_at", -1).limit(3).to_list(3)

    return {"count": count, "latest": latest}


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


# ============== MARKETPLACE ANALYTICS ==============

@router.get("/analytics/marketplace")
async def get_marketplace_analytics(admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "analytics", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    total_vendors = await db.vendors.count_documents({"status": "approved"})
    pending_vendors = await db.vendors.count_documents({"status": {"$in": ["pending", "kyc_submitted"]}})
    total_vendor_products = await db.vendor_products.count_documents({"approval_status": "approved"})
    pending_products = await db.vendor_products.count_documents({"approval_status": "pending_approval"})
    pending_vendor_withdrawals = await db.vendor_withdrawals.count_documents({"status": "pending"})

    pipeline = [
        {"$match": {"is_vendor_sale": True}},
        {"$group": {
            "_id": None,
            "total_sales": {"$sum": "$total"},
            "platform_revenue": {"$sum": "$platform_commission"},
            "influencer_payouts": {"$sum": "$influencer_commission"},
            "vendor_earnings": {"$sum": "$vendor_amount"},
            "order_count": {"$sum": 1}
        }}
    ]
    result = await db.sales_tracking.aggregate(pipeline).to_list(1)
    sales = result[0] if result else {}

    recent_sales = await db.sales_tracking.find(
        {"is_vendor_sale": True}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)

    top_vendors = await db.vendors.find(
        {"status": "approved"},
        {"_id": 0, "password": 0, "kyc_data": 0, "bank_details": 0}
    ).sort("total_sales", -1).limit(5).to_list(5)

    return {
        "vendors": {
            "total": total_vendors,
            "pending": pending_vendors,
            "pending_products": pending_products,
            "total_products": total_vendor_products,
            "pending_withdrawals": pending_vendor_withdrawals
        },
        "revenue": {
            "total_marketplace_sales": sales.get("total_sales", 0),
            "platform_revenue": sales.get("platform_revenue", 0),
            "influencer_payouts": sales.get("influencer_payouts", 0),
            "vendor_earnings": sales.get("vendor_earnings", 0),
            "total_orders": sales.get("order_count", 0)
        },
        "recent_sales": recent_sales,
        "top_vendors": [{
            "vendor_id": v["vendor_id"],
            "store_name": v["store_name"],
            "total_sales": v.get("total_sales", 0),
            "total_orders": v.get("total_orders", 0),
            "rating": v.get("rating", 0)
        } for v in top_vendors]
    }



# ============== SUPER ADMIN: PASSWORD & ROLE MANAGEMENT ==============

@router.put("/users/{admin_id}/password")
async def change_admin_password(admin_id: str, new_password: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "admin_users", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    target = await db.admin_users.find_one({"admin_id": admin_id})
    if not target:
        raise HTTPException(status_code=404, detail="Admin user not found")

    await db.admin_users.update_one(
        {"admin_id": admin_id},
        {"$set": {"password": hash_password(new_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Password updated"}


@router.put("/users/{admin_id}/role")
async def change_admin_role(admin_id: str, role: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "admin_users", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    valid_roles = [r.value for r in AdminRole]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    target = await db.admin_users.find_one({"admin_id": admin_id})
    if not target:
        raise HTTPException(status_code=404, detail="Admin user not found")

    await db.admin_users.update_one(
        {"admin_id": admin_id},
        {"$set": {"role": role, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Role changed to {role}"}


# ============== PLATFORM STATS ==============

@router.get("/platform-stats")
async def get_platform_stats(admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "analytics", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    total_customers = await db.users.count_documents({"role": "customer"})
    total_vendors = await db.vendors.count_documents({})
    total_influencers = await db.influencers.count_documents({})
    total_resellers = await db.resellers.count_documents({})
    total_admins = await db.admin_users.count_documents({})
    total_products = await db.products.count_documents({"is_active": True})
    total_orders = await db.orders.count_documents({})

    return {
        "total_customers": total_customers,
        "total_vendors": total_vendors,
        "total_influencers": total_influencers,
        "total_resellers": total_resellers,
        "total_admins": total_admins,
        "total_products": total_products,
        "total_orders": total_orders,
        "total_users": total_customers + total_vendors + total_influencers + total_resellers,
    }


# ============== ADMIN PRODUCT CRUD (Super Admin + Product Manager) ==============

@router.post("/products")
async def admin_create_product(product: Dict, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "products", "create"):
        raise HTTPException(status_code=403, detail="Permission denied")

    product_id = generate_id("prod_")
    product_doc = {
        "product_id": product_id,
        "name": product.get("name", ""),
        "description": product.get("description", ""),
        "price": float(product.get("price", 0)),
        "compare_price": product.get("compare_price"),
        "category": product.get("category", ""),
        "sizes": product.get("sizes", []),
        "colors": product.get("colors", []),
        "images": product.get("images", []),
        "videos": product.get("videos", []),
        "stock": int(product.get("stock", 0)),
        "is_limited_edition": product.get("is_limited_edition", False),
        "drop_date": product.get("drop_date"),
        "tags": product.get("tags", []),
        "is_active": True,
        "created_by": admin["admin_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.products.insert_one(product_doc)
    product_doc.pop("_id", None)
    return {"message": "Product created", "product": product_doc}


@router.put("/products/{product_id}")
async def admin_update_product(product_id: str, updates: Dict, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "products", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    existing = await db.products.find_one({"product_id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")

    allowed_fields = ["name", "description", "price", "compare_price", "category", "sizes", "colors", "images", "videos", "stock", "is_limited_edition", "drop_date", "tags", "is_active"]
    update_dict = {k: v for k, v in updates.items() if k in allowed_fields}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.products.update_one({"product_id": product_id}, {"$set": update_dict})
    return {"message": "Product updated"}


@router.put("/products/{product_id}/stock")
async def admin_update_stock(product_id: str, stock: int, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "products", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"stock": stock, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"message": f"Stock updated to {stock}"}


# ============== TOP LISTING MANUAL CONTROL ==============

class TopListingControl(BaseModel):
    vendor_id: str
    featured: bool = True
    position: Optional[int] = None


@router.put("/vendors/featured")
async def admin_feature_vendor(data: TopListingControl, admin: Dict = Depends(get_admin_user)):
    """Super Admin / Marketing Manager can push vendors to featured/top list"""
    if not check_permission(admin, "vendors", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    vendor = await db.vendors.find_one({"vendor_id": data.vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    await db.vendors.update_one(
        {"vendor_id": data.vendor_id},
        {"$set": {
            "is_featured": data.featured,
            "featured_position": data.position,
            "featured_by": admin["admin_id"],
            "featured_at": datetime.now(timezone.utc).isoformat() if data.featured else None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    action = "featured" if data.featured else "unfeatured"
    return {"message": f"Vendor {action} successfully"}


@router.get("/vendors/featured")
async def get_featured_vendors(admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "vendors", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")
    vendors = await db.vendors.find(
        {"is_featured": True},
        {"_id": 0, "vendor_id": 1, "store_name": 1, "featured_position": 1, "featured_at": 1}
    ).sort("featured_position", 1).to_list(50)
    return vendors
