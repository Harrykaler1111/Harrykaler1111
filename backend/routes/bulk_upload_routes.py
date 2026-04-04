from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Header
from typing import Dict, List, Optional
from datetime import datetime, timezone
import pandas as pd
import zipfile
import tempfile
import shutil
import os
import io
import logging
import uuid
import mimetypes

from config import db
from auth import get_admin_user, get_current_vendor, check_permission, generate_id, decode_jwt_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/products/bulk", tags=["bulk-upload"])

ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
CONTENT_TYPE_MAP = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"
}

REQUIRED_COLUMNS = {"sku", "name", "description", "price", "category"}

SAMPLE_CSV = """sku,name,description,price,compare_price,category,sizes,colors,stock,tags,is_limited_edition,variants
SKU001,Premium Platform Boots,Bold platform boots with chunky sole,12999,15999,Platform Boots,"36,37,38,39,40","Black,White",100,"boots,platform,limited",true,"Black:36:20;Black:37:25;Black:38:30;White:36:10;White:37:15"
SKU002,Classic Stiletto Heels,Elegant stiletto heels for every occasion,9999,,Stiletto Heels,"35,36,37,38","Red,Gold",50,"stiletto,heels",false,"Red:35:10;Red:36:15;Gold:37:15;Gold:38:10"
SKU003,Velvet Ankle Boots,Luxurious velvet ankle boots,14999,18999,Ankle Boots,"37,38,39","Burgundy,Navy",30,"velvet,ankle,premium",true,""
"""


async def get_uploader(authorization: Optional[str] = Header(None)):
    """Resolve the uploader as either admin or vendor."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing")
    token = authorization.split(" ")[1]
    payload = decode_jwt_token(token)

    if payload.get("is_admin"):
        admin = await db.admin_users.find_one({"admin_id": payload["user_id"], "is_active": True}, {"_id": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        from models.enums import AdminRole, ROLE_PERMISSIONS
        custom = await db.admin_permissions.find_one({"admin_id": admin["admin_id"]}, {"_id": 0})
        if custom and custom.get("permissions"):
            admin["permissions"] = custom["permissions"]
        else:
            admin["permissions"] = ROLE_PERMISSIONS.get(AdminRole(admin["role"]), {})
        if not check_permission(admin, "products", "create"):
            raise HTTPException(status_code=403, detail="No permission to create products")
        return {"type": "admin", "id": admin["admin_id"], "name": admin.get("name", "Admin")}

    if payload.get("role") == "vendor":
        vendor = await db.vendors.find_one({"vendor_id": payload["user_id"]}, {"_id": 0})
        if not vendor:
            raise HTTPException(status_code=401, detail="Vendor not found")
        if vendor.get("status") in ("suspended", "disconnected", "discontinued"):
            raise HTTPException(status_code=403, detail="Vendor account is not active")
        return {"type": "vendor", "id": vendor["vendor_id"], "name": vendor.get("store_name", "Vendor")}

    raise HTTPException(status_code=403, detail="Access denied. Only admins and vendors can bulk upload.")


def parse_csv_excel(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Parse CSV or Excel file into a DataFrame."""
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(io.BytesIO(file_bytes), dtype=str, keep_default_na=False)
    elif ext in (".xlsx", ".xls"):
        df = pd.read_excel(io.BytesIO(file_bytes), dtype=str, keep_default_na=False)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV or Excel (.xlsx/.xls)")
    df.columns = df.columns.str.strip().str.lower()
    return df


def parse_variants(variant_str: str) -> List[Dict]:
    """Parse variant string like 'Red:L:50;Blue:M:30' into list of dicts."""
    if not variant_str or not variant_str.strip():
        return []
    variants = []
    for part in variant_str.split(";"):
        part = part.strip()
        if not part:
            continue
        segments = part.split(":")
        if len(segments) == 3:
            color, size, qty = segments
            try:
                variants.append({"color": color.strip(), "size": size.strip(), "quantity": int(qty.strip())})
            except ValueError:
                variants.append({"color": color.strip(), "size": size.strip(), "quantity": 0})
        elif len(segments) == 2:
            color_or_size, qty = segments
            try:
                variants.append({"color": color_or_size.strip(), "size": "", "quantity": int(qty.strip())})
            except ValueError:
                pass
    return variants


