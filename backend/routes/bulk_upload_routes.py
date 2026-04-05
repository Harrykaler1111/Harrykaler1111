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


# Column name aliases — maps common variants to our canonical names
COLUMN_ALIASES = {
    "sku": "sku", "sku_id": "sku", "product_sku": "sku", "sku_code": "sku", "item_code": "sku", "product_code": "sku",
    "name": "name", "product_name": "name", "product name": "name", "title": "name", "product_title": "name",
    "description": "description", "desc": "description", "product_description": "description", "details": "description", "product_details": "description",
    "price": "price", "selling_price": "price", "selling price": "price", "mrp": "price", "rate": "price",
    "compare_price": "compare_price", "compare price": "compare_price", "original_price": "compare_price", "original price": "compare_price", "list_price": "compare_price", "list price": "compare_price",
    "category": "category", "product_category": "category", "product category": "category", "cat": "category", "type": "category",
    "sizes": "sizes", "size": "sizes", "available_sizes": "sizes", "available sizes": "sizes",
    "colors": "colors", "color": "colors", "colour": "colors", "colours": "colors", "available_colors": "colors",
    "stock": "stock", "quantity": "stock", "qty": "stock", "inventory": "stock", "total_stock": "stock", "total stock": "stock",
    "tags": "tags", "tag": "tags", "keywords": "tags",
    "is_limited_edition": "is_limited_edition", "limited_edition": "is_limited_edition", "limited edition": "is_limited_edition", "limited": "is_limited_edition",
    "variants": "variants", "variant": "variants", "variant_data": "variants",
    "sub_category": "sub_category", "sub category": "sub_category", "subcategory": "sub_category",
}


