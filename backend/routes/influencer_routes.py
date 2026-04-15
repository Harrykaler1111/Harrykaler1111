from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel as PydanticBaseModel
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import logging

from config import (
    db, DEFAULT_COMMISSION_RATE, MIN_WITHDRAWAL_AMOUNT,
    INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_REDIRECT_URI,
    DM_RATE_LIMIT_PER_HOUR, DM_RATE_LIMIT_PER_DAY
)
from models.schemas import (
    InfluencerCreate, InfluencerResponse, WalletTransactionResponse,
    WithdrawalRequest, WithdrawalResponse, InstagramPostCreate, InstagramPostResponse
)
from models.enums import WithdrawalStatus, TransactionType
from auth import (
    get_current_user, get_admin_user, check_permission,
    generate_id, generate_referral_code, generate_referral_link
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/influencers", tags=["influencers"])


@router.post("/apply", response_model=InfluencerResponse)
async def apply_as_influencer(data: InfluencerCreate, user: Dict = Depends(get_current_user)):
    existing = await db.influencers.find_one({"user_id": user["user_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already registered as influencer")

    influencer_id = generate_id("inf_")
    referral_code = generate_referral_code(user["name"])

    from display_ids import generate_display_id
    display_id = await generate_display_id("influencer")

    influencer_doc = {
        "influencer_id": influencer_id,
        "display_id": display_id,
        "user_id": user["user_id"],
        "name": user["name"],
        "email": user["email"],
        **data.model_dump(),
        "status": "pending",
        "referral_code": referral_code,
        "total_clicks": 0,
        "total_conversions": 0,
        "total_earnings": 0.0,
        "wallet_balance": 0.0,
        "commission_rate": DEFAULT_COMMISSION_RATE,
        "instagram_connected": False,
        "instagram_user_id": None,
        "instagram_username": None,
        "instagram_access_token": None,
        "automation_enabled": False,
        "dm_rate_limit_hour": 0,
        "dm_rate_limit_day": 0,
        "last_dm_reset_hour": datetime.now(timezone.utc).isoformat(),
        "last_dm_reset_day": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.influencers.insert_one(influencer_doc)

    if user["role"] != "admin":
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"role": "influencer", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

    return InfluencerResponse(**influencer_doc)


@router.get("/me", response_model=InfluencerResponse)
async def get_my_influencer_profile(user: Dict = Depends(get_current_user)):
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not registered as influencer")
    return InfluencerResponse(**influencer)


@router.get("/leaderboard", response_model=List[InfluencerResponse])
async def get_influencer_leaderboard(limit: int = 10):
    influencers = await db.influencers.find(
        {"status": "approved"},
        {"_id": 0}
    ).sort("total_earnings", -1).limit(limit).to_list(limit)
    return [InfluencerResponse(**i) for i in influencers]


@router.get("/featured")
async def get_featured_influencers(limit: int = 10):
    """Public endpoint — featured influencers with follower counts"""
    influencers = await db.influencers.find(
        {"status": "approved"},
        {"_id": 0, "instagram_access_token": 0}
    ).sort("total_earnings", -1).limit(limit).to_list(limit)

    results = []
    for inf in influencers:
        follower_count = await db.influencer_follows.count_documents({"influencer_id": inf["influencer_id"]})
        post_count = await db.instagram_posts.count_documents({"influencer_id": inf["influencer_id"]})
        results.append({
            "influencer_id": inf["influencer_id"],
            "name": inf.get("name", ""),
            "instagram_handle": inf.get("instagram_handle", ""),
            "instagram_username": inf.get("instagram_username", ""),
            "instagram_connected": inf.get("instagram_connected", False),
            "niche": inf.get("niche", ""),
            "followers": follower_count,
            "posts": post_count,
            "total_sales": inf.get("total_sales", 0),
            "total_earnings": inf.get("total_earnings", 0),
            "referral_code": inf.get("referral_code", ""),
        })
    return results


@router.post("/{influencer_id}/follow")
async def follow_influencer(influencer_id: str, user: Dict = Depends(get_current_user)):
    """Follow an influencer"""
    inf = await db.influencers.find_one({"influencer_id": influencer_id}, {"_id": 0, "influencer_id": 1})
    if not inf:
        raise HTTPException(status_code=404, detail="Influencer not found")
    existing = await db.influencer_follows.find_one({"user_id": user["user_id"], "influencer_id": influencer_id})
    if existing:
        count = await db.influencer_follows.count_documents({"influencer_id": influencer_id})
        return {"following": True, "followers": count}
    await db.influencer_follows.insert_one({
        "user_id": user["user_id"],
        "influencer_id": influencer_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    count = await db.influencer_follows.count_documents({"influencer_id": influencer_id})
    return {"following": True, "followers": count}


@router.post("/{influencer_id}/unfollow")
async def unfollow_influencer(influencer_id: str, user: Dict = Depends(get_current_user)):
    """Unfollow an influencer"""
    await db.influencer_follows.delete_one({"user_id": user["user_id"], "influencer_id": influencer_id})
    count = await db.influencer_follows.count_documents({"influencer_id": influencer_id})
    return {"following": False, "followers": count}


@router.get("/{influencer_id}/follow-status")
async def influencer_follow_status(influencer_id: str, user: Dict = Depends(get_current_user)):
    """Check if user follows an influencer"""
    existing = await db.influencer_follows.find_one({"user_id": user["user_id"], "influencer_id": influencer_id})
    count = await db.influencer_follows.count_documents({"influencer_id": influencer_id})
    return {"following": existing is not None, "followers": count}


# ============== COLLABORATION REQUESTS ==============

class CollabRequest(PydanticBaseModel):
    influencer_id: str
    message: str = ""
    product_ids: List[str] = []


@router.post("/collab/request")
async def send_collab_request(data: CollabRequest, user: Dict = Depends(get_current_user)):
    """Vendor sends a collaboration request to an influencer"""
    # Must be a vendor
    vendor = await db.vendors.find_one({"user_id": user["user_id"], "status": "approved"}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=403, detail="Only registered vendors can send collaboration requests. Please register as a vendor first.")

    influencer = await db.influencers.find_one({"influencer_id": data.influencer_id}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")

    # Check for duplicate pending request
    existing = await db.collab_requests.find_one({
        "vendor_id": vendor["vendor_id"],
        "influencer_id": data.influencer_id,
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending request with this influencer")

    request_doc = {
        "request_id": generate_id("collab_"),
        "vendor_id": vendor["vendor_id"],
        "vendor_name": vendor.get("store_name", ""),
        "vendor_user_id": user["user_id"],
        "influencer_id": data.influencer_id,
        "influencer_name": influencer.get("name", ""),
        "message": data.message,
        "product_ids": data.product_ids,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.collab_requests.insert_one(request_doc)

    return {"message": "Collaboration request sent!", "request_id": request_doc["request_id"]}


@router.get("/collab/my-requests")
async def get_my_collab_requests(user: Dict = Depends(get_current_user)):
    """Influencer views their incoming requests"""
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not an influencer")

    requests = await db.collab_requests.find(
        {"influencer_id": influencer["influencer_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return requests


@router.put("/collab/{request_id}/accept")
async def accept_collab(request_id: str, user: Dict = Depends(get_current_user)):
    """Influencer accepts a collab request — shares contact info with vendor"""
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not an influencer")

    req = await db.collab_requests.find_one({"request_id": request_id, "influencer_id": influencer["influencer_id"]}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    user_record = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "phone": 1, "email": 1})

    await db.collab_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "accepted",
            "influencer_contact": {
                "email": user_record.get("email", ""),
                "phone": user_record.get("phone", ""),
                "instagram": influencer.get("instagram_handle", ""),
            },
            "accepted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Request accepted. Your contact details have been shared with the vendor."}


@router.put("/collab/{request_id}/reject")
async def reject_collab(request_id: str, user: Dict = Depends(get_current_user)):
    """Influencer rejects a collab request"""
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not an influencer")

    await db.collab_requests.update_one(
        {"request_id": request_id, "influencer_id": influencer["influencer_id"]},
        {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Request rejected"}


@router.get("/collab/vendor-requests")
async def get_vendor_collab_requests(user: Dict = Depends(get_current_user)):
    """Vendor views their sent requests + contact details for accepted ones"""
    vendor = await db.vendors.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Not a vendor")

    requests = await db.collab_requests.find(
        {"vendor_id": vendor["vendor_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return requests



@router.get("/referral-links")
async def get_influencer_referral_links(user: Dict = Depends(get_current_user)):
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not registered as influencer")

    products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(100)

    links = []
    base_link = generate_referral_link(influencer["referral_code"])
    links.append({
        "type": "general",
        "product_id": None,
        "product_name": "All Products",
        "link": base_link
    })

    for product in products:
        links.append({
            "type": "product",
            "product_id": product["product_id"],
            "product_name": product["name"],
            "link": generate_referral_link(influencer["referral_code"], product["product_id"])
        })

    return links


# ============== ADMIN INFLUENCER MANAGEMENT ==============

@router.get("", response_model=List[InfluencerResponse])
async def get_all_influencers(status: Optional[str] = None, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "influencers", "view"):
        raise HTTPException(status_code=403, detail="Permission denied")

    query = {}
    if status:
        query["status"] = status

    influencers = await db.influencers.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [InfluencerResponse(**i) for i in influencers]


@router.put("/{influencer_id}/status")
async def update_influencer_status(influencer_id: str, status: str, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "influencers", "approve"):
        raise HTTPException(status_code=403, detail="Permission denied")

    if status not in ["pending", "approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    result = await db.influencers.update_one(
        {"influencer_id": influencer_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Influencer not found")

    return {"message": f"Influencer status updated to {status}"}


@router.put("/{influencer_id}/commission")
async def update_influencer_commission(influencer_id: str, commission_rate: float, admin: Dict = Depends(get_admin_user)):
    if not check_permission(admin, "commissions", "edit"):
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.influencers.update_one(
        {"influencer_id": influencer_id},
        {"$set": {"commission_rate": commission_rate, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Influencer not found")

    return {"message": f"Commission rate updated to {commission_rate}%"}


# ============== INSTAGRAM INTEGRATION ==============
# OAuth handled by /api/instagram/auth/* routes in instagram_routes.py
# This is a convenience redirect for the influencer dashboard

@router.get("/instagram/connect")
async def get_instagram_connect_url(user: Dict = Depends(get_current_user)):
    """Generate Facebook OAuth URL for Instagram Business connection (v19.0)"""
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not registered as influencer")

    if influencer["status"] != "approved":
        raise HTTPException(status_code=403, detail="Your influencer account must be approved first")

    # Delegate to the central Instagram auth route
    import urllib.parse

    state = generate_id("igauth_")
    await db.instagram_oauth_states.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "state": state,
            "user_id": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        }},
        upsert=True
    )

    redirect_uri = os.environ.get("INSTAGRAM_REDIRECT_URI")
    # HARDCODED App ID to prevent env loading issues in production
    app_id = "1280214187553693"
    # HARDCODED Config ID from Facebook Login for Business
    config_id = "975030191656092"

    logger.info(f"[IG_CONNECT] app_id={app_id}, config_id={config_id}, redirect_uri={redirect_uri}")

    params = {
        "client_id": app_id,
        "redirect_uri": redirect_uri,
        "config_id": config_id,
        "response_type": "code",
        "state": state,
    }
    oauth_url = f"https://www.facebook.com/v19.0/dialog/oauth?{urllib.parse.urlencode(params)}"

    logger.info(f"Facebook OAuth URL (v19.0): {oauth_url}")

    return {"oauth_url": oauth_url, "state": state}


# Callback handled by /api/instagram/auth/callback in instagram_routes.py


@router.post("/instagram/disconnect")
async def disconnect_instagram(user: Dict = Depends(get_current_user)):
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not registered as influencer")

    await db.influencers.update_one(
        {"influencer_id": influencer["influencer_id"]},
        {"$set": {
            "instagram_connected": False,
            "instagram_user_id": None,
            "instagram_username": None,
            "instagram_access_token": None,
            "instagram_page_id": None,
            "automation_enabled": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"message": "Instagram disconnected"}


@router.post("/instagram/toggle-automation")
async def toggle_instagram_automation(enabled: bool, user: Dict = Depends(get_current_user)):
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not registered as influencer")

    if not influencer.get("instagram_connected"):
        raise HTTPException(status_code=400, detail="Instagram not connected")

    await db.influencers.update_one(
        {"influencer_id": influencer["influencer_id"]},
        {"$set": {"automation_enabled": enabled, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"automation_enabled": enabled}


@router.post("/instagram/posts", response_model=InstagramPostResponse)
async def register_instagram_post(post_data: InstagramPostCreate, user: Dict = Depends(get_current_user)):
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not registered as influencer")

    if not influencer.get("instagram_connected"):
        raise HTTPException(status_code=400, detail="Instagram not connected")

    product = await db.products.find_one({"product_id": post_data.product_id, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    post_record_id = generate_id("igpost_")
    referral_link = generate_referral_link(influencer["referral_code"], post_data.product_id)
    default_message = f"Thanks for your interest! Here's the product link: {referral_link}"

    post_record = {
        "post_record_id": post_record_id,
        "influencer_id": influencer["influencer_id"],
        "post_url": post_data.post_url,
        "post_id": post_data.post_id,
        "media_id": post_data.media_id,
        "product_id": post_data.product_id,
        "product_name": product["name"],
        "referral_link": referral_link,
        "auto_dm_enabled": post_data.auto_dm_enabled,
        "dm_message": post_data.dm_message or default_message,
        "total_comments": 0,
        "total_dms_sent": 0,
        "commented_users": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.instagram_posts.insert_one(post_record)
    return InstagramPostResponse(**post_record)


@router.get("/instagram/posts", response_model=List[InstagramPostResponse])
async def get_instagram_posts(user: Dict = Depends(get_current_user)):
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not registered as influencer")

    posts = await db.instagram_posts.find(
        {"influencer_id": influencer["influencer_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    return [InstagramPostResponse(**p) for p in posts]


@router.post("/instagram/webhook")
async def instagram_webhook(request: Request):
    data = await request.json()

    post_id = data.get("post_id")
    commenter_username = data.get("commenter_username")
    commenter_id = data.get("commenter_id")

    if not all([post_id, commenter_username, commenter_id]):
        return {"status": "ignored", "reason": "Missing data"}

    post_record = await db.instagram_posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post_record or not post_record.get("auto_dm_enabled"):
        return {"status": "ignored", "reason": "Post not found or automation disabled"}

    if commenter_id in post_record.get("commented_users", []):
        return {"status": "ignored", "reason": "Already sent DM to user"}

    influencer = await db.influencers.find_one({"influencer_id": post_record["influencer_id"]}, {"_id": 0})
    if not influencer or not influencer.get("automation_enabled"):
        return {"status": "ignored", "reason": "Automation disabled"}

    now = datetime.now(timezone.utc)
    last_hour_reset = datetime.fromisoformat(influencer.get("last_dm_reset_hour", now.isoformat()))
    last_day_reset = datetime.fromisoformat(influencer.get("last_dm_reset_day", now.isoformat()))

    if last_hour_reset.tzinfo is None:
        last_hour_reset = last_hour_reset.replace(tzinfo=timezone.utc)
    if last_day_reset.tzinfo is None:
        last_day_reset = last_day_reset.replace(tzinfo=timezone.utc)

    hourly_count = influencer.get("dm_rate_limit_hour", 0)
    daily_count = influencer.get("dm_rate_limit_day", 0)

    if (now - last_hour_reset).total_seconds() > 3600:
        hourly_count = 0
        await db.influencers.update_one(
            {"influencer_id": influencer["influencer_id"]},
            {"$set": {"dm_rate_limit_hour": 0, "last_dm_reset_hour": now.isoformat()}}
        )

    if (now - last_day_reset).total_seconds() > 86400:
        daily_count = 0
        await db.influencers.update_one(
            {"influencer_id": influencer["influencer_id"]},
            {"$set": {"dm_rate_limit_day": 0, "last_dm_reset_day": now.isoformat()}}
        )

    if hourly_count >= DM_RATE_LIMIT_PER_HOUR:
        return {"status": "rate_limited", "reason": "Hourly DM limit reached"}

    if daily_count >= DM_RATE_LIMIT_PER_DAY:
        return {"status": "rate_limited", "reason": "Daily DM limit reached"}

    dm_record = {
        "dm_id": generate_id("dm_"),
        "influencer_id": influencer["influencer_id"],
        "post_id": post_id,
        "recipient_id": commenter_id,
        "recipient_username": commenter_username,
        "message": post_record["dm_message"],
        "status": "pending",
        "created_at": now.isoformat()
    }

    # Send real DM via Facebook Graph API v19.0 using Page Access Token
    access_token = influencer.get("instagram_access_token")
    ig_user_id = influencer.get("instagram_user_id")

    if access_token and ig_user_id:
        import httpx
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"https://graph.facebook.com/v19.0/{ig_user_id}/messages",
                    params={"access_token": access_token},
                    json={
                        "recipient": {"id": commenter_id},
                        "message": {"text": post_record["dm_message"]}
                    }
                )
                if resp.status_code == 200:
                    dm_record["status"] = "sent"
                    dm_record["ig_message_id"] = resp.json().get("message_id")
                    logger.info(f"DM sent to {commenter_username} for post {post_id}")
                else:
                    dm_record["status"] = "failed"
                    dm_record["error"] = resp.text
                    logger.error(f"DM failed to {commenter_username}: {resp.text}")
        except Exception as e:
            dm_record["status"] = "failed"
            dm_record["error"] = str(e)
            logger.error(f"DM error to {commenter_username}: {e}")
    else:
        dm_record["status"] = "failed"
        dm_record["error"] = "No access token"

    await db.instagram_dms.insert_one(dm_record)

    await db.influencers.update_one(
        {"influencer_id": influencer["influencer_id"]},
        {"$inc": {"dm_rate_limit_hour": 1, "dm_rate_limit_day": 1}}
    )

    await db.instagram_posts.update_one(
        {"post_record_id": post_record["post_record_id"]},
        {
            "$inc": {"total_comments": 1, "total_dms_sent": 1},
            "$push": {"commented_users": commenter_id}
        }
    )

    logger.info(f"Sent DM to {commenter_username} for post {post_id}")
    return {"status": "sent", "dm_id": dm_record["dm_id"]}


# ============== WALLET & WITHDRAWAL ==============

@router.get("/wallet/transactions", response_model=List[WalletTransactionResponse])
async def get_wallet_transactions(user: Dict = Depends(get_current_user), skip: int = 0, limit: int = 50):
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not registered as influencer")

    transactions = await db.wallet_transactions.find(
        {"influencer_id": influencer["influencer_id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    return [WalletTransactionResponse(**t) for t in transactions]


@router.get("/wallet/balance")
async def get_wallet_balance(user: Dict = Depends(get_current_user)):
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not registered as influencer")

    return {
        "wallet_balance": influencer.get("wallet_balance", 0.0),
        "total_earnings": influencer.get("total_earnings", 0.0),
        "pending_withdrawals": 0,
        "min_withdrawal_amount": MIN_WITHDRAWAL_AMOUNT
    }


@router.post("/wallet/withdraw", response_model=WithdrawalResponse)
async def request_withdrawal(request: WithdrawalRequest, user: Dict = Depends(get_current_user)):
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not registered as influencer")

    if influencer["status"] != "approved":
        raise HTTPException(status_code=403, detail="Influencer account not approved")

    wallet_balance = influencer.get("wallet_balance", 0.0)

    if request.amount < MIN_WITHDRAWAL_AMOUNT:
        raise HTTPException(status_code=400, detail=f"Minimum withdrawal amount is {MIN_WITHDRAWAL_AMOUNT}")

    if request.amount > wallet_balance:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")

    pending = await db.withdrawals.find_one({
        "influencer_id": influencer["influencer_id"],
        "status": {"$in": ["pending", "processing"]}
    })
    if pending:
        raise HTTPException(status_code=400, detail="You have a pending withdrawal request")

    withdrawal_id = generate_id("wd_")
    withdrawal_doc = {
        "withdrawal_id": withdrawal_id,
        "influencer_id": influencer["influencer_id"],
        "influencer_name": influencer["name"],
        "influencer_email": influencer["email"],
        "amount": request.amount,
        "status": WithdrawalStatus.PENDING.value,
        "bank_details": {
            "account_name": request.bank_account_name,
            "account_number": request.bank_account_number,
            "ifsc": request.bank_ifsc,
            "bank_name": request.bank_name
        },
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "processed_at": None,
        "admin_note": None,
        "payout_id": None
    }

    await db.withdrawals.insert_one(withdrawal_doc)

    new_balance = wallet_balance - request.amount
    await db.influencers.update_one(
        {"influencer_id": influencer["influencer_id"]},
        {"$set": {"wallet_balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    transaction = {
        "transaction_id": generate_id("txn_"),
        "influencer_id": influencer["influencer_id"],
        "type": TransactionType.WITHDRAWAL.value,
        "amount": -request.amount,
        "balance_after": new_balance,
        "description": f"Withdrawal request {withdrawal_id}",
        "withdrawal_id": withdrawal_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wallet_transactions.insert_one(transaction)

    return WithdrawalResponse(**withdrawal_doc)


@router.get("/withdrawals", response_model=List[WithdrawalResponse])
async def get_my_withdrawals(user: Dict = Depends(get_current_user)):
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not registered as influencer")

    withdrawals = await db.withdrawals.find(
        {"influencer_id": influencer["influencer_id"]},
        {"_id": 0}
    ).sort("requested_at", -1).to_list(50)

    return [WithdrawalResponse(**w) for w in withdrawals]
