from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query, Header, Response
from typing import Dict, List, Optional
from datetime import datetime, timezone
import uuid
import os
import requests
import logging

from config import db
from auth import get_current_user, get_current_vendor, get_admin_user, generate_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/uploads", tags=["uploads"])

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "pigma"
storage_key = None

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB


def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


@router.post("/image")
async def upload_image(file: UploadFile = File(...), user_id: str = "anonymous"):
    """Upload a product image"""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid image type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}")

    data = await file.read()
    if len(data) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    path = f"{APP_NAME}/images/{user_id}/{uuid.uuid4()}.{ext}"

    try:
        result = put_object(path, data, file.content_type)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")

    file_record = {
        "file_id": generate_id("file_"),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "file_type": "image",
        "user_id": user_id,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.uploaded_files.insert_one(file_record)

    return {
        "file_id": file_record["file_id"],
        "path": result["path"],
        "url": f"/api/uploads/files/{result['path']}",
        "filename": file.filename,
        "size": result.get("size", len(data))
    }


@router.post("/video")
async def upload_video(file: UploadFile = File(...), user_id: str = "anonymous"):
    """Upload a product video"""
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid video type. Allowed: {', '.join(ALLOWED_VIDEO_TYPES)}")

    data = await file.read()
    if len(data) > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=400, detail="Video too large (max 100MB)")

    ext = file.filename.split(".")[-1] if "." in file.filename else "mp4"
    path = f"{APP_NAME}/videos/{user_id}/{uuid.uuid4()}.{ext}"

    try:
        result = put_object(path, data, file.content_type)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")

    file_record = {
        "file_id": generate_id("file_"),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "file_type": "video",
        "user_id": user_id,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.uploaded_files.insert_one(file_record)

    return {
        "file_id": file_record["file_id"],
        "path": result["path"],
        "url": f"/api/uploads/files/{result['path']}",
        "filename": file.filename,
        "size": result.get("size", len(data))
    }


@router.post("/multiple")
async def upload_multiple_files(files: List[UploadFile] = File(...), user_id: str = "anonymous"):
    """Upload multiple images/videos at once"""
    results = []
    errors = []

    for file in files:
        is_image = file.content_type in ALLOWED_IMAGE_TYPES
        is_video = file.content_type in ALLOWED_VIDEO_TYPES

        if not is_image and not is_video:
            errors.append({"filename": file.filename, "error": "Unsupported file type"})
            continue

        data = await file.read()
        max_size = MAX_IMAGE_SIZE if is_image else MAX_VIDEO_SIZE
        if len(data) > max_size:
            errors.append({"filename": file.filename, "error": "File too large"})
            continue

        ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
        folder = "images" if is_image else "videos"
        path = f"{APP_NAME}/{folder}/{user_id}/{uuid.uuid4()}.{ext}"

        try:
            result = put_object(path, data, file.content_type)
            file_record = {
                "file_id": generate_id("file_"),
                "storage_path": result["path"],
                "original_filename": file.filename,
                "content_type": file.content_type,
                "size": result.get("size", len(data)),
                "file_type": "image" if is_image else "video",
                "user_id": user_id,
                "is_deleted": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.uploaded_files.insert_one(file_record)
            results.append({
                "file_id": file_record["file_id"],
                "path": result["path"],
                "url": f"/api/uploads/files/{result['path']}",
                "filename": file.filename,
                "file_type": file_record["file_type"]
            })
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})

    return {"uploaded": results, "errors": errors}


CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Cache-Control": "public, max-age=86400",
}


@router.get("/files/{path:path}")
async def serve_file(path: str, auth: Optional[str] = Query(None)):
    """Serve uploaded file with CORS headers for canvas/crop operations"""
    record = await db.uploaded_files.find_one(
        {"storage_path": path, "is_deleted": False}, {"_id": 0}
    )

    try:
        data, content_type = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found in storage")

    return Response(
        content=data,
        media_type=record.get("content_type", content_type) if record else content_type,
        headers=CORS_HEADERS,
    )


@router.get("/proxy-image")
async def proxy_image(url: str = Query(...)):
    """Proxy an image URL and serve with CORS headers — fallback for tainted canvas"""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        return Response(
            content=resp.content,
            media_type=resp.headers.get("content-type", "image/jpeg"),
            headers=CORS_HEADERS,
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to fetch image")


@router.get("/assets/{path:path}")
async def serve_public_asset(path: str):
    """Serve public static assets from object storage (no auth required)"""
    full_path = f"pigma/assets/{path}"
    try:
        data, content_type = get_object(full_path)
    except Exception:
        raise HTTPException(status_code=404, detail="Asset not found")

    return Response(
        content=data,
        media_type=content_type,
        headers={**CORS_HEADERS, "Cache-Control": "public, max-age=604800"},
    )
