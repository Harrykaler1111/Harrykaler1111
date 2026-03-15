from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone

from config import db
from models.schemas import AffiliateCreate, AffiliateResponse
from auth import get_current_user, get_admin_user, check_permission, generate_id, generate_referral_code

router = APIRouter(prefix="/affiliates", tags=["affiliates"])


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
