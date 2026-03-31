from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from config import db, MIN_WITHDRAWAL_AMOUNT
from models.schemas import ResellerRegister, ResellerResponse, WalletTransactionResponse, WithdrawalRequest, WithdrawalResponse
from models.enums import WithdrawalStatus, TransactionType
from auth import get_current_user, get_current_reseller, get_admin_user, check_permission, generate_id, generate_referral_code, generate_referral_link

router = APIRouter(prefix="/resellers", tags=["resellers"])

DEFAULT_RESELLER_COMMISSION = 5.0


class ResellerMarginUpdate(BaseModel):
    product_id: str
    margin: float  # Custom margin the reseller adds on top of product price


@router.post("/register", response_model=ResellerResponse)
async def register_as_reseller(data: ResellerRegister, user: Dict = Depends(get_current_user)):
    existing = await db.resellers.find_one({"user_id": user["user_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already registered as reseller")

    reseller_id = generate_id("resell_")
    referral_code = generate_referral_code(user["name"])

    reseller_doc = {
        "reseller_id": reseller_id,
        "user_id": user["user_id"],
        "name": user["name"],
        "email": user["email"],
        "bio": data.bio,
        "social_platforms": data.social_platforms,
        "status": "pending",
        "referral_code": referral_code,
        "commission_rate": DEFAULT_RESELLER_COMMISSION,
        "total_clicks": 0,
        "total_conversions": 0,
        "total_earnings": 0.0,
        "wallet_balance": 0.0,
        "product_margins": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.resellers.insert_one(reseller_doc)
    return ResellerResponse(**reseller_doc)


@router.get("/me", response_model=ResellerResponse)
async def get_my_reseller_profile(reseller: Dict = Depends(get_current_reseller)):
    return ResellerResponse(**reseller)


@router.get("/products")
async def get_reseller_products(reseller: Dict = Depends(get_current_reseller)):
    """Get all active products with reseller-specific links and margins."""
    if reseller["status"] != "approved":
        raise HTTPException(status_code=403, detail="Account must be approved first")

    products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(200)
    margins = reseller.get("product_margins", {})
    ref_code = reseller["referral_code"]

    result = []
    for p in products:
        pid = p["product_id"]
        margin = margins.get(pid, 0)
        result.append({
            "product_id": pid,
            "name": p["name"],
            "image": p["images"][0] if p.get("images") else None,
            "price": p["price"],
            "compare_price": p.get("compare_price"),
            "category": p.get("category", ""),
            "margin": margin,
            "reseller_price": p["price"] + margin,
            "share_link": generate_referral_link(ref_code, pid),
            "stock": p.get("stock", 0),
        })
    return result


@router.put("/product-margin")
async def set_product_margin(body: ResellerMarginUpdate, reseller: Dict = Depends(get_current_reseller)):
    """Set custom margin for a specific product."""
    if reseller["status"] != "approved":
        raise HTTPException(status_code=403, detail="Account must be approved first")

    if body.margin < 0:
        raise HTTPException(status_code=400, detail="Margin cannot be negative")

    product = await db.products.find_one({"product_id": body.product_id, "is_active": True})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    await db.resellers.update_one(
        {"reseller_id": reseller["reseller_id"]},
        {"$set": {
            f"product_margins.{body.product_id}": body.margin,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {
        "product_id": body.product_id,
        "margin": body.margin,
        "reseller_price": product["price"] + body.margin,
        "share_link": generate_referral_link(reseller["referral_code"], body.product_id)
    }


@router.get("/referral-links")
async def get_reseller_referral_links(reseller: Dict = Depends(get_current_reseller)):
    if reseller["status"] != "approved":
        raise HTTPException(status_code=403, detail="Account must be approved first")

    products = await db.products.find({"is_active": True}, {"_id": 0}).limit(50).to_list(50)
    base_link = generate_referral_link(reseller["referral_code"])

    links = [{"type": "general", "product_id": None, "product_name": "All Products", "link": base_link}]
    for p in products:
        links.append({
            "type": "product",
            "product_id": p["product_id"],
            "product_name": p["name"],
            "link": generate_referral_link(reseller["referral_code"], p["product_id"])
        })

    return links


@router.get("/wallet/balance")
async def get_reseller_wallet(reseller: Dict = Depends(get_current_reseller)):
    return {
        "wallet_balance": reseller.get("wallet_balance", 0.0),
        "total_earnings": reseller.get("total_earnings", 0.0),
        "min_withdrawal_amount": MIN_WITHDRAWAL_AMOUNT
    }


@router.get("/wallet/transactions")
async def get_reseller_transactions(reseller: Dict = Depends(get_current_reseller)):
    transactions = await db.reseller_wallet_transactions.find(
        {"reseller_id": reseller["reseller_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return transactions


# ============== ADMIN ==============

@router.get("/admin/list", response_model=List[ResellerResponse])
async def admin_list_resellers(status: Optional[str] = None, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "resellers", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    query = {}
    if status:
        query["status"] = status

    resellers = await db.resellers.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [ResellerResponse(**r) for r in resellers]
