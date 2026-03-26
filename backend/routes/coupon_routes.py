from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone

from config import db
from models.schemas import CouponCreate, CouponResponse
from auth import get_admin_user, get_current_vendor, check_permission, generate_id

router = APIRouter(prefix="/coupons", tags=["coupons"])


@router.post("", response_model=CouponResponse)
async def create_coupon(coupon: CouponCreate, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "coupons", "create"):
        raise HTTPException(status_code=403, detail="Permission denied")

    existing = await db.coupons.find_one({"code": coupon.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")

    coupon_doc = {
        "coupon_id": generate_id("coupon_"),
        "code": coupon.code.upper(),
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "min_order_value": coupon.min_order_value,
        "max_uses": coupon.max_uses,
        "used_count": 0,
        "expires_at": coupon.expires_at,
        "starts_at": coupon.starts_at,
        "affiliate_id": coupon.affiliate_id,
        "category": coupon.category,
        "offer_type": coupon.offer_type,
        "description": coupon.description,
        "vendor_id": coupon.vendor_id,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.coupons.insert_one(coupon_doc)
    return CouponResponse(**coupon_doc)


@router.get("", response_model=List[CouponResponse])
async def get_coupons(admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "coupons", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")
    coupons = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [CouponResponse(**c) for c in coupons]


@router.get("/active")
async def get_active_offers(category: Optional[str] = None):
    """Public: Get active offers/coupons"""
    query = {"is_active": True}

    coupons = await db.coupons.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)

    result = []
    for c in coupons:
        if c.get("expires_at"):
            expires = datetime.fromisoformat(c["expires_at"])
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires < datetime.now(timezone.utc):
                continue
        if c.get("starts_at"):
            starts = datetime.fromisoformat(c["starts_at"])
            if starts.tzinfo is None:
                starts = starts.replace(tzinfo=timezone.utc)
            if starts > datetime.now(timezone.utc):
                continue
        if c.get("used_count", 0) >= c.get("max_uses", 100):
            continue
        if category and c.get("category") and c["category"] != category:
            continue
        result.append(CouponResponse(**c).model_dump())

    return result


@router.post("/validate")
async def validate_coupon(code: str, subtotal: float, category: Optional[str] = None):
    coupon = await db.coupons.find_one({"code": code.upper(), "is_active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")

    if coupon["used_count"] >= coupon["max_uses"]:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")

    if coupon["min_order_value"] > subtotal:
        raise HTTPException(status_code=400, detail=f"Minimum order value is ₹{coupon['min_order_value']}")

    if coupon.get("expires_at"):
        expires_at = datetime.fromisoformat(coupon["expires_at"])
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Coupon has expired")

    if coupon.get("starts_at"):
        starts_at = datetime.fromisoformat(coupon["starts_at"])
        if starts_at.tzinfo is None:
            starts_at = starts_at.replace(tzinfo=timezone.utc)
        if starts_at > datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="This offer hasn't started yet")

    if coupon.get("category") and category and coupon["category"] != category:
        raise HTTPException(status_code=400, detail=f"This coupon is only valid for {coupon['category']} category")

    discount = 0
    if coupon["discount_type"] == "percentage":
        discount = subtotal * (coupon["discount_value"] / 100)
    else:
        discount = min(coupon["discount_value"], subtotal)

    return {"valid": True, "discount": round(discount, 2), "coupon": CouponResponse(**coupon).model_dump()}


@router.put("/{coupon_id}/toggle")
async def toggle_coupon(coupon_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "coupons", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")
    coupon = await db.coupons.find_one({"coupon_id": coupon_id})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    new_status = not coupon.get("is_active", True)
    await db.coupons.update_one({"coupon_id": coupon_id}, {"$set": {"is_active": new_status}})
    return {"message": f"Coupon {'activated' if new_status else 'deactivated'}"}


@router.delete("/{coupon_id}")
async def delete_coupon(coupon_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "coupons", "delete"):
        raise HTTPException(status_code=403, detail="Permission denied")
    result = await db.coupons.delete_one({"coupon_id": coupon_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"message": "Coupon deleted"}