def extract_zip_images(zip_bytes: bytes, session_dir: str) -> Dict[str, List[str]]:
    """Extract images from ZIP, returning a map of SKU -> list of file paths."""
    sku_images = {}
    with zipfile.ZipFile(io.BytesIO(zip_bytes), 'r') as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            basename = os.path.basename(info.filename)
            if basename.startswith(".") or basename.startswith("__"):
                continue
            ext = os.path.splitext(basename)[1].lower()
            if ext not in ALLOWED_IMAGE_EXTS:
                continue
            name_without_ext = os.path.splitext(basename)[0]
            # Match SKU: filename starts with SKU (e.g., SKU001.jpg, SKU001-1.jpg, SKU001_2.png)
            # Extract the SKU part before any separator (-_)
            sku_part = name_without_ext
            for sep in ["-", "_"]:
                if sep in name_without_ext:
                    sku_part = name_without_ext.split(sep)[0]
                    break
            sku_upper = sku_part.strip().upper()

            # Extract file to session dir
            out_path = os.path.join(session_dir, basename)
            with zf.open(info) as src, open(out_path, 'wb') as dst:
                dst.write(src.read())
            sku_images.setdefault(sku_upper, []).append(out_path)
    return sku_images


def validate_row(row: Dict, row_idx: int) -> List[str]:
    """Validate a single product row, return list of error messages."""
    errors = []
    if not row.get("sku", "").strip():
        errors.append(f"Row {row_idx}: SKU is required")
    if not row.get("name", "").strip():
        errors.append(f"Row {row_idx}: Name is required")
    if not row.get("description", "").strip():
        errors.append(f"Row {row_idx}: Description is required")
    if not row.get("category", "").strip():
        errors.append(f"Row {row_idx}: Category is required")
    price_str = str(row.get("price", "")).strip()
    if not price_str:
        errors.append(f"Row {row_idx}: Price is required")
    else:
        try:
            price = float(price_str)
            if price <= 0:
                errors.append(f"Row {row_idx}: Price must be positive")
        except ValueError:
            errors.append(f"Row {row_idx}: Invalid price '{price_str}'")
    cp = str(row.get("compare_price", "")).strip()
    if cp:
        try:
            float(cp)
        except ValueError:
            errors.append(f"Row {row_idx}: Invalid compare_price '{cp}'")
    stock_str = str(row.get("stock", "0")).strip()
    if stock_str:
        try:
            int(stock_str)
        except ValueError:
            errors.append(f"Row {row_idx}: Invalid stock '{stock_str}'")
    return errors