def parse_csv_excel(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Parse CSV or Excel file into a DataFrame."""
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(io.BytesIO(file_bytes), dtype=str, keep_default_na=False)
    elif ext in (".xlsx", ".xls"):
        df = pd.read_excel(io.BytesIO(file_bytes), dtype=str, keep_default_na=False, engine="openpyxl" if ext == ".xlsx" else None)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV or Excel (.xlsx/.xls)")
    # Normalize column names: strip, lowercase, replace spaces with underscores
    df.columns = df.columns.str.strip().str.lower().str.replace(r'\s+', '_', regex=True)
    # Apply column aliases to map user's column names to our canonical names
    rename_map = {}
    for col in df.columns:
        canonical = COLUMN_ALIASES.get(col)
        if canonical and canonical != col and canonical not in df.columns:
            rename_map[col] = canonical
    if rename_map:
        df = df.rename(columns=rename_map)
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
    """Extract images from ZIP, returning a map of SKU -> list of file paths.
    Matches filenames to SKUs by comparing full filename (without ext) against known patterns.
    Handles filenames like: PG-COORD-001.jpg, PG-COORD-001.1.jpg, PG-COORD-001_2.jpg
    """
    all_extracted = []
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
            out_path = os.path.join(session_dir, basename)
            with zf.open(info) as src, open(out_path, 'wb') as dst:
                dst.write(src.read())
            name_without_ext = os.path.splitext(basename)[0].strip().upper()
            all_extracted.append((name_without_ext, out_path))
    return all_extracted


def match_images_to_skus(extracted_files: list, sku_variants_map: Dict[str, str]) -> Dict[str, List[str]]:
    """Match extracted image files to SKUs using the variant map.
    sku_variants_map: maps each variant SKU (uppercase) -> primary SKU (uppercase).
    Matching strategy: check if the filename starts with any known SKU variant.
    """
    sku_images = {}
    for file_name_upper, file_path in extracted_files:
        matched = False
        # Try exact match first, then prefix match (longest match wins)
        best_match = ""
        best_primary = ""
        for variant_sku, primary_sku in sku_variants_map.items():
            if file_name_upper == variant_sku or file_name_upper.startswith(variant_sku):
                if len(variant_sku) > len(best_match):
                    best_match = variant_sku
                    best_primary = primary_sku
                    matched = True
        if matched:
            sku_images.setdefault(best_primary, []).append(file_path)
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



# --- Chunked ZIP Upload ---
CHUNK_DIR = os.path.join(tempfile.gettempdir(), "bulk_chunks")
os.makedirs(CHUNK_DIR, exist_ok=True)


@router.post("/upload-chunk")
async def upload_chunk(
    chunk: UploadFile = File(...),
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    uploader: Dict = Depends(get_uploader)
):
    """Upload a single chunk of a large ZIP file."""
    upload_dir = os.path.join(CHUNK_DIR, upload_id)
    os.makedirs(upload_dir, exist_ok=True)

    chunk_path = os.path.join(upload_dir, f"chunk_{chunk_index:05d}")
    chunk_data = await chunk.read()
    with open(chunk_path, 'wb') as f:
        f.write(chunk_data)

    return {"chunk_index": chunk_index, "received": len(chunk_data), "total_chunks": total_chunks}


@router.post("/assemble-zip")
async def assemble_zip(
    upload_id: str = Form(...),
    total_chunks: int = Form(...),
    filename: str = Form("upload.zip"),
    uploader: Dict = Depends(get_uploader)
):
    """Assemble uploaded chunks into a complete ZIP file."""
    upload_dir = os.path.join(CHUNK_DIR, upload_id)
    if not os.path.exists(upload_dir):
        raise HTTPException(status_code=404, detail="Upload session not found")

    assembled_path = os.path.join(CHUNK_DIR, f"{upload_id}.zip")
    with open(assembled_path, 'wb') as out:
        for i in range(total_chunks):
            chunk_path = os.path.join(upload_dir, f"chunk_{i:05d}")
            if not os.path.exists(chunk_path):
                raise HTTPException(status_code=400, detail=f"Missing chunk {i}")
            with open(chunk_path, 'rb') as cp:
                out.write(cp.read())

    # Clean up chunk dir
    shutil.rmtree(upload_dir, ignore_errors=True)

    # Verify it's a valid ZIP
    try:
        with zipfile.ZipFile(assembled_path, 'r') as zf:
            file_count = len([f for f in zf.infolist() if not f.is_dir()])
    except zipfile.BadZipFile:
        os.remove(assembled_path)
        raise HTTPException(status_code=400, detail="Assembled file is not a valid ZIP")

    return {"upload_id": upload_id, "size": os.path.getsize(assembled_path), "files": file_count}



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
    zip_upload_id: Optional[str] = Form(None),
    uploader: Dict = Depends(get_uploader)
):
    """Parse CSV/Excel + optional ZIP of images, return preview data with validation."""
    # Read the spreadsheet
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        df = parse_csv_excel(file_bytes, file.filename)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk upload parse error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="File contains no data rows")

    # Check required columns
    missing_cols = REQUIRED_COLUMNS - set(df.columns)
    if missing_cols:
        found_cols = list(df.columns)
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(missing_cols)}. Found columns: {', '.join(found_cols)}. Required: {', '.join(REQUIRED_COLUMNS)}"
        )

    # Create session
    session_id = generate_id("bulk_")
    session_dir = os.path.join(tempfile.gettempdir(), f"bulk_{session_id}")
    os.makedirs(session_dir, exist_ok=True)

    # First pass: collect all SKU variants for image matching
    sku_variants_map = {}  # variant_sku_upper -> primary_sku_upper
    for idx, row in df.iterrows():
        raw_sku = str(row.get("sku", "")).strip()
        if not raw_sku:
            continue
        # Handle semicolon-separated SKUs: first part is primary, rest are variants
        parts = [s.strip() for s in raw_sku.split(";") if s.strip()]
        if parts:
            primary = parts[0].upper()
            for part in parts:
                sku_variants_map[part.upper()] = primary

    # Extract ZIP images — from direct upload OR pre-uploaded chunks
    sku_images = {}
    zip_bytes = None
    if zip_file:
        zip_bytes = await zip_file.read()
    elif zip_upload_id:
        assembled_path = os.path.join(CHUNK_DIR, f"{zip_upload_id}.zip")
        if os.path.exists(assembled_path):
            with open(assembled_path, 'rb') as f:
                zip_bytes = f.read()

    if zip_bytes:
        try:
            extracted_files = extract_zip_images(zip_bytes, session_dir)
            sku_images = match_images_to_skus(extracted_files, sku_variants_map)
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

        raw_sku = str(row_dict.get("sku", "")).strip()
        # Handle semicolon-separated SKUs — use first part as primary
        sku_parts = [s.strip() for s in raw_sku.split(";") if s.strip()]
        sku = sku_parts[0] if sku_parts else raw_sku
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
        # Handle semicolon-separated SKUs — use first part as primary
        sku_parts = [s.strip() for s in sku.split(";") if s.strip()]
        primary_sku = sku_parts[0] if sku_parts else sku
        sku_upper = primary_sku.upper()

        # Check if SKU already exists (only among active products)
        existing = await collection.find_one({"sku": sku_upper, "is_active": True}, {"_id": 0, "product_id": 1})
        if existing:
            failed.append({"sku": primary_sku, "reason": f"SKU already exists (product: {existing['product_id']})"})
            continue

        # Remove any inactive products with same SKU (from previous reverted uploads)
        await collection.delete_many({"sku": sku_upper, "is_active": False})

        # Upload images to object storage
        image_urls = []
        image_paths = sku_image_paths.get(sku_upper, [])
        # Also try matching with the full original SKU (semicolons removed)
        if not image_paths and sku != primary_sku:
            for part in sku_parts:
                image_paths.extend(sku_image_paths.get(part.upper(), []))
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
            created.append({"sku": primary_sku, "product_id": product_id, "name": prod["name"], "images": len(image_urls)})
        except Exception as e:
            failed.append({"sku": sku, "reason": str(e)})

    # Update session status
    created_product_ids = [c["product_id"] for c in created]
    await db.bulk_upload_sessions.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": "published",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "created_count": len(created),
            "failed_count": len(failed),
            "created_product_ids": created_product_ids,
            "is_vendor": is_vendor
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
    ).sort("created_at", -1).limit(50).to_list(50)
    return sessions


@router.post("/revert/{session_id}")
async def revert_bulk_upload(session_id: str, uploader: Dict = Depends(get_uploader)):
    """Revert a published bulk upload — deletes all products created in that batch."""
    session = await db.bulk_upload_sessions.find_one(
        {"session_id": session_id, "uploader_id": uploader["id"], "status": "published"},
        {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Published session not found or already reverted")

    product_ids = session.get("created_product_ids", [])
    if not product_ids:
        raise HTTPException(status_code=400, detail="No products to revert in this session")

    is_vendor = session.get("is_vendor", False)
    collection = db.vendor_products if is_vendor else db.products

    # Soft-delete (deactivate) all products from this batch
    result = await collection.update_many(
        {"product_id": {"$in": product_ids}},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    # Update session status
    await db.bulk_upload_sessions.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": "reverted",
            "reverted_at": datetime.now(timezone.utc).isoformat(),
            "reverted_count": result.modified_count
        }}
    )

    return {
        "session_id": session_id,
        "reverted_count": result.modified_count,
        "total_in_batch": len(product_ids),
        "message": f"Reverted {result.modified_count} products"
    }
