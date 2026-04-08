from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import os

from config import db, MIN_WITHDRAWAL_AMOUNT
from models.schemas import ResellerRegister, ResellerResponse, WalletTransactionResponse, WithdrawalRequest, WithdrawalResponse
from models.enums import WithdrawalStatus, TransactionType
from auth import get_current_user, get_current_reseller, get_admin_user, check_permission, generate_id, generate_referral_code

router = APIRouter(prefix="/resellers", tags=["resellers"])

FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://pigma.com")
DEFAULT_RESELLER_COMMISSION = 5.0


class GenerateResellerLinkRequest(BaseModel):
    product_id: str
    margin: float  # Custom margin reseller adds on top of base price


# ============== REGISTRATION ==============

@router.post("/register", response_model=ResellerResponse)
async def register_as_reseller(data: ResellerRegister, user: Dict = Depends(get_current_user)):
    existing = await db.resellers.find_one({"user_id": user["user_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already registered as reseller")

    reseller_id = generate_id("resell_")
    referral_code = generate_referral_code(user["name"])

    from display_ids import generate_display_id
    display_id = await generate_display_id("reseller")

    reseller_doc = {
        "reseller_id": reseller_id,
        "display_id": display_id,
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
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.resellers.insert_one(reseller_doc)
    return ResellerResponse(**reseller_doc)


@router.get("/me", response_model=ResellerResponse)
async def get_my_reseller_profile(reseller: Dict = Depends(get_current_reseller)):
    return ResellerResponse(**reseller)


# ============== ON-DEMAND LINK GENERATION ==============

@router.post("/generate-link")
async def generate_reseller_link(body: GenerateResellerLinkRequest, reseller: Dict = Depends(get_current_reseller)):
    """Generate a reseller link for a SINGLE product with custom margin (on-demand)."""
    if reseller["status"] != "approved":
        raise HTTPException(status_code=403, detail="Account must be approved first")

    if body.margin < 0:
        raise HTTPException(status_code=400, detail="Margin cannot be negative")

    product = await db.products.find_one(
        {"product_id": body.product_id, "is_active": True},
        {"_id": 0, "product_id": 1, "name": 1, "price": 1, "images": 1, "category": 1, "stock": 1}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    reseller_price = product["price"] + body.margin
    reseller_link = f"{FRONTEND_URL}/product/{body.product_id}?reseller_id={reseller['user_id']}&price={reseller_price}"

    # Upsert into reseller_links collection
    link_doc = {
        "reseller_id": reseller["reseller_id"],
        "user_id": reseller["user_id"],
        "product_id": body.product_id,
        "product_name": product["name"],
        "product_image": product["images"][0] if product.get("images") else None,
        "product_price": product["price"],
        "category": product.get("category", ""),
        "margin": body.margin,
        "reseller_price": reseller_price,
        "reseller_link": reseller_link,
        "clicks": 0,
        "conversions": 0,
        "earnings": 0.0,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.reseller_links.update_one(
        {"user_id": reseller["user_id"], "product_id": body.product_id},
        {"$set": link_doc, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    return {
        "reseller_link": reseller_link,
        "product_id": body.product_id,
        "product_name": product["name"],
        "base_price": product["price"],
        "margin": body.margin,
        "reseller_price": reseller_price
    }


@router.get("/validate-price/{product_id}")
async def validate_reseller_price(product_id: str, reseller_id: str, price: float):
    """Public endpoint — validates that a reseller price is legitimate (no auth needed for buyers)."""
    link = await db.reseller_links.find_one(
        {"user_id": reseller_id, "product_id": product_id, "reseller_price": price},
        {"_id": 0, "user_id": 1, "reseller_price": 1, "margin": 1, "product_price": 1}
    )
    if not link:
        return {"valid": False}

    reseller = await db.resellers.find_one(
        {"user_id": reseller_id, "status": "approved"}, {"_id": 0, "name": 1}
    )
    if not reseller:
        return {"valid": False}

    return {
        "valid": True,
        "reseller_name": reseller.get("name", ""),
        "reseller_price": link["reseller_price"],
        "base_price": link["product_price"],
        "margin": link["margin"]
    }


@router.get("/my-links")
async def get_my_reseller_links(
    reseller: Dict = Depends(get_current_reseller),
    skip: int = 0,
    limit: int = 20
):
    """Get paginated history of generated reseller links."""
    links = await db.reseller_links.find(
        {"user_id": reseller["user_id"]}, {"_id": 0}
    ).sort("updated_at", -1).skip(skip).limit(limit).to_list(limit)

    total = await db.reseller_links.count_documents({"user_id": reseller["user_id"]})

    return {"links": links, "total": total, "skip": skip, "limit": limit}


@router.get("/check-product/{product_id}")
async def check_reseller_product_link(product_id: str, reseller: Dict = Depends(get_current_reseller)):
    """Check if reseller has already generated a link for this product."""
    link = await db.reseller_links.find_one(
        {"user_id": reseller["user_id"], "product_id": product_id}, {"_id": 0}
    )

    return {
        "is_reseller": True,
        "status": reseller["status"],
        "has_link": link is not None,
        "reseller_link": link["reseller_link"] if link else None,
        "margin": link["margin"] if link else None,
        "reseller_price": link["reseller_price"] if link else None
    }


# ============== WALLET ==============

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