@router.get("/sample-csv")
async def download_sample_csv(uploader: Dict = Depends(get_uploader)):
    """Download a sample CSV template for bulk upload."""
    from fastapi.responses import Response
    return Response(
        content=SAMPLE_CSV.strip(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bulk_upload_template.csv"}
    )


@router.post("/preview")
async def bulk_preview(
    file: UploadFile = File(...),
    zip_file: Optional[UploadFile] = File(None),
    uploader: Dict = Depends(get_uploader)
):
    """Parse CSV/Excel + optional ZIP of images, return preview data with validation."""
    # Read the spreadsheet
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        df = parse_csv_excel(file_bytes, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="File contains no data")

    # Check required columns
    missing_cols = REQUIRED_COLUMNS - set(df.columns)
    if missing_cols:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(missing_cols)}. Required: {', '.join(REQUIRED_COLUMNS)}"
        )

    # Create session
    session_id = generate_id("bulk_")
    session_dir = os.path.join(tempfile.gettempdir(), f"bulk_{session_id}")
    os.makedirs(session_dir, exist_ok=True)

    # Extract ZIP images
    sku_images = {}
    if zip_file:
        zip_bytes = await zip_file.read()
        if zip_bytes:
            try:
                sku_images = extract_zip_images(zip_bytes, session_dir)
            except zipfile.BadZipFile:
                shutil.rmtree(session_dir, ignore_errors=True)
                raise HTTPException(status_code=400, detail="Invalid ZIP file")

    # Parse rows
    products = []
    all_errors = []
    seen_skus = set()

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-indexed + header
        row_dict = row.to_dict()
        row_errors = validate_row(row_dict, row_num)

        sku = str(row_dict.get("sku", "")).strip()
        sku_upper = sku.upper()

        # Check duplicate SKU
        if sku_upper and sku_upper in seen_skus:
            row_errors.append(f"Row {row_num}: Duplicate SKU '{sku}'")
        if sku_upper:
            seen_skus.add(sku_upper)

        # Parse list fields
        sizes = [s.strip() for s in str(row_dict.get("sizes", "")).split(",") if s.strip()]
        colors = [c.strip() for c in str(row_dict.get("colors", "")).split(",") if c.strip()]
        tags = [t.strip().lower() for t in str(row_dict.get("tags", "")).split(",") if t.strip()]

        # Parse variants
        variants = parse_variants(str(row_dict.get("variants", "")))

        # Parse price
        try:
            price = float(str(row_dict.get("price", "0")).strip())
        except ValueError:
            price = 0

        compare_price = None
        cp_str = str(row_dict.get("compare_price", "")).strip()
        if cp_str:
            try:
                compare_price = float(cp_str)
            except ValueError:
                pass

        stock = 0
        stock_str = str(row_dict.get("stock", "0")).strip()
        if stock_str:
            try:
                stock = int(stock_str)
            except ValueError:
                pass

        is_limited = str(row_dict.get("is_limited_edition", "")).strip().lower() in ("true", "1", "yes")

        # Match images from ZIP
        matched_images = sku_images.get(sku_upper, [])
        image_filenames = [os.path.basename(p) for p in matched_images]

        product_preview = {
            "row": row_num,
            "sku": sku,
            "name": str(row_dict.get("name", "")).strip(),
            "description": str(row_dict.get("description", "")).strip(),
            "price": price,
            "compare_price": compare_price,
            "category": str(row_dict.get("category", "")).strip(),
            "sizes": sizes,
            "colors": colors,
            "stock": stock,
            "tags": tags,
            "variants": variants,
            "is_limited_edition": is_limited,
            "image_filenames": image_filenames,
            "image_count": len(matched_images),
            "errors": row_errors,
            "valid": len(row_errors) == 0
        }
        products.append(product_preview)
        all_errors.extend(row_errors)

    # Store session for publish step
    session_doc = {
        "session_id": session_id,
        "uploader_type": uploader["type"],
        "uploader_id": uploader["id"],
        "uploader_name": uploader["name"],
        "session_dir": session_dir,
        "products": products,
        "sku_image_paths": {k: v for k, v in sku_images.items()},
        "total": len(products),
        "valid_count": sum(1 for p in products if p["valid"]),
        "error_count": sum(1 for p in products if not p["valid"]),
        "status": "preview",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bulk_upload_sessions.insert_one(session_doc)

    return {
        "session_id": session_id,
        "total": len(products),
        "valid_count": session_doc["valid_count"],
        "error_count": session_doc["error_count"],
        "products": products,
        "errors": all_errors
    }


@router.post("/publish/{session_id}")
async def bulk_publish(session_id: str, uploader: Dict = Depends(get_uploader)):
    """Publish previewed products. Creates products and uploads images to storage."""
    session = await db.bulk_upload_sessions.find_one(
        {"session_id": session_id, "uploader_id": uploader["id"], "status": "preview"},
        {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Preview session not found or already published")

    # Import upload helpers
    from routes.upload_routes import put_object, init_storage
    try:
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init warning: {e}")

    products = session["products"]
    sku_image_paths = session.get("sku_image_paths", {})
    session_dir = session.get("session_dir", "")
    is_vendor = uploader["type"] == "vendor"
    collection = db.vendor_products if is_vendor else db.products

    created = []
    failed = []

    for prod in products:
        if not prod.get("valid"):
            failed.append({"sku": prod.get("sku", "?"), "reason": "Validation errors", "errors": prod.get("errors", [])})
            continue

        sku = prod["sku"]
        sku_upper = sku.upper()

        # Check if SKU already exists
        existing = await collection.find_one({"sku": sku_upper}, {"_id": 0, "product_id": 1})
        if existing:
            failed.append({"sku": sku, "reason": f"SKU already exists (product: {existing['product_id']})"})
            continue

        # Upload images to object storage
        image_urls = []
        image_paths = sku_image_paths.get(sku_upper, [])
        for img_path in image_paths:
            if not os.path.exists(img_path):
                continue
            ext = os.path.splitext(img_path)[1].lower()
            content_type = CONTENT_TYPE_MAP.get(ext, "image/jpeg")
            storage_path = f"pigma/products/{sku_upper}/{uuid.uuid4().hex[:8]}{ext}"
            try:
                with open(img_path, 'rb') as f:
                    result = put_object(storage_path, f.read(), content_type)
                image_urls.append(f"/api/uploads/files/{result['path']}")
            except Exception as e:
                logger.error(f"Failed to upload image for {sku}: {e}")

        product_id = generate_id("prod_")
        now = datetime.now(timezone.utc).isoformat()

        # Compute total stock from variants if present, else use stock field
        variants = prod.get("variants", [])
        total_stock = prod.get("stock", 0)
        if variants:
            variant_total = sum(v.get("quantity", 0) for v in variants)
            if variant_total > 0:
                total_stock = variant_total

        product_doc = {
            "product_id": product_id,
            "sku": sku_upper,
            "name": prod["name"],
            "description": prod["description"],
            "price": prod["price"],
            "compare_price": prod.get("compare_price"),
            "category": prod["category"],
            "sizes": prod.get("sizes", []),
            "colors": prod.get("colors", []),
            "images": image_urls,
            "videos": [],
            "stock": total_stock,
            "variants": variants,
            "tags": prod.get("tags", []),
            "is_limited_edition": prod.get("is_limited_edition", False),
            "drop_date": None,
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }

        if is_vendor:
            product_doc["vendor_id"] = uploader["id"]
            product_doc["approval_status"] = "pending"
            product_doc["rejection_reason"] = None
            product_doc["total_sold"] = 0
            product_doc["total_revenue"] = 0.0
        else:
            product_doc["vendor_id"] = None
            product_doc["vendor_name"] = None
            product_doc["is_vendor_product"] = False

        try:
            await collection.insert_one(product_doc)
            created.append({"sku": sku, "product_id": product_id, "name": prod["name"], "images": len(image_urls)})
        except Exception as e:
            failed.append({"sku": sku, "reason": str(e)})

    # Update session status
    await db.bulk_upload_sessions.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": "published",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "created_count": len(created),
            "failed_count": len(failed)
        }}
    )

    # Cleanup temp files
    if session_dir and os.path.exists(session_dir):
        shutil.rmtree(session_dir, ignore_errors=True)

    return {
        "session_id": session_id,
        "created": created,
        "failed": failed,
        "total_created": len(created),
        "total_failed": len(failed)
    }


@router.get("/sessions")
async def list_sessions(uploader: Dict = Depends(get_uploader)):
    """List bulk upload sessions for the current uploader."""
    sessions = await db.bulk_upload_sessions.find(
        {"uploader_id": uploader["id"]},
        {"_id": 0, "products": 0, "sku_image_paths": 0, "session_dir": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    return sessions
