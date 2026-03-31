from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import os

from config import db
from models.schemas import AffiliateCreate, AffiliateResponse
from auth import get_current_user, get_admin_user, check_permission, generate_id, generate_referral_code

router = APIRouter(prefix="/affiliates", tags=["affiliates"])

FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://pigma.com")


class GenerateAffiliateLinkRequest(BaseModel):
    product_id: str


# ============== REGISTRATION ==============

@router.post("/apply", response_model=AffiliateResponse)
async def apply_as_affiliate(data: AffiliateCreate, user: Dict = Depends(get_current_user)):
    existing = await db.affiliates.find_one({"user_id": user["user_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already registered as affiliate")

    affiliate_id = generate_id("aff_")
    referral_code = generate_referral_code(user["name"])

    affiliate_doc = {
        "affiliate_id": affiliate_id,
        "user_id": user["user_id"],
        "name": user["name"],
        "email": user["email"],
        **data.model_dump(),
        "status": "pending",
        "referral_code": referral_code,
        "commission_rate": 5.0,
        "total_clicks": 0,
        "total_conversions": 0,
        "total_earnings": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.affiliates.insert_one(affiliate_doc)
    return AffiliateResponse(**affiliate_doc)


@router.get("/me", response_model=AffiliateResponse)
async def get_my_affiliate_profile(user: Dict = Depends(get_current_user)):
    affiliate = await db.affiliates.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Not registered as affiliate")
    return AffiliateResponse(**affiliate)


# ============== ON-DEMAND LINK GENERATION ==============

@router.post("/generate-link")
async def generate_affiliate_link(body: GenerateAffiliateLinkRequest, user: Dict = Depends(get_current_user)):
    """Generate an affiliate link for a SINGLE product (on-demand)."""
    affiliate = await db.affiliates.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Not registered as affiliate")
    if affiliate["status"] != "approved":
        raise HTTPException(status_code=403, detail="Account must be approved first")

    product = await db.products.find_one(
        {"product_id": body.product_id, "is_active": True},
        {"_id": 0, "product_id": 1, "name": 1, "price": 1, "images": 1, "category": 1}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    aff_link = f"{FRONTEND_URL}/product/{body.product_id}?aff_id={affiliate['user_id']}"
    estimated_earning = round(product["price"] * affiliate["commission_rate"] / 100, 2)

    # Upsert into affiliate_links collection (one record per affiliate+product)
    link_doc = {
        "affiliate_id": affiliate["affiliate_id"],
        "user_id": user["user_id"],
        "product_id": body.product_id,
        "product_name": product["name"],
        "product_image": product["images"][0] if product.get("images") else None,
        "product_price": product["price"],
        "category": product.get("category", ""),
        "affiliate_link": aff_link,
        "commission_rate": affiliate["commission_rate"],
        "estimated_earning": estimated_earning,
        "clicks": 0,
        "conversions": 0,
        "earnings": 0.0,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.affiliate_links.update_one(
        {"user_id": user["user_id"], "product_id": body.product_id},
        {"$set": link_doc, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    return {
        "affiliate_link": aff_link,
        "product_id": body.product_id,
        "product_name": product["name"],
        "estimated_earning": estimated_earning,
        "commission_rate": affiliate["commission_rate"]
    }


@router.get("/my-links")
async def get_my_affiliate_links(
    user: Dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20
):
    """Get paginated history of generated affiliate links."""
    affiliate = await db.affiliates.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Not registered as affiliate")

    links = await db.affiliate_links.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("updated_at", -1).skip(skip).limit(limit).to_list(limit)

    total = await db.affiliate_links.count_documents({"user_id": user["user_id"]})

    return {"links": links, "total": total, "skip": skip, "limit": limit}


@router.get("/check-product/{product_id}")
async def check_affiliate_product_link(product_id: str, user: Dict = Depends(get_current_user)):
    """Check if affiliate has already generated a link for this product."""
    affiliate = await db.affiliates.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not affiliate:
        return {"is_affiliate": False, "has_link": False}

    link = await db.affiliate_links.find_one(
        {"user_id": user["user_id"], "product_id": product_id}, {"_id": 0}
    )

    return {
        "is_affiliate": True,
        "status": affiliate["status"],
        "has_link": link is not None,
        "affiliate_link": link["affiliate_link"] if link else None,
        "commission_rate": affiliate.get("commission_rate", 5.0),
        "estimated_earning": link["estimated_earning"] if link else None
    }


# ============== ADMIN ==============

@router.get("", response_model=List[AffiliateResponse])
async def get_all_affiliates(status: Optional[str] = None, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "affiliates", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")
    query = {}
    if status:
        query["status"] = status
    affiliates = await db.affiliates.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [AffiliateResponse(**a) for a in affiliates]


@router.put("/{affiliate_id}/status")
async def update_affiliate_status(affiliate_id: str, status: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "affiliates", "approve"):
        raise HTTPException(status_code=403, detail="Permission denied")
    result = await db.affiliates.update_one(
        {"affiliate_id": affiliate_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    return {"message": f"Affiliate status updated to {status}"}


@router.put("/{affiliate_id}/commission")
async def update_affiliate_commission(affiliate_id: str, commission_rate: float, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "commissions", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")
    result = await db.affiliates.update_one(
        {"affiliate_id": affiliate_id},
        {"$set": {"commission_rate": commission_rate, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    return {"message": f"Commission rate updated to {commission_rate}%"}
