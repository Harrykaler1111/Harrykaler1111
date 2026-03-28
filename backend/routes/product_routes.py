from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone

from config import db
from models.schemas import ProductCreate, ProductUpdate, ProductResponse
from auth import get_admin_user, check_permission, generate_id

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=List[ProductResponse])
async def get_products(
    category: Optional[str] = None,
    sub_category: Optional[str] = None,
    is_limited_edition: Optional[bool] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    skip: int = 0,
    limit: int = 20
):
    query = {"is_active": True}
    if category:
        query["category"] = category
    if sub_category:
        query["sub_category"] = sub_category
    if is_limited_edition is not None:
        query["is_limited_edition"] = is_limited_edition
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search.lower()]}}
        ]
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price

    sort_dir = -1 if sort_order == "desc" else 1
    products = await db.products.find(query, {"_id": 0}).sort(sort_by, sort_dir).skip(skip).limit(limit).to_list(limit)
    return [ProductResponse(**p) for p in products]


@router.get("/featured", response_model=List[ProductResponse])
async def get_featured_products(limit: int = 8):
    products = await db.products.find(
        {"is_active": True, "is_limited_edition": True},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return [ProductResponse(**p) for p in products]


@router.get("/new-arrivals", response_model=List[ProductResponse])
async def get_new_arrivals(limit: int = 8):
    products = await db.products.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return [ProductResponse(**p) for p in products]


@router.get("/best-sellers")
async def get_best_sellers(limit: int = 8):
    """Returns best-selling products based on order data, with fallback to featured."""
    # Aggregate from orders to find top-selling product IDs
    pipeline = [
        {"$match": {"status": {"$nin": ["cancelled", "refunded"]}}},
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product_id", "total_sold": {"$sum": "$items.quantity"}}},
        {"$sort": {"total_sold": -1}},
        {"$limit": limit}
    ]
    top_product_ids = await db.orders.aggregate(pipeline).to_list(limit)

    result = []
    seen_ids = set()

    if top_product_ids:
        product_ids = [p["_id"] for p in top_product_ids]
        sold_map = {p["_id"]: p["total_sold"] for p in top_product_ids}
        products = await db.products.find(
            {"product_id": {"$in": product_ids}, "is_active": True}, {"_id": 0}
        ).to_list(limit)
        for p in products:
            resp = ProductResponse(**p).model_dump()
            resp["total_sold"] = sold_map.get(p["product_id"], 0)
            result.append(resp)
            seen_ids.add(p["product_id"])
        result.sort(key=lambda x: x["total_sold"], reverse=True)

    # Fill remaining slots with popular active products
    if len(result) < limit:
        remaining = limit - len(result)
        exclude_ids = list(seen_ids)
        filler_query = {"is_active": True}
        if exclude_ids:
            filler_query["product_id"] = {"$nin": exclude_ids}
        filler = await db.products.find(filler_query, {"_id": 0}).sort("created_at", -1).limit(remaining).to_list(remaining)
        for p in filler:
            result.append({**ProductResponse(**p).model_dump(), "total_sold": 0})

    return result


@router.get("/frequently-bought-together/{product_id}")
async def get_frequently_bought_together(product_id: str, limit: int = 4):
    """Get products frequently purchased together with this product.
    Uses co-purchase analysis from order history, falls back to same-category products."""
    product = await db.products.find_one({"product_id": product_id, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    co_purchased_ids = []

    # Step 1: Find orders containing this product
    orders_with_product = await db.orders.find(
        {"items.product_id": product_id, "status": {"$nin": ["cancelled"]}},
        {"items.product_id": 1, "_id": 0}
    ).limit(100).to_list(100)

    if orders_with_product:
        # Count co-purchased product frequencies
        freq = {}
        for order in orders_with_product:
            for item in order.get("items", []):
                pid = item.get("product_id")
                if pid and pid != product_id:
                    freq[pid] = freq.get(pid, 0) + 1

        # Sort by frequency descending
        sorted_pairs = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        co_purchased_ids = [pid for pid, _ in sorted_pairs[:limit]]

    results = []

    # Step 2: Fetch co-purchased products
    if co_purchased_ids:
        co_products = await db.products.find(
            {"product_id": {"$in": co_purchased_ids}, "is_active": True},
            {"_id": 0}
        ).to_list(limit)
        results.extend(co_products)

    # Step 3: Fill remaining slots with same-category products
    if len(results) < limit:
        exclude_ids = [product_id] + [p["product_id"] for p in results]
        category_fill = await db.products.find(
            {"category": product.get("category"), "product_id": {"$nin": exclude_ids}, "is_active": True},
            {"_id": 0}
        ).limit(limit - len(results)).to_list(limit - len(results))
        results.extend(category_fill)

    # Step 4: If still not enough, fill with popular products
    if len(results) < limit:
        exclude_ids = [product_id] + [p["product_id"] for p in results]
        popular_fill = await db.products.find(
            {"product_id": {"$nin": exclude_ids}, "is_active": True},
            {"_id": 0}
        ).sort("sold_count", -1).limit(limit - len(results)).to_list(limit - len(results))
        results.extend(popular_fill)

    return [{
        "product_id": p["product_id"],
        "name": p["name"],
        "price": p["price"],
        "compare_price": p.get("compare_price"),
        "images": p.get("images", []),
        "category": p.get("category", ""),
        "sizes": p.get("sizes", []),
        "colors": p.get("colors", []),
        "stock": p.get("stock", 0),
        "average_rating": p.get("average_rating", 0),
    } for p in results[:limit]]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    product = await db.products.find_one({"product_id": product_id, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductResponse(**product)


@router.post("", response_model=ProductResponse)
async def create_product(product: ProductCreate, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "products", "create"):
        raise HTTPException(status_code=403, detail="Permission denied")

    product_id = generate_id("prod_")
    product_doc = {
        "product_id": product_id,
        **product.model_dump(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    return ProductResponse(**product_doc)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product: ProductUpdate, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "products", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    update_data = {k: v for k, v in product.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.products.update_one({"product_id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    updated = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    return ProductResponse(**updated)


@router.delete("/{product_id}")
async def delete_product(product_id: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "products", "delete"):
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}


@router.get("/promoted/{listing_type}")
async def get_promoted_products(listing_type: str, category: Optional[str] = None):
    """Public: Get promoted products by listing type (top_20, top_100, category_top)"""
    if listing_type not in ("top_20", "top_100", "category_top"):
        raise HTTPException(status_code=400, detail="Invalid listing type")

    now = datetime.now(timezone.utc).isoformat()
    query = {"listing_type": listing_type, "is_active": True}

    promos = await db.product_promotions.find(query, {"_id": 0}).sort("created_at", -1).to_list(100 if listing_type == "top_100" else 20)

    results = []
    for promo in promos:
        if promo.get("expires_at", "") < now:
            await db.product_promotions.update_one(
                {"promotion_id": promo["promotion_id"]}, {"$set": {"is_active": False}}
            )
            continue

        product = await db.vendor_products.find_one(
            {"product_id": promo["product_id"], "is_active": True}, {"_id": 0}
        )
        if not product:
            product = await db.products.find_one(
                {"product_id": promo["product_id"], "is_active": True}, {"_id": 0}
            )

        if product:
            if category and product.get("category") != category:
                continue
            product.pop("_id", None)
            product["promotion_id"] = promo["promotion_id"]
            product["listing_type"] = listing_type
            results.append(product)

    return results
