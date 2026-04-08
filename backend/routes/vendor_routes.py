from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel as PydanticBaseModel
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

    from display_ids import generate_display_id
    vendor_id = generate_id("vendor_")
    display_id = await generate_display_id("vendor")
    vendor_doc = {
        "vendor_id": vendor_id,
        "display_id": display_id,
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


class VendorPasswordUpdate(PydanticBaseModel):
    current_password: str
    new_password: str


@router.put("/password/update")
async def update_vendor_password(data: VendorPasswordUpdate, vendor: Dict = Depends(get_current_vendor)):
    if not verify_password(data.current_password, vendor["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    hashed = hash_password(data.new_password)
    await db.vendors.update_one(
        {"vendor_id": vendor["vendor_id"]},
        {"$set": {"password": hashed, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Password updated successfully"}


@router.put("/me", response_model=VendorResponse)
async def update_vendor_profile(data: VendorProfileUpdate, vendor: Dict = Depends(get_current_vendor)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.vendors.update_one({"vendor_id": vendor["vendor_id"]}, {"$set": update_data})
    updated = await db.vendors.find_one({"vendor_id": vendor["vendor_id"]}, {"_id": 0})
    return VendorResponse(**updated)


# ============== KYC ==============

KYC_DOC_TYPES = ["pan_card", "aadhaar_front", "aadhaar_back", "msme_certificate", "gst_certificate", "bank_proof"]
KYC_REQUIRED_DOCS = ["pan_card", "aadhaar_front", "aadhaar_back", "msme_certificate"]

ALLOWED_KYC_TYPES = {
    "image/jpeg", "image/png", "image/webp",
    "application/pdf",
}
MAX_KYC_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/kyc/submit")
async def submit_kyc(data: VendorKYCSubmit, vendor: Dict = Depends(get_current_vendor)):
    if vendor["kyc_status"] == "approved":
        raise HTTPException(status_code=400, detail="KYC already approved")

    # Validate PAN format
    import re
    if not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]$', data.pan_number.upper()):
        raise HTTPException(status_code=400, detail="Invalid PAN format (e.g., ABCDE1234F)")

    # Validate Aadhaar format (12 digits)
    aadhaar_clean = data.aadhaar_number.replace(" ", "")
    if not re.match(r'^\d{12}$', aadhaar_clean):
        raise HTTPException(status_code=400, detail="Invalid Aadhaar number (must be 12 digits)")

    kyc_data = {
        "pan_number": data.pan_number.upper(),
        "aadhaar_number": aadhaar_clean,
        "gst_number": data.gst_number or "",
        "msme_registration": data.msme_registration or "",
    }

    bank_details = {
        "account_name": data.bank_account_name,
        "account_number": data.bank_account_number,
        "ifsc": data.bank_ifsc.upper(),
        "bank_name": data.bank_name
    }

    # Check all required documents are uploaded
    existing_docs = vendor.get("kyc_documents", {})
    missing = [d for d in KYC_REQUIRED_DOCS if d not in existing_docs or not existing_docs[d].get("url")]
    if missing:
        raise HTTPException(status_code=400, detail=f"Please upload required documents first: {', '.join(d.replace('_', ' ').title() for d in missing)}")

    # Build document status map — set all to pending_review
    doc_statuses = {}
    for doc_type, doc_info in existing_docs.items():
        doc_statuses[doc_type] = {
            **doc_info,
            "status": "pending_review",
            "review_note": "",
            "reviewed_at": "",
            "reviewed_by": ""
        }

    await db.vendors.update_one(
        {"vendor_id": vendor["vendor_id"]},
        {"$set": {
            "kyc_data": kyc_data,
            "bank_details": bank_details,
            "kyc_documents": doc_statuses,
            "kyc_status": "submitted",
            "kyc_submitted_at": datetime.now(timezone.utc).isoformat(),
            "status": VendorStatus.KYC_SUBMITTED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"message": "KYC submitted for review", "status": "submitted"}


@router.post("/kyc/upload/{doc_type}")
async def upload_kyc_document(doc_type: str, file: UploadFile = File(...), vendor: Dict = Depends(get_current_vendor)):
    if doc_type not in KYC_DOC_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid document type. Must be one of: {KYC_DOC_TYPES}")

    if vendor.get("kyc_status") == "approved":
        raise HTTPException(status_code=400, detail="KYC already approved, cannot re-upload")

    if file.content_type not in ALLOWED_KYC_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WebP, and PDF files are accepted")

    content = await file.read()
    if len(content) > MAX_KYC_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"

    # Use cloud storage
    try:
        from routes.upload_routes import put_object
        path = f"pigma/kyc/{vendor['vendor_id']}/{doc_type}_{uuid.uuid4().hex[:8]}.{ext}"
        result = put_object(path, content, file.content_type)
        doc_url = f"/api/uploads/files/{result['path']}"
    except Exception as e:
        logger.error(f"Cloud KYC upload failed, falling back to local: {e}")
        # Fallback to local storage
        os.makedirs(str(UPLOAD_DIR / 'kyc'), exist_ok=True)
        filename = f"{vendor['vendor_id']}_{doc_type}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = UPLOAD_DIR / 'kyc' / filename
        with open(filepath, "wb") as f:
            f.write(content)
        doc_url = f"/api/static-uploads/kyc/{filename}"

    doc_entry = {
        "url": doc_url,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "status": "uploaded",
        "review_note": "",
        "reviewed_at": "",
        "reviewed_by": ""
    }

    await db.vendors.update_one(
        {"vendor_id": vendor["vendor_id"]},
        {"$set": {
            f"kyc_documents.{doc_type}": doc_entry,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"message": f"{doc_type.replace('_', ' ').title()} uploaded", "url": doc_url, "doc_type": doc_type}


@router.get("/kyc/status")
async def get_kyc_status(vendor: Dict = Depends(get_current_vendor)):
    kyc_data = vendor.get("kyc_data", {})
    masked_data = {}
    if kyc_data.get("pan_number"):
        masked_data["pan_number"] = kyc_data["pan_number"][:4] + "****" + kyc_data["pan_number"][-1:]
    if kyc_data.get("aadhaar_number"):
        masked_data["aadhaar_number"] = "****" + kyc_data["aadhaar_number"][-4:]
    masked_data["gst_number"] = kyc_data.get("gst_number", "")
    masked_data["msme_registration"] = kyc_data.get("msme_registration", "")

    docs = vendor.get("kyc_documents", {})
    # Strip URLs for security, return only status info
    doc_status = {}
    for doc_type, info in docs.items():
        if isinstance(info, dict):
            doc_status[doc_type] = {
                "status": info.get("status", "uploaded"),
                "filename": info.get("filename", ""),
                "uploaded_at": info.get("uploaded_at", ""),
                "review_note": info.get("review_note", ""),
                "url": info.get("url", ""),
            }
        else:
            doc_status[doc_type] = {"status": "uploaded", "url": info, "filename": "", "uploaded_at": "", "review_note": ""}

    bank = vendor.get("bank_details", {})
    return {
        "kyc_status": vendor.get("kyc_status", "not_submitted"),
        "kyc_data": masked_data,
        "kyc_documents": doc_status,
        "kyc_rejection_reason": vendor.get("kyc_rejection_reason", ""),
        "kyc_submitted_at": vendor.get("kyc_submitted_at", ""),
        "bank_details": {
            "bank_name": bank.get("bank_name", ""),
            "account_name": bank.get("account_name", ""),
            "account_number": "****" + bank.get("account_number", "")[-4:] if bank.get("account_number") else "",
            "ifsc": bank.get("ifsc", ""),
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


# ============== VENDOR ANALYTICS ==============

@router.get("/analytics/overview")
async def get_vendor_analytics_overview(vendor: Dict = Depends(get_current_vendor)):
    """Comprehensive analytics overview for vendor dashboard"""
    vid = vendor["vendor_id"]

    # Orders data
    orders = await db.orders.find(
        {"vendor_id": vid, "payment_status": "paid"}, {"_id": 0}
    ).to_list(5000)

    total_revenue = sum(o.get("vendor_amount", o.get("total", 0)) for o in orders)
    total_orders = len(orders)
    avg_order_value = round(total_revenue / total_orders, 2) if total_orders else 0

    # Credits data
    credits = await db.vendor_credits.find_one({"vendor_id": vid}, {"_id": 0})
    credit_balance = credits.get("balance", 0) if credits else 0
    total_credits_spent = credits.get("total_spent", 0) if credits else 0

    # Promotions data
    promotions = await db.product_promotions.find({"vendor_id": vid}, {"_id": 0}).to_list(200)
    active_promos = [p for p in promotions if p.get("is_active")]
    total_promo_spend = sum(p.get("total_cost", 0) for p in promotions)

    # Revenue from promoted products
    promoted_product_ids = list(set(p.get("product_id") for p in promotions))
    promoted_revenue = 0
    if promoted_product_ids:
        promo_orders = [o for o in orders if any(
            item.get("product_id") in promoted_product_ids
            for item in o.get("items", [])
        )]
        promoted_revenue = sum(o.get("vendor_amount", o.get("total", 0)) for o in promo_orders)

    roi = round((promoted_revenue / total_promo_spend - 1) * 100, 1) if total_promo_spend > 0 else 0

    # Daily sales for last 30 days
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    daily_sales = {}
    for i in range(30):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        daily_sales[day] = {"date": day, "revenue": 0, "orders": 0}

    for o in orders:
        day = o.get("created_at", "")[:10]
        if day in daily_sales:
            daily_sales[day]["revenue"] += o.get("vendor_amount", o.get("total", 0))
            daily_sales[day]["orders"] += 1

    sales_trend = sorted(daily_sales.values(), key=lambda x: x["date"])

    # Top products by revenue
    product_revenue = {}
    for o in orders:
        for item in o.get("items", []):
            pid = item.get("product_id", "")
            if pid not in product_revenue:
                product_revenue[pid] = {
                    "product_id": pid,
                    "name": item.get("name", "Unknown"),
                    "revenue": 0,
                    "orders": 0,
                    "units_sold": 0
                }
            product_revenue[pid]["revenue"] += item.get("price", 0) * item.get("quantity", 1)
            product_revenue[pid]["orders"] += 1
            product_revenue[pid]["units_sold"] += item.get("quantity", 1)

    top_products = sorted(product_revenue.values(), key=lambda x: x["revenue"], reverse=True)[:10]

    # Credit usage breakdown by promotion type
    credit_by_type = {}
    for p in promotions:
        lt = p.get("listing_type", "unknown")
        if lt not in credit_by_type:
            credit_by_type[lt] = {"type": lt, "credits": 0, "count": 0}
        credit_by_type[lt]["credits"] += p.get("total_cost", 0)
        credit_by_type[lt]["count"] += 1

    # Credit transactions
    credit_txns = await db.credit_transactions.find(
        {"vendor_id": vid}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)

    return {
        "summary": {
            "total_revenue": round(total_revenue, 2),
            "total_orders": total_orders,
            "avg_order_value": avg_order_value,
            "credit_balance": credit_balance,
            "total_credits_spent": total_credits_spent,
            "active_promotions": len(active_promos),
            "total_promotions": len(promotions),
            "promoted_revenue": round(promoted_revenue, 2),
            "promotion_roi": roi
        },
        "sales_trend": sales_trend,
        "top_products": top_products,
        "credit_usage": list(credit_by_type.values()),
        "recent_credit_transactions": credit_txns
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


# ============== WALLET TOP-UP (Mocked Razorpay) ==============

class WalletTopUp(PydanticBaseModel):
    amount: float


@router.post("/wallet/topup")
async def topup_vendor_wallet(data: WalletTopUp, vendor: Dict = Depends(get_current_vendor)):
    """Add money to vendor wallet (payment gateway mocked)"""
    if data.amount < 100:
        raise HTTPException(status_code=400, detail="Minimum top-up is Rs. 100")
    if data.amount > 500000:
        raise HTTPException(status_code=400, detail="Maximum top-up is Rs. 5,00,000")

    new_balance = vendor.get("wallet_balance", 0.0) + data.amount
    await db.vendors.update_one(
        {"vendor_id": vendor["vendor_id"]},
        {"$set": {"wallet_balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    txn = {
        "transaction_id": generate_id("vtxn_"),
        "vendor_id": vendor["vendor_id"],
        "type": "topup",
        "amount": data.amount,
        "balance_after": new_balance,
        "description": f"Wallet top-up of Rs. {data.amount}",
        "payment_method": "razorpay_mock",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.vendor_wallet_transactions.insert_one(txn)

    return {
        "message": f"Rs. {data.amount} added to wallet (MOCKED)",
        "wallet_balance": new_balance,
        "transaction_id": txn["transaction_id"]
    }


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

    vendor = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Mark all documents as approved
    docs = vendor.get("kyc_documents", {})
    for doc_type in docs:
        if isinstance(docs[doc_type], dict):
            docs[doc_type]["status"] = "approved"
            docs[doc_type]["reviewed_at"] = datetime.now(timezone.utc).isoformat()
            docs[doc_type]["reviewed_by"] = admin.get("admin_id", "")

    result = await db.vendors.update_one(
        {"vendor_id": vendor_id},
        {"$set": {
            "kyc_status": "approved",
            "kyc_documents": docs,
            "status": "approved",
            "kyc_approved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"message": "KYC approved — all documents verified"}


@router.put("/admin/{vendor_id}/kyc/reject")
async def admin_reject_kyc(vendor_id: str, reason: str = "Documents unclear or not original", admin: Dict = Depends(get_admin_user)):
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
    return {"message": "KYC rejected", "reason": reason}


class DocReviewRequest(PydanticBaseModel):
    status: str  # "approved" or "rejected"
    note: str = ""


@router.put("/admin/{vendor_id}/kyc/review-doc/{doc_type}")
async def admin_review_document(vendor_id: str, doc_type: str, body: DocReviewRequest, admin: Dict = Depends(get_admin_user)):
    """Review individual KYC document — approve or reject with note."""
    if not check_permission(admin, "vendor_kyc", "approve"):
        raise HTTPException(status_code=403, detail="Permission denied")
    if body.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    vendor = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    docs = vendor.get("kyc_documents", {})
    if doc_type not in docs:
        raise HTTPException(status_code=404, detail=f"Document {doc_type} not found")

    doc = docs[doc_type] if isinstance(docs[doc_type], dict) else {"url": docs[doc_type]}
    doc["status"] = body.status
    doc["review_note"] = body.note
    doc["reviewed_at"] = datetime.now(timezone.utc).isoformat()
    doc["reviewed_by"] = admin.get("admin_id", "")

    await db.vendors.update_one(
        {"vendor_id": vendor_id},
        {"$set": {
            f"kyc_documents.{doc_type}": doc,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    # Check if all required docs are now approved
    updated = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
    all_docs = updated.get("kyc_documents", {})
    required_statuses = [all_docs.get(d, {}).get("status") if isinstance(all_docs.get(d), dict) else None for d in ["pan_card", "aadhaar_front", "aadhaar_back", "msme_certificate"]]
    any_rejected = any(s == "rejected" for s in required_statuses if s)
    all_approved = all(s == "approved" for s in required_statuses if s) and len([s for s in required_statuses if s]) >= 4

    if any_rejected:
        await db.vendors.update_one(
            {"vendor_id": vendor_id},
            {"$set": {"kyc_status": "rejected", "kyc_rejection_reason": f"Document rejected: {doc_type.replace('_', ' ').title()} — {body.note}"}}
        )
    elif all_approved:
        await db.vendors.update_one(
            {"vendor_id": vendor_id},
            {"$set": {"kyc_status": "approved", "status": "approved", "kyc_approved_at": datetime.now(timezone.utc).isoformat()}}
        )

    return {"message": f"{doc_type.replace('_', ' ').title()} {body.status}", "doc_type": doc_type, "status": body.status}


@router.get("/admin/{vendor_id}/kyc/details")
async def admin_get_kyc_details(vendor_id: str, admin: Dict = Depends(get_admin_user)):
    """Get full KYC details for admin review including all documents and data."""
    if not check_permission(admin, "vendor_kyc", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    vendor = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0, "password": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    return {
        "vendor_id": vendor.get("vendor_id"),
        "display_id": vendor.get("display_id", ""),
        "store_name": vendor.get("store_name", ""),
        "email": vendor.get("email", ""),
        "phone": vendor.get("phone", ""),
        "kyc_status": vendor.get("kyc_status", "not_submitted"),
        "kyc_data": vendor.get("kyc_data", {}),
        "bank_details": vendor.get("bank_details", {}),
        "kyc_documents": vendor.get("kyc_documents", {}),
        "kyc_submitted_at": vendor.get("kyc_submitted_at", ""),
        "kyc_rejection_reason": vendor.get("kyc_rejection_reason", ""),
    }


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


@router.get("/top-sellers")
async def get_top_sellers(limit: int = 6):
    """Public endpoint - returns top-rated approved vendors."""
    vendors = await db.vendors.find(
        {"status": VendorStatus.APPROVED.value},
        {"_id": 0, "password": 0, "kyc_data": 0, "kyc_documents": 0, "bank_details": 0, "wallet_balance": 0}
    ).sort("rating", -1).limit(limit).to_list(limit)

    results = []
    for v in vendors:
        product_count = await db.vendor_products.count_documents({
            "vendor_id": v["vendor_id"],
            "approval_status": VendorProductStatus.APPROVED.value,
            "is_active": True
        })
        results.append({
            "vendor_id": v["vendor_id"],
            "store_name": v.get("store_name", ""),
            "store_description": v.get("store_description", ""),
            "rating": v.get("rating", 0.0),
            "review_count": v.get("review_count", 0),
            "total_products": product_count,
            "member_since": v.get("created_at", ""),
        })

    return results


# ============== VENDOR CATEGORIES ==============

@router.get("/categories")
async def get_vendor_categories(vendor: Dict = Depends(get_current_vendor)):
    """Get all categories: platform + vendor's own"""
    platform_cats = await db.categories.find({"is_active": True}, {"_id": 0}).sort("name", 1).to_list(100)
    vendor_cats = await db.vendor_categories.find(
        {"vendor_id": vendor["vendor_id"]}, {"_id": 0}
    ).sort("name", 1).to_list(50)
    return {
        "platform_categories": platform_cats,
        "vendor_categories": vendor_cats
    }


@router.post("/categories")
async def create_vendor_category(name: str, description: str = "", vendor: Dict = Depends(get_current_vendor)):
    """Vendor creates their own category"""
    existing = await db.vendor_categories.find_one({
        "vendor_id": vendor["vendor_id"], "name": {"$regex": f"^{name}$", "$options": "i"}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")

    cat_doc = {
        "category_id": generate_id("vcat_"),
        "vendor_id": vendor["vendor_id"],
        "name": name,
        "description": description,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.vendor_categories.insert_one(cat_doc)
    return {"message": "Category created", "category": {k: v for k, v in cat_doc.items() if k != "_id"}}


@router.delete("/categories/{category_id}")
async def delete_vendor_category(category_id: str, vendor: Dict = Depends(get_current_vendor)):
    result = await db.vendor_categories.delete_one({
        "category_id": category_id, "vendor_id": vendor["vendor_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}


# ============== CREDIT-BASED PROMOTIONS ==============

class CreditPurchaseRequest(PydanticBaseModel):
    amount: int  # credits to buy (1 credit = ₹1)

class CreditVerifyRequest(PydanticBaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class PromoteProductRequest(PydanticBaseModel):
    product_id: str
    listing_type: str = "top_100"
    days: int = 7


@router.get("/promotions/credits")
async def get_vendor_credits(vendor: Dict = Depends(get_current_vendor)):
    """Get vendor's promotion credits balance"""
    credits = await db.vendor_credits.find_one(
        {"vendor_id": vendor["vendor_id"]}, {"_id": 0}
    )
    if not credits:
        return {"vendor_id": vendor["vendor_id"], "balance": 0, "total_spent": 0}
    return credits


@router.get("/promotions/credits/transactions")
async def get_credit_transactions(vendor: Dict = Depends(get_current_vendor)):
    """Get vendor's credit transaction history"""
    txns = await db.credit_transactions.find(
        {"vendor_id": vendor["vendor_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return txns


@router.post("/promotions/credits/create-order")
async def create_credit_order(data: CreditPurchaseRequest, vendor: Dict = Depends(get_current_vendor)):
    """Create Razorpay order for credit purchase"""
    if data.amount < 100:
        raise HTTPException(status_code=400, detail="Minimum purchase is 100 credits")
    if data.amount > 100000:
        raise HTTPException(status_code=400, detail="Maximum purchase is 100,000 credits")

    razorpay_key_id = os.environ.get("RAZORPAY_KEY_ID")
    razorpay_key_secret = os.environ.get("RAZORPAY_KEY_SECRET")

    if not razorpay_key_id or not razorpay_key_secret:
        # Mocked flow when keys aren't configured
        order_id = generate_id("mock_order_")
        txn = {
            "transaction_id": generate_id("ctxn_"),
            "vendor_id": vendor["vendor_id"],
            "type": "purchase",
            "amount": data.amount,
            "razorpay_order_id": order_id,
            "payment_status": "mocked",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.credit_transactions.insert_one(txn)
        # Immediately add credits in mocked mode
        await db.vendor_credits.update_one(
            {"vendor_id": vendor["vendor_id"]},
            {"$inc": {"balance": data.amount},
             "$set": {"vendor_id": vendor["vendor_id"], "updated_at": datetime.now(timezone.utc).isoformat()},
             "$setOnInsert": {"total_spent": 0, "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        txn.pop("_id", None)
        # Log as platform revenue
        await db.platform_revenue.insert_one({
            "revenue_id": generate_id("rev_"),
            "vendor_id": vendor["vendor_id"],
            "type": "credit_purchase",
            "amount": data.amount,
            "description": f"Promotion credit purchase ({data.amount} credits)",
            "payment_status": "mocked",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {
            "order_id": order_id,
            "amount": data.amount * 100,
            "currency": "INR",
            "mocked": True,
            "message": f"Added {data.amount} credits (Razorpay keys not configured, using mock mode)",
            "credits_added": data.amount
        }

    import razorpay
    client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))
    amount_paise = data.amount * 100

    try:
        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"credit_{vendor['vendor_id'][:20]}_{generate_id('')[:8]}",
            "payment_capture": 1
        })
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail="Payment order creation failed")

    txn = {
        "transaction_id": generate_id("ctxn_"),
        "vendor_id": vendor["vendor_id"],
        "type": "purchase",
        "amount": data.amount,
        "razorpay_order_id": order["id"],
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.credit_transactions.insert_one(txn)

    return {
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": razorpay_key_id,
        "mocked": False
    }


@router.post("/promotions/credits/verify-payment")
async def verify_credit_payment(data: CreditVerifyRequest, vendor: Dict = Depends(get_current_vendor)):
    """Verify Razorpay payment and add credits"""
    razorpay_key_id = os.environ.get("RAZORPAY_KEY_ID")
    razorpay_key_secret = os.environ.get("RAZORPAY_KEY_SECRET")

    if not razorpay_key_id or not razorpay_key_secret:
        raise HTTPException(status_code=400, detail="Razorpay keys not configured")

    import razorpay
    client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))

    # Verify signature
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": data.razorpay_order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "razorpay_signature": data.razorpay_signature
        })
    except Exception:
        await db.credit_transactions.update_one(
            {"razorpay_order_id": data.razorpay_order_id, "vendor_id": vendor["vendor_id"]},
            {"$set": {"payment_status": "failed", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        raise HTTPException(status_code=400, detail="Payment verification failed")

    # Find the pending transaction
    txn = await db.credit_transactions.find_one(
        {"razorpay_order_id": data.razorpay_order_id, "vendor_id": vendor["vendor_id"]}, {"_id": 0}
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.get("payment_status") == "completed":
        raise HTTPException(status_code=400, detail="Payment already processed")

    credits_to_add = txn["amount"]

    # Update transaction status
    await db.credit_transactions.update_one(
        {"razorpay_order_id": data.razorpay_order_id, "vendor_id": vendor["vendor_id"]},
        {"$set": {
            "payment_status": "completed",
            "razorpay_payment_id": data.razorpay_payment_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    # Add credits
    await db.vendor_credits.update_one(
        {"vendor_id": vendor["vendor_id"]},
        {"$inc": {"balance": credits_to_add},
         "$set": {"vendor_id": vendor["vendor_id"], "updated_at": datetime.now(timezone.utc).isoformat()},
         "$setOnInsert": {"total_spent": 0, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    # Log as platform revenue
    await db.platform_revenue.insert_one({
        "revenue_id": generate_id("rev_"),
        "vendor_id": vendor["vendor_id"],
        "type": "credit_purchase",
        "amount": credits_to_add,
        "razorpay_payment_id": data.razorpay_payment_id,
        "description": f"Promotion credit purchase ({credits_to_add} credits)",
        "payment_status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"message": f"Payment verified! Added {credits_to_add} credits", "credits_added": credits_to_add}


@router.post("/promotions/promote-product")
async def promote_product(data: PromoteProductRequest, vendor: Dict = Depends(get_current_vendor)):
    """Promote a product to top listings using credits"""
    cost_map = {"top_20": 50, "top_100": 20, "category_top": 30}
    daily_cost = cost_map.get(data.listing_type)
    if not daily_cost:
        raise HTTPException(status_code=400, detail="Invalid listing type. Use: top_20, top_100, category_top")

    total_cost = daily_cost * data.days

    credits = await db.vendor_credits.find_one({"vendor_id": vendor["vendor_id"]}, {"_id": 0})
    balance = credits.get("balance", 0) if credits else 0
    if balance < total_cost:
        raise HTTPException(status_code=400, detail=f"Insufficient credits. Need {total_cost}, have {balance}")

    product = await db.vendor_products.find_one(
        {"product_id": data.product_id, "vendor_id": vendor["vendor_id"]}, {"_id": 0}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    from datetime import timedelta
    expires = datetime.now(timezone.utc) + timedelta(days=data.days)

    promotion = {
        "promotion_id": generate_id("promo_"),
        "vendor_id": vendor["vendor_id"],
        "product_id": data.product_id,
        "product_name": product.get("name", ""),
        "listing_type": data.listing_type,
        "daily_cost": daily_cost,
        "total_cost": total_cost,
        "days": data.days,
        "starts_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires.isoformat(),
        "is_active": True,
        "credits_remaining": total_cost,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.product_promotions.insert_one(promotion)
    await db.vendor_credits.update_one(
        {"vendor_id": vendor["vendor_id"]},
        {"$inc": {"balance": -total_cost, "total_spent": total_cost}}
    )

    # Log credit deduction transaction
    await db.credit_transactions.insert_one({
        "transaction_id": generate_id("ctxn_"),
        "vendor_id": vendor["vendor_id"],
        "type": "deduction",
        "amount": total_cost,
        "description": f"Promoted '{product.get('name', '')}' to {data.listing_type} for {data.days} days",
        "promotion_id": promotion["promotion_id"],
        "payment_status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"message": f"Product promoted to {data.listing_type} for {data.days} days", "promotion": {k: v for k, v in promotion.items() if k != "_id"}}


@router.get("/promotions/my")
async def get_my_promotions(vendor: Dict = Depends(get_current_vendor)):
    """Get vendor's active promotions"""
    promos = await db.product_promotions.find(
        {"vendor_id": vendor["vendor_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return promos
