from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from config import db
from auth import get_current_user, get_admin_user, generate_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reviews", tags=["reviews"])


class ReviewCreate(BaseModel):
    product_id: str
    vendor_id: Optional[str] = None
    rating: int  # 1-5
    title: Optional[str] = None
    comment: str
    images: List[str] = []
    videos: List[str] = []


class ReviewStatusUpdate(BaseModel):
    status: str  # approved, rejected
    reason: Optional[str] = None


class ReviewImageRemove(BaseModel):
    image_url: str


# ==================== CUSTOMER ENDPOINTS ====================

@router.post("")
async def create_review(data: ReviewCreate, user: Dict = Depends(get_current_user)):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")

    # Check user has ordered this product
    order = await db.orders.find_one({
        "user_id": user["user_id"],
        "items.product_id": data.product_id,
        "status": "delivered"
    })
    if not order:
        raise HTTPException(status_code=400, detail="You can only review products you have purchased and received")

    existing = await db.reviews.find_one({
        "user_id": user["user_id"],
        "product_id": data.product_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this product")

    review_doc = {
        "review_id": generate_id("rev_"),
        "product_id": data.product_id,
        "vendor_id": data.vendor_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "rating": data.rating,
        "title": data.title,
        "comment": data.comment,
        "images": data.images[:5],  # max 5 images
        "videos": data.videos,
        "status": "pending",  # pending, approved, rejected
        "is_verified_purchase": True,
        "helpful_count": 0,
        "admin_note": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.reviews.insert_one(review_doc)
    await _update_product_rating(data.product_id, data.vendor_id)

    review_doc.pop("_id", None)
    return {"message": "Review submitted! It will be visible after admin approval.", "review": review_doc}


@router.get("/product/{product_id}")
async def get_product_reviews(product_id: str, skip: int = 0, limit: int = 20):
    # Only show approved reviews to public
    reviews = await db.reviews.find(
        {"product_id": product_id, "status": "approved"}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    stats = await db.reviews.aggregate([
        {"$match": {"product_id": product_id, "status": "approved"}},
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

    return {
        "reviews": reviews,
        "stats": stats[0] if stats else {"avg_rating": 0, "total": 0, "five": 0, "four": 0, "three": 0, "two": 0, "one": 0}
    }


@router.get("/vendor/{vendor_id}")
async def get_vendor_reviews(vendor_id: str, skip: int = 0, limit: int = 20):
    reviews = await db.reviews.find(
        {"vendor_id": vendor_id, "status": "approved"}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    stats = await db.reviews.aggregate([
        {"$match": {"vendor_id": vendor_id, "status": "approved"}},
        {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}, "total": {"$sum": 1}}}
    ]).to_list(1)

    return {
        "reviews": reviews,
        "stats": stats[0] if stats else {"avg_rating": 0, "total": 0}
    }


@router.post("/{review_id}/helpful")
async def mark_helpful(review_id: str, user: Dict = Depends(get_current_user)):
    result = await db.reviews.update_one(
        {"review_id": review_id},
        {"$inc": {"helpful_count": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Marked as helpful"}


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/all")
async def admin_get_all_reviews(
    status: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    admin: Dict = Depends(get_admin_user)
):
    """Admin: List all reviews with optional status filter"""
    query = {}
    if status:
        query["status"] = status

    reviews = await db.reviews.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    # Enrich with product name
    for review in reviews:
        product = await db.products.find_one({"product_id": review.get("product_id")}, {"_id": 0, "name": 1, "images": 1})
        review["product_name"] = product.get("name", "Unknown") if product else "Unknown"
        review["product_image"] = (product.get("images") or [""])[0] if product else ""

    counts = {
        "total": await db.reviews.count_documents({}),
        "pending": await db.reviews.count_documents({"status": "pending"}),
        "approved": await db.reviews.count_documents({"status": "approved"}),
        "rejected": await db.reviews.count_documents({"status": "rejected"}),
    }

    return {"reviews": reviews, "counts": counts}


@router.put("/admin/{review_id}/status")
async def admin_update_review_status(
    review_id: str,
    data: ReviewStatusUpdate,
    admin: Dict = Depends(get_admin_user)
):
    """Admin: Approve or reject a review"""
    if data.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    review = await db.reviews.find_one({"review_id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {
            "status": data.status,
            "admin_note": data.reason,
            "reviewed_by": admin.get("email"),
            "reviewed_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    # Recalculate product rating (only approved reviews count)
    await _update_product_rating(review["product_id"], review.get("vendor_id"))

    return {"message": f"Review {data.status}"}


@router.delete("/admin/{review_id}")
async def admin_delete_review(review_id: str, admin: Dict = Depends(get_admin_user)):
    """Admin: Delete a review entirely"""
    review = await db.reviews.find_one({"review_id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    await db.reviews.delete_one({"review_id": review_id})
    await _update_product_rating(review["product_id"], review.get("vendor_id"))

    return {"message": "Review deleted"}


@router.put("/admin/{review_id}/remove-image")
async def admin_remove_review_image(
    review_id: str,
    data: ReviewImageRemove,
    admin: Dict = Depends(get_admin_user)
):
    """Admin: Remove a specific image from a review"""
    result = await db.reviews.update_one(
        {"review_id": review_id},
        {"$pull": {"images": data.image_url}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")

    return {"message": "Image removed from review"}


# ==================== HELPER ====================

async def _update_product_rating(product_id: str, vendor_id: Optional[str] = None):
    """Recalculate product and vendor ratings based on approved reviews"""
    approved = await db.reviews.find(
        {"product_id": product_id, "status": "approved"}, {"rating": 1}
    ).to_list(1000)

    if approved:
        avg = sum(r["rating"] for r in approved) / len(approved)
        await db.products.update_one(
            {"product_id": product_id},
            {"$set": {"average_rating": round(avg, 1), "review_count": len(approved)}}
        )
    else:
        await db.products.update_one(
            {"product_id": product_id},
            {"$set": {"average_rating": 0, "review_count": 0}}
        )

    if vendor_id:
        vendor_approved = await db.reviews.find(
            {"vendor_id": vendor_id, "status": "approved"}, {"rating": 1}
        ).to_list(1000)
        if vendor_approved:
            v_avg = sum(r["rating"] for r in vendor_approved) / len(vendor_approved)
            await db.vendors.update_one(
                {"vendor_id": vendor_id},
                {"$set": {"rating": round(v_avg, 1), "review_count": len(vendor_approved)}}
            )
