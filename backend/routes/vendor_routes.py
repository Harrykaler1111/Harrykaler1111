from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Dict, List, Optional
from datetime import datetime, timezone
import uuid
import os
import shutil
import logging

from config import db, PLATFORM_COMMISSION_RATE, MIN_WITHDRAWAL_AMOUNT, UPLOAD_DIR
from models.schemas import (
    VendorRegister, VendorLogin, VendorResponse, VendorProfileUpdate,
    VendorKYCSubmit, VendorProductCreate, VendorProductUpdate, VendorProductResponse,
    VendorWalletTransaction, VendorWithdrawalRequest, VendorWithdrawalResponse,
    VendorOfferCreate, VendorOfferResponse
)
from models.enums import VendorStatus, VendorProductStatus, WithdrawalStatus, TransactionType
from auth import (
    generate_id, hash_password, verify_password, create_jwt_token,
    get_current_vendor, get_admin_user, check_permission
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vendors", tags=["vendors"])


# ============== VENDOR AUTH ==============

@router.post("/register", response_model=Dict)
async def register_vendor(data: VendorRegister):
    existing = await db.vendors.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    vendor_id = generate_id("vendor_")
    vendor_doc = {
        "vendor_id": vendor_id,
        "email": data.email,
        "password": hash_password(data.password),
        "store_name": data.store_name,
        "owner_name": data.owner_name,
        "phone": data.phone,
        "store_description": data.store_description,
        "gst_number": data.gst_number,
        "status": VendorStatus.PENDING.value,
        "kyc_status": "not_submitted",
        "kyc_documents": {},
        "kyc_data": {},
        "bank_details": {},
        "wallet_balance": 0.0,
        "total_sales": 0.0,
        "total_products": 0,
        "total_orders": 0,
        "rating": 0.0,
        "review_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.vendors.insert_one(vendor_doc)

    token = create_jwt_token(vendor_id, "vendor")
    return {
        "token": token,
        "vendor": VendorResponse(**vendor_doc).model_dump()
    }


@router.post("/login", response_model=Dict)
async def vendor_login(credentials: VendorLogin):
    vendor = await db.vendors.find_one({"email": credentials.email}, {"_id": 0})
    if not vendor or not verify_password(credentials.password, vendor["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if vendor["status"] == VendorStatus.SUSPENDED.value:
        raise HTTPException(status_code=403, detail="Your vendor account has been suspended")

    token = create_jwt_token(vendor["vendor_id"], "vendor")
    return {
        "token": token,
        "vendor": VendorResponse(**vendor).model_dump()
    }


@router.get("/me", response_model=VendorResponse)
async def get_vendor_profile(vendor: Dict = Depends(get_current_vendor)):
    return VendorResponse(**vendor)


@router.put("/me", response_model=VendorResponse)
async def update_vendor_profile(data: VendorProfileUpdate, vendor: Dict = Depends(get_current_vendor)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.vendors.update_one({"vendor_id": vendor["vendor_id"]}, {"$set": update_data})
    updated = await db.vendors.find_one({"vendor_id": vendor["vendor_id"]}, {"_id": 0})
    return VendorResponse(**updated)


# ============== KYC ==============

@router.post("/kyc/submit")
async def submit_kyc(data: VendorKYCSubmit, vendor: Dict = Depends(get_current_vendor)):
    if vendor["kyc_status"] == "approved":
        raise HTTPException(status_code=400, detail="KYC already approved")

    kyc_data = {
        "pan_number": data.pan_number,
        "aadhaar_number": data.aadhaar_number,
    }

    bank_details = {
        "account_name": data.bank_account_name,
        "account_number": data.bank_account_number,
        "ifsc": data.bank_ifsc,
        "bank_name": data.bank_name
    }

    await db.vendors.update_one(
        {"vendor_id": vendor["vendor_id"]},
        {"$set": {
            "kyc_data": kyc_data,
            "bank_details": bank_details,
            "kyc_status": "submitted",
            "status": VendorStatus.KYC_SUBMITTED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"message": "KYC submitted successfully", "status": "submitted"}


@router.post("/kyc/upload/{doc_type}")
async def upload_kyc_document(doc_type: str, file: UploadFile = File(...), vendor: Dict = Depends(get_current_vendor)):
    valid_types = ["pan_card", "aadhaar_card", "bank_proof", "cancelled_cheque"]
    if doc_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid document type. Must be one of: {valid_types}")

    ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"
    filename = f"{vendor['vendor_id']}_{doc_type}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = UPLOAD_DIR / 'kyc' / filename

    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    doc_url = f"/api/uploads/kyc/{filename}"

    await db.vendors.update_one(
        {"vendor_id": vendor["vendor_id"]},
        {"$set": {
            f"kyc_documents.{doc_type}": doc_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"message": f"{doc_type} uploaded", "url": doc_url}


@router.get("/kyc/status")
async def get_kyc_status(vendor: Dict = Depends(get_current_vendor)):
    return {
        "kyc_status": vendor.get("kyc_status", "not_submitted"),
        "kyc_documents": vendor.get("kyc_documents", {}),
        "kyc_data": {k: v[:4] + "****" for k, v in vendor.get("kyc_data", {}).items()},
        "bank_details": {
            "bank_name": vendor.get("bank_details", {}).get("bank_name", ""),
            "account_number": "****" + vendor.get("bank_details", {}).get("account_number", "")[-4:] if vendor.get("bank_details", {}).get("account_number") else ""
        }
    }


# ============== VENDOR DASHBOARD ==============

@router.get("/dashboard")
async def get_vendor_dashboard(vendor: Dict = Depends(get_current_vendor)):
    product_count = await db.vendor_products.count_documents({
        "vendor_id": vendor["vendor_id"],
        "approval_status": {"$ne": VendorProductStatus.DELISTED.value}
    })
    approved_products = await db.vendor_products.count_documents({
        "vendor_id": vendor["vendor_id"],
        "approval_status": VendorProductStatus.APPROVED.value
    })
    pending_products = await db.vendor_products.count_documents({
        "vendor_id": vendor["vendor_id"],
        "approval_status": VendorProductStatus.PENDING_APPROVAL.value
    })

    orders = await db.orders.find(
        {"vendor_id": vendor["vendor_id"], "payment_status": "paid"},
        {"_id": 0}
    ).to_list(1000)

    total_sales = sum(o.get("vendor_amount", o.get("total", 0)) for o in orders)
    total_orders = len(orders)

    recent_orders = await db.orders.find(
        {"vendor_id": vendor["vendor_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)

    pending_withdrawal = await db.vendor_withdrawals.count_documents({
        "vendor_id": vendor["vendor_id"],
        "status": "pending"
    })

    transactions = await db.vendor_wallet_transactions.find(
        {"vendor_id": vendor["vendor_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)

    return {
        "stats": {
            "total_products": product_count,
            "approved_products": approved_products,
            "pending_products": pending_products,
            "total_orders": total_orders,
            "total_sales": total_sales,
            "wallet_balance": vendor.get("wallet_balance", 0.0),
            "rating": vendor.get("rating", 0.0),
            "review_count": vendor.get("review_count", 0),
            "pending_withdrawals": pending_withdrawal
        },
        "recent_orders": recent_orders,
        "recent_transactions": transactions
    }


@router.get("/sales/analytics")
async def get_vendor_sales_analytics(vendor: Dict = Depends(get_current_vendor)):
    sales = await db.sales_tracking.find(
        {"vendor_id": vendor["vendor_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    total_sales = sum(s.get("total", 0) for s in sales)
    total_platform_fees = sum(s.get("platform_commission", 0) for s in sales)
    total_influencer_commissions = sum(s.get("influencer_commission", 0) for s in sales)
    total_vendor_earnings = sum(s.get("vendor_amount", 0) for s in sales)

    return {
        "total_orders": len(sales),
        "total_sales": round(total_sales, 2),
        "platform_fees": round(total_platform_fees, 2),
        "influencer_commissions": round(total_influencer_commissions, 2),
        "vendor_earnings": round(total_vendor_earnings, 2),
        "platform_commission_rate": PLATFORM_COMMISSION_RATE,
        "recent_sales": sales[:10]
    }



# ============== VENDOR PRODUCT MANAGEMENT ==============

@router.post("/products", response_model=VendorProductResponse)
async def create_vendor_product(product: VendorProductCreate, vendor: Dict = Depends(get_current_vendor)):
    if vendor["status"] != VendorStatus.APPROVED.value:
        raise HTTPException(status_code=403, detail="Your vendor account must be approved to add products")

    product_id = generate_id("vprod_")
    product_doc = {
        "product_id": product_id,
        "vendor_id": vendor["vendor_id"],
        "vendor_name": vendor["store_name"],
        **product.model_dump(),
        "approval_status": VendorProductStatus.PENDING_APPROVAL.value,
        "rejection_reason": None,
        "is_active": False,
        "total_sold": 0,
        "total_revenue": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.vendor_products.insert_one(product_doc)

    await db.vendors.update_one(
        {"vendor_id": vendor["vendor_id"]},
        {"$inc": {"total_products": 1}}
    )

    return VendorProductResponse(**product_doc)


@router.get("/products", response_model=List[VendorProductResponse])
async def get_vendor_products(
    status: Optional[str] = None,
    vendor: Dict = Depends(get_current_vendor)
):
    query = {"vendor_id": vendor["vendor_id"]}
    if status:
        query["approval_status"] = status

    products = await db.vendor_products.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [VendorProductResponse(**p) for p in products]


@router.get("/products/{product_id}", response_model=VendorProductResponse)
async def get_vendor_product(product_id: str, vendor: Dict = Depends(get_current_vendor)):
    product = await db.vendor_products.find_one(
        {"product_id": product_id, "vendor_id": vendor["vendor_id"]},
        {"_id": 0}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return VendorProductResponse(**product)


@router.put("/products/{product_id}", response_model=VendorProductResponse)
async def update_vendor_product(product_id: str, data: VendorProductUpdate, vendor: Dict = Depends(get_current_vendor)):
    product = await db.vendor_products.find_one(
        {"product_id": product_id, "vendor_id": vendor["vendor_id"]},
        {"_id": 0}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    if product["approval_status"] == VendorProductStatus.APPROVED.value:
        update_data["approval_status"] = VendorProductStatus.PENDING_APPROVAL.value
        update_data["is_active"] = False

    await db.vendor_products.update_one({"product_id": product_id}, {"$set": update_data})
    updated = await db.vendor_products.find_one({"product_id": product_id}, {"_id": 0})
    return VendorProductResponse(**updated)


@router.delete("/products/{product_id}")
async def delete_vendor_product(product_id: str, vendor: Dict = Depends(get_current_vendor)):
    result = await db.vendor_products.update_one(
        {"product_id": product_id, "vendor_id": vendor["vendor_id"]},
        {"$set": {
            "approval_status": VendorProductStatus.DELISTED.value,
            "is_active": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product delisted"}


@router.put("/products/{product_id}/stock")
async def update_vendor_product_stock(product_id: str, stock: int, vendor: Dict = Depends(get_current_vendor)):
    """Update stock without triggering re-approval"""
    result = await db.vendor_products.update_one(
        {"product_id": product_id, "vendor_id": vendor["vendor_id"]},
        {"$set": {"stock": stock, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": f"Stock updated to {stock}"}


@router.put("/products/{product_id}/price")
async def update_vendor_product_price(product_id: str, price: float, vendor: Dict = Depends(get_current_vendor)):
    """Update price without triggering re-approval"""
    result = await db.vendor_products.update_one(
        {"product_id": product_id, "vendor_id": vendor["vendor_id"]},
        {"$set": {"price": price, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": f"Price updated to {price}"}


# ============== VENDOR ORDERS ==============

@router.get("/orders")
async def get_vendor_orders(status: Optional[str] = None, vendor: Dict = Depends(get_current_vendor)):
    query = {"vendor_id": vendor["vendor_id"]}
    if status:
        query["status"] = status

    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders


@router.put("/orders/{order_id}/shipping")
async def update_shipping_status(order_id: str, status: str, vendor: Dict = Depends(get_current_vendor)):
    valid_statuses = ["processing", "shipped", "delivered"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid shipping status")

    result = await db.orders.update_one(
        {"order_id": order_id, "vendor_id": vendor["vendor_id"]},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": f"Order status updated to {status}"}


# ============== VENDOR WALLET & WITHDRAWALS ==============

@router.get("/wallet/balance")
async def get_vendor_wallet_balance(vendor: Dict = Depends(get_current_vendor)):
    pending_wd = await db.vendor_withdrawals.find(
        {"vendor_id": vendor["vendor_id"], "status": {"$in": ["pending", "processing"]}},
        {"_id": 0}
    ).to_list(10)
    pending_amount = sum(w["amount"] for w in pending_wd)

    return {
        "wallet_balance": vendor.get("wallet_balance", 0.0),
        "total_sales": vendor.get("total_sales", 0.0),
        "pending_withdrawals": pending_amount,
        "available_balance": vendor.get("wallet_balance", 0.0) - pending_amount,
        "min_withdrawal_amount": MIN_WITHDRAWAL_AMOUNT,
        "platform_commission_rate": PLATFORM_COMMISSION_RATE
    }


@router.get("/wallet/transactions", response_model=List[VendorWalletTransaction])
async def get_vendor_wallet_transactions(skip: int = 0, limit: int = 50, vendor: Dict = Depends(get_current_vendor)):
    transactions = await db.vendor_wallet_transactions.find(
        {"vendor_id": vendor["vendor_id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [VendorWalletTransaction(**t) for t in transactions]


@router.post("/wallet/withdraw", response_model=VendorWithdrawalResponse)
async def request_vendor_withdrawal(request: VendorWithdrawalRequest, vendor: Dict = Depends(get_current_vendor)):
    if vendor["status"] != VendorStatus.APPROVED.value:
        raise HTTPException(status_code=403, detail="Vendor account not approved")

    if vendor.get("kyc_status") != "approved":
        raise HTTPException(status_code=403, detail="KYC must be approved for withdrawals")

    balance = vendor.get("wallet_balance", 0.0)
    if request.amount < MIN_WITHDRAWAL_AMOUNT:
        raise HTTPException(status_code=400, detail=f"Minimum withdrawal is Rs. {MIN_WITHDRAWAL_AMOUNT}")

    if request.amount > balance:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")

    pending = await db.vendor_withdrawals.find_one({
        "vendor_id": vendor["vendor_id"],
        "status": {"$in": ["pending", "processing"]}
    })
    if pending:
        raise HTTPException(status_code=400, detail="You have a pending withdrawal")

    bank_details = vendor.get("bank_details", {})
    if not bank_details.get("account_number"):
        raise HTTPException(status_code=400, detail="Bank details not found. Please complete KYC")

    withdrawal_id = generate_id("vwd_")
    withdrawal_doc = {
        "withdrawal_id": withdrawal_id,
        "vendor_id": vendor["vendor_id"],
        "vendor_name": vendor["store_name"],
        "amount": request.amount,
        "status": WithdrawalStatus.PENDING.value,
        "bank_details": bank_details,
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "processed_at": None,
        "admin_note": None
    }

    await db.vendor_withdrawals.insert_one(withdrawal_doc)

    new_balance = balance - request.amount
    await db.vendors.update_one(
        {"vendor_id": vendor["vendor_id"]},
        {"$set": {"wallet_balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    await db.vendor_wallet_transactions.insert_one({
        "transaction_id": generate_id("vtxn_"),
        "vendor_id": vendor["vendor_id"],
        "type": TransactionType.WITHDRAWAL.value,
        "amount": -request.amount,
        "balance_after": new_balance,
        "description": f"Withdrawal request {withdrawal_id}",
        "withdrawal_id": withdrawal_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return VendorWithdrawalResponse(**withdrawal_doc)


@router.get("/withdrawals", response_model=List[VendorWithdrawalResponse])
async def get_vendor_withdrawals(vendor: Dict = Depends(get_current_vendor)):
    withdrawals = await db.vendor_withdrawals.find(
        {"vendor_id": vendor["vendor_id"]},
        {"_id": 0}
    ).sort("requested_at", -1).to_list(50)
    return [VendorWithdrawalResponse(**w) for w in withdrawals]


# ============== VENDOR OFFERS ==============

@router.post("/offers", response_model=VendorOfferResponse)
async def create_vendor_offer(offer: VendorOfferCreate, vendor: Dict = Depends(get_current_vendor)):
    if vendor["status"] != VendorStatus.APPROVED.value:
        raise HTTPException(status_code=403, detail="Vendor account must be approved")

    if offer.coupon_code:
        existing = await db.vendor_offers.find_one({"coupon_code": offer.coupon_code.upper()})
        if existing:
            raise HTTPException(status_code=400, detail="Coupon code already exists")

    offer_id = generate_id("offer_")
    offer_doc = {
        "offer_id": offer_id,
        "vendor_id": vendor["vendor_id"],
        **offer.model_dump(),
        "coupon_code": offer.coupon_code.upper() if offer.coupon_code else None,
        "is_active": True,
        "used_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.vendor_offers.insert_one(offer_doc)
    return VendorOfferResponse(**offer_doc)


@router.get("/offers", response_model=List[VendorOfferResponse])
async def get_vendor_offers(vendor: Dict = Depends(get_current_vendor)):
    offers = await db.vendor_offers.find(
        {"vendor_id": vendor["vendor_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return [VendorOfferResponse(**o) for o in offers]


@router.delete("/offers/{offer_id}")
async def deactivate_vendor_offer(offer_id: str, vendor: Dict = Depends(get_current_vendor)):
    result = await db.vendor_offers.update_one(
        {"offer_id": offer_id, "vendor_id": vendor["vendor_id"]},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"message": "Offer deactivated"}


# ============== VENDOR INFLUENCER BROWSING ==============

@router.get("/influencers/browse")
async def browse_influencers(vendor: Dict = Depends(get_current_vendor)):
    influencers = await db.influencers.find(
        {"status": "approved"},
        {"_id": 0, "instagram_access_token": 0}
    ).sort("total_earnings", -1).to_list(50)

    return [{
        "influencer_id": inf["influencer_id"],
        "name": inf["name"],
        "bio": inf.get("bio", ""),
        "instagram_handle": inf.get("instagram_handle"),
        "followers_count": inf.get("followers_count", 0),
        "total_conversions": inf.get("total_conversions", 0),
        "niche": inf.get("niche", []),
        "commission_rate": inf.get("commission_rate", 10.0)
    } for inf in influencers]


# ============== ADMIN VENDOR MANAGEMENT ==============

@router.get("/admin/list", response_model=List[VendorResponse])
async def admin_list_vendors(status: Optional[str] = None, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "vendors", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    query = {}
    if status:
        query["status"] = status

    vendors = await db.vendors.find(query, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(100)
    return [VendorResponse(**v) for v in vendors]


@router.get("/admin/{vendor_id}")
async def admin_get_vendor_detail(vendor_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "vendors", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    vendor = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0, "password": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    products = await db.vendor_products.count_documents({"vendor_id": vendor_id})
    orders = await db.orders.count_documents({"vendor_id": vendor_id})

    return {
        **VendorResponse(**vendor).model_dump(),
        "kyc_status": vendor.get("kyc_status", "not_submitted"),
        "kyc_documents": vendor.get("kyc_documents", {}),
        "bank_details": vendor.get("bank_details", {}),
        "total_products_actual": products,
        "total_orders_actual": orders
    }


@router.put("/admin/{vendor_id}/approve")
async def admin_approve_vendor(vendor_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "vendors", "approve"):
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.vendors.update_one(
        {"vendor_id": vendor_id},
        {"$set": {
            "status": VendorStatus.APPROVED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"message": "Vendor approved"}


@router.put("/admin/{vendor_id}/reject")
async def admin_reject_vendor(vendor_id: str, reason: str = "Does not meet requirements", admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "vendors", "reject"):
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.vendors.update_one(
        {"vendor_id": vendor_id},
        {"$set": {
            "status": VendorStatus.REJECTED.value,
            "rejection_reason": reason,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"message": "Vendor rejected"}


@router.put("/admin/{vendor_id}/suspend")
async def admin_suspend_vendor(vendor_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "vendors", "suspend"):
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.vendors.update_one(
        {"vendor_id": vendor_id},
        {"$set": {
            "status": VendorStatus.SUSPENDED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")

    await db.vendor_products.update_many(
        {"vendor_id": vendor_id},
        {"$set": {"is_active": False}}
    )

    return {"message": "Vendor suspended"}


@router.put("/admin/{vendor_id}/kyc/approve")
async def admin_approve_kyc(vendor_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "vendor_kyc", "approve"):
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.vendors.update_one(
        {"vendor_id": vendor_id},
        {"$set": {
            "kyc_status": "approved",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"message": "KYC approved"}


@router.put("/admin/{vendor_id}/kyc/reject")
async def admin_reject_kyc(vendor_id: str, reason: str = "Documents unclear", admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "vendor_kyc", "reject"):
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.vendors.update_one(
        {"vendor_id": vendor_id},
        {"$set": {
            "kyc_status": "rejected",
            "kyc_rejection_reason": reason,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"message": "KYC rejected"}


# ============== ADMIN VENDOR PRODUCT APPROVAL ==============

@router.get("/admin/products/pending", response_model=List[VendorProductResponse])
async def admin_get_pending_products(admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "vendor_products", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    products = await db.vendor_products.find(
        {"approval_status": VendorProductStatus.PENDING_APPROVAL.value},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [VendorProductResponse(**p) for p in products]


@router.put("/admin/products/{product_id}/approve")
async def admin_approve_product(product_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "vendor_products", "approve"):
        raise HTTPException(status_code=403, detail="Permission denied")

    product = await db.vendor_products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    await db.vendor_products.update_one(
        {"product_id": product_id},
        {"$set": {
            "approval_status": VendorProductStatus.APPROVED.value,
            "is_active": True,
            "rejection_reason": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    # Also add to the main products collection for marketplace visibility
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {
            "product_id": product_id,
            "vendor_id": product["vendor_id"],
            "vendor_name": product.get("vendor_name", ""),
            "name": product["name"],
            "description": product["description"],
            "price": product["price"],
            "compare_price": product.get("compare_price"),
            "category": product["category"],
            "sizes": product["sizes"],
            "colors": product["colors"],
            "images": product["images"],
            "stock": product["stock"],
            "tags": product.get("tags", []),
            "is_limited_edition": product.get("is_limited_edition", False),
            "drop_date": product.get("drop_date"),
            "is_active": True,
            "is_vendor_product": True,
            "created_at": product["created_at"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

    return {"message": "Product approved and listed on marketplace"}


@router.put("/admin/products/{product_id}/reject")
async def admin_reject_product(product_id: str, reason: str = "Does not meet quality standards", admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "vendor_products", "reject"):
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.vendor_products.update_one(
        {"product_id": product_id},
        {"$set": {
            "approval_status": VendorProductStatus.REJECTED.value,
            "rejection_reason": reason,
            "is_active": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    await db.products.delete_one({"product_id": product_id})

    return {"message": "Product rejected"}


# ============== ADMIN VENDOR WITHDRAWALS ==============

@router.get("/admin/withdrawals")
async def admin_get_vendor_withdrawals(status: Optional[str] = None, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "vendor_withdrawals", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    query = {}
    if status:
        query["status"] = status

    withdrawals = await db.vendor_withdrawals.find(query, {"_id": 0}).sort("requested_at", -1).to_list(100)
    return withdrawals


@router.put("/admin/withdrawals/{withdrawal_id}/approve")
async def admin_approve_vendor_withdrawal(withdrawal_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "vendor_withdrawals", "approve"):
        raise HTTPException(status_code=403, detail="Permission denied")

    withdrawal = await db.vendor_withdrawals.find_one({"withdrawal_id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")

    if withdrawal["status"] != "pending":
        raise HTTPException(status_code=400, detail="Withdrawal is not pending")

    mock_payout_id = f"vpayout_{uuid.uuid4().hex[:12]}"
    await db.vendor_withdrawals.update_one(
        {"withdrawal_id": withdrawal_id},
        {"$set": {
            "status": "completed",
            "payout_id": mock_payout_id,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "processed_by": admin["admin_id"]
        }}
    )

    return {"message": "Withdrawal approved and processed", "payout_id": mock_payout_id}


@router.put("/admin/withdrawals/{withdrawal_id}/reject")
async def admin_reject_vendor_withdrawal(withdrawal_id: str, reason: str = "Rejected", admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "vendor_withdrawals", "reject"):
        raise HTTPException(status_code=403, detail="Permission denied")

    withdrawal = await db.vendor_withdrawals.find_one({"withdrawal_id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")

    if withdrawal["status"] != "pending":
        raise HTTPException(status_code=400, detail="Withdrawal is not pending")

    vendor = await db.vendors.find_one({"vendor_id": withdrawal["vendor_id"]}, {"_id": 0})
    if vendor:
        new_balance = vendor.get("wallet_balance", 0.0) + withdrawal["amount"]
        await db.vendors.update_one(
            {"vendor_id": withdrawal["vendor_id"]},
            {"$set": {"wallet_balance": new_balance}}
        )
        await db.vendor_wallet_transactions.insert_one({
            "transaction_id": generate_id("vtxn_"),
            "vendor_id": withdrawal["vendor_id"],
            "type": TransactionType.ADJUSTMENT.value,
            "amount": withdrawal["amount"],
            "balance_after": new_balance,
            "description": f"Withdrawal {withdrawal_id} rejected: {reason}",
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    await db.vendor_withdrawals.update_one(
        {"withdrawal_id": withdrawal_id},
        {"$set": {
            "status": "rejected",
            "admin_note": reason,
            "processed_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"message": "Withdrawal rejected, balance refunded"}


# ============== PUBLIC VENDOR ENDPOINTS ==============

@router.get("/public/{vendor_id}")
async def get_public_vendor_profile(vendor_id: str):
    vendor = await db.vendors.find_one(
        {"vendor_id": vendor_id, "status": VendorStatus.APPROVED.value},
        {"_id": 0, "password": 0, "kyc_data": 0, "kyc_documents": 0, "bank_details": 0}
    )
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    products = await db.vendor_products.find(
        {"vendor_id": vendor_id, "approval_status": VendorProductStatus.APPROVED.value, "is_active": True},
        {"_id": 0}
    ).to_list(50)

    return {
        "vendor": VendorResponse(**vendor).model_dump(),
        "products": [VendorProductResponse(**p).model_dump() for p in products]
    }


# ============== PUBLIC STORE ==============

@router.get("/store/{vendor_id}")
async def get_public_vendor_store(vendor_id: str):
    """Public endpoint - no auth required. Returns vendor store info + approved products."""
    vendor = await db.vendors.find_one(
        {"vendor_id": vendor_id, "status": VendorStatus.APPROVED.value},
        {"_id": 0, "password": 0, "kyc_data": 0, "kyc_documents": 0, "bank_details": 0, "wallet_balance": 0}
    )
    if not vendor:
        raise HTTPException(status_code=404, detail="Store not found")

    products = await db.vendor_products.find(
        {"vendor_id": vendor_id, "approval_status": VendorProductStatus.APPROVED.value, "is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    # Get review stats
    review_stats = await db.reviews.aggregate([
        {"$match": {"vendor_id": vendor_id}},
        {"$group": {
            "_id": None,
            "avg_rating": {"$avg": "$rating"},
            "total": {"$sum": 1},
            "five": {"$sum": {"$cond": [{"$eq": ["$rating", 5]}, 1, 0]}},
            "four": {"$sum": {"$cond": [{"$eq": ["$rating", 4]}, 1, 0]}},
            "three": {"$sum": {"$cond": [{"$eq": ["$rating", 3]}, 1, 0]}},
            "two": {"$sum": {"$cond": [{"$eq": ["$rating", 2]}, 1, 0]}},
            "one": {"$sum": {"$cond": [{"$eq": ["$rating", 1]}, 1, 0]}},
        }}
    ]).to_list(1)

    recent_reviews = await db.reviews.find(
        {"vendor_id": vendor_id}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)

    return {
        "store_name": vendor.get("store_name", ""),
        "store_description": vendor.get("store_description", ""),
        "owner_name": vendor.get("owner_name", ""),
        "vendor_id": vendor["vendor_id"],
        "rating": vendor.get("rating", 0.0),
        "review_count": vendor.get("review_count", 0),
        "total_products": len(products),
        "member_since": vendor.get("created_at", ""),
        "products": [VendorProductResponse(**p).model_dump() for p in products],
        "review_stats": review_stats[0] if review_stats else {"avg_rating": 0, "total": 0, "five": 0, "four": 0, "three": 0, "two": 0, "one": 0},
        "recent_reviews": recent_reviews,
    }
