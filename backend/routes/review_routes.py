from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from config import db
from auth import get_current_user, generate_id

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
        "images": data.images,
        "videos": data.videos,
        "is_verified_purchase": True,
        "helpful_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.reviews.insert_one(review_doc)

    # Update product average rating
    all_reviews = await db.reviews.find({"product_id": data.product_id}, {"rating": 1}).to_list(1000)
    avg = sum(r["rating"] for r in all_reviews) / len(all_reviews)
    await db.products.update_one(
        {"product_id": data.product_id},
        {"$set": {"average_rating": round(avg, 1), "review_count": len(all_reviews)}}
    )

    # Update vendor rating if vendor_id
    if data.vendor_id:
        vendor_reviews = await db.reviews.find({"vendor_id": data.vendor_id}, {"rating": 1}).to_list(1000)
        vendor_avg = sum(r["rating"] for r in vendor_reviews) / len(vendor_reviews)
        await db.vendors.update_one(
            {"vendor_id": data.vendor_id},
            {"$set": {"rating": round(vendor_avg, 1), "review_count": len(vendor_reviews)}}
        )

    review_doc.pop("_id", None)
    return {"message": "Review submitted", "review": review_doc}


@router.get("/product/{product_id}")
async def get_product_reviews(product_id: str, skip: int = 0, limit: int = 20):
    reviews = await db.reviews.find(
        {"product_id": product_id}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    stats = await db.reviews.aggregate([
        {"$match": {"product_id": product_id}},
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
        {"vendor_id": vendor_id}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    stats = await db.reviews.aggregate([
        {"$match": {"vendor_id": vendor_id}},
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
