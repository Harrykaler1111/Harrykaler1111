from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from config import db
from auth import get_admin_user, generate_id

router = APIRouter(prefix="/admin/reviews", tags=["admin-reviews"])


class DummyReviewCreate(BaseModel):
    product_id: str
    username: str
    rating: int  # 1-5
    review_text: str
    verified: bool = True


class DummyReviewUpdate(BaseModel):
    username: Optional[str] = None
    rating: Optional[int] = None
    review_text: Optional[str] = None
    verified: Optional[bool] = None
    is_active: Optional[bool] = None


@router.post("")
async def create_dummy_review(data: DummyReviewCreate, admin: Dict = Depends(get_admin_user)):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")

    review = {
        "review_id": generate_id("rev_"),
        "product_id": data.product_id,
        "user_id": f"dummy_{generate_id('')}",
        "user_name": data.username,
        "rating": data.rating,
        "comment": data.review_text,
        "verified_purchase": data.verified,
        "is_dummy": True,
        "is_active": True,
        "images": [],
        "admin_id": admin["admin_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review)
    review.pop("_id", None)
    return review


@router.get("/{product_id}")
async def list_dummy_reviews(product_id: str, admin: Dict = Depends(get_admin_user)):
    reviews = await db.reviews.find(
        {"product_id": product_id, "is_dummy": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return reviews


@router.put("/{review_id}")
async def update_dummy_review(review_id: str, data: DummyReviewUpdate, admin: Dict = Depends(get_admin_user)):
    update = {k: v for k, v in data.dict().items() if v is not None}
    if "rating" in update and (update["rating"] < 1 or update["rating"] > 5):
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    if "review_text" in update:
        update["comment"] = update.pop("review_text")
    if "username" in update:
        update["user_name"] = update.pop("username")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.reviews.update_one({"review_id": review_id, "is_dummy": True}, {"$set": update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"status": "updated"}


@router.delete("/{review_id}")
async def delete_dummy_review(review_id: str, admin: Dict = Depends(get_admin_user)):
    result = await db.reviews.delete_one({"review_id": review_id, "is_dummy": True})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"status": "deleted"}
