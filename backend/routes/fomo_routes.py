from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import random

from config import db
from auth import get_admin_user, generate_id

router = APIRouter(prefix="/fomo", tags=["fomo-notifications"])

DEFAULT_CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata", "Jaipur", "Ahmedabad", "Lucknow", "Chandigarh", "Goa"]


class FomoSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    frequency_min: Optional[int] = None  # seconds
    frequency_max: Optional[int] = None  # seconds
    cities: Optional[List[str]] = None
    custom_messages: Optional[List[Dict]] = None


@router.get("/settings")
async def get_fomo_settings(admin: Dict = Depends(get_admin_user)):
    settings = await db.fomo_settings.find_one({"key": "fomo_config"}, {"_id": 0})
    if not settings:
        settings = {
            "key": "fomo_config",
            "enabled": True,
            "frequency_min": 300,
            "frequency_max": 600,
            "cities": DEFAULT_CITIES,
            "custom_messages": []
        }
        await db.fomo_settings.insert_one(settings)
        settings.pop("_id", None)
    return settings


@router.put("/settings")
async def update_fomo_settings(data: FomoSettingsUpdate, admin: Dict = Depends(get_admin_user)):
    update = {k: v for k, v in data.dict().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.fomo_settings.update_one(
        {"key": "fomo_config"},
        {"$set": update},
        upsert=True
    )
    return {"status": "updated"}


@router.post("/messages")
async def add_custom_message(data: Dict, admin: Dict = Depends(get_admin_user)):
    """Add a custom FOMO message template."""
    msg = {
        "message_id": generate_id("fomo_"),
        "product_name": data.get("product_name", ""),
        "city": data.get("city", ""),
        "custom_text": data.get("custom_text", ""),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.fomo_settings.update_one(
        {"key": "fomo_config"},
        {"$push": {"custom_messages": msg}},
        upsert=True
    )
    return msg


@router.delete("/messages/{message_id}")
async def delete_custom_message(message_id: str, admin: Dict = Depends(get_admin_user)):
    await db.fomo_settings.update_one(
        {"key": "fomo_config"},
        {"$pull": {"custom_messages": {"message_id": message_id}}}
    )
    return {"status": "deleted"}


@router.get("/notification")
async def get_fomo_notification():
    """Public endpoint: Get a random FOMO notification for display."""
    settings = await db.fomo_settings.find_one({"key": "fomo_config"}, {"_id": 0})
    if not settings or not settings.get("enabled", True):
        return {"show": False}

    # Try custom messages first
    custom = [m for m in settings.get("custom_messages", []) if m.get("is_active")]
    if custom:
        msg = random.choice(custom)
        city = msg.get("city") or random.choice(settings.get("cities", DEFAULT_CITIES))
        product = msg.get("product_name") or "a product"
        text = msg.get("custom_text") or f"Someone from {city} just bought {product}"
        return {
            "show": True,
            "city": city,
            "product_name": product,
            "text": text,
            "frequency_min": settings.get("frequency_min", 300),
            "frequency_max": settings.get("frequency_max", 600)
        }

    # Auto-generate from recent orders
    recent_orders = await db.orders.find(
        {"status": {"$ne": "cancelled"}},
        {"_id": 0, "items": 1, "shipping_address": 1}
    ).sort("created_at", -1).limit(20).to_list(20)

    if recent_orders:
        order = random.choice(recent_orders)
        item = random.choice(order.get("items", [{}]))
        city = order.get("shipping_address", {}).get("city") or random.choice(settings.get("cities", DEFAULT_CITIES))
        product_name = item.get("product_name", "a product")
    else:
        # Fallback: random product
        products = await db.products.find(
            {"is_active": True}, {"_id": 0, "name": 1}
        ).limit(20).to_list(20)
        city = random.choice(settings.get("cities", DEFAULT_CITIES))
        product_name = random.choice(products)["name"] if products else "a trending item"

    return {
        "show": True,
        "city": city,
        "product_name": product_name,
        "text": f"Someone from {city} just bought {product_name}",
        "frequency_min": settings.get("frequency_min", 300),
        "frequency_max": settings.get("frequency_max", 600)
    }
