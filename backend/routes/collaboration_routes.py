from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging
import uuid

from config import db
from auth import get_current_vendor, get_current_user, get_admin_user, generate_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/collaborations", tags=["collaborations"])


def generate_collab_referral_code(vendor_name: str, influencer_name: str) -> str:
    v = vendor_name.upper().replace(" ", "")[:3]
    i = influencer_name.upper().replace(" ", "")[:3]
    return f"{v}{i}{uuid.uuid4().hex[:6].upper()}"


class CollaborationRequest(BaseModel):
    influencer_ids: List[str]
    message: str
    commission_rate: Optional[float] = None
    fixed_payment: Optional[float] = None
    campaign_name: Optional[str] = None


@router.post("/request")
async def send_collaboration_request(data: CollaborationRequest, vendor: Dict = Depends(get_current_vendor)):
    if vendor.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Vendor must be approved")

    results = []
    for inf_id in data.influencer_ids:
        inf = await db.influencers.find_one({"influencer_id": inf_id, "status": "approved"}, {"_id": 0})
        if not inf:
            continue

        existing = await db.collaboration_requests.find_one({
            "vendor_id": vendor["vendor_id"],
            "influencer_id": inf_id,
            "status": "pending"
        })
        if existing:
            results.append({"influencer_id": inf_id, "status": "already_pending"})
            continue

        referral_code = generate_collab_referral_code(vendor.get("store_name", "V"), inf.get("name", "I"))

        req_doc = {
            "request_id": generate_id("collab_"),
            "vendor_id": vendor["vendor_id"],
            "vendor_name": vendor.get("store_name", ""),
            "influencer_id": inf_id,
            "influencer_name": inf.get("name", ""),
            "message": data.message,
            "commission_rate": data.commission_rate,
            "fixed_payment": data.fixed_payment,
            "campaign_name": data.campaign_name,
            "referral_code": referral_code,
            "status": "pending",
            "sales_count": 0,
            "sales_revenue": 0.0,
            "commission_earned": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.collaboration_requests.insert_one(req_doc)
        results.append({"influencer_id": inf_id, "status": "sent", "request_id": req_doc["request_id"]})

    return {"message": f"Sent {len([r for r in results if r['status'] == 'sent'])} requests", "results": results}


@router.post("/{request_id}/resend")
async def resend_collaboration_request(request_id: str, vendor: Dict = Depends(get_current_vendor)):
    """Resend a rejected/expired collaboration request"""
    req = await db.collaboration_requests.find_one(
        {"request_id": request_id, "vendor_id": vendor["vendor_id"]}, {"_id": 0}
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req["status"] == "pending":
        raise HTTPException(status_code=400, detail="Request is already pending")

    referral_code = generate_collab_referral_code(vendor.get("store_name", "V"), req.get("influencer_name", "I"))

    new_req = {
        "request_id": generate_id("collab_"),
        "vendor_id": vendor["vendor_id"],
        "vendor_name": vendor.get("store_name", ""),
        "influencer_id": req["influencer_id"],
        "influencer_name": req.get("influencer_name", ""),
        "message": req.get("message", ""),
        "commission_rate": req.get("commission_rate"),
        "fixed_payment": req.get("fixed_payment"),
        "campaign_name": req.get("campaign_name"),
        "referral_code": referral_code,
        "status": "pending",
        "resent_from": request_id,
        "sales_count": 0,
        "sales_revenue": 0.0,
        "commission_earned": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.collaboration_requests.insert_one(new_req)
    return {"message": "Collaboration request resent", "request_id": new_req["request_id"], "referral_code": referral_code}


@router.get("/vendor/sent")
async def get_vendor_sent_requests(vendor: Dict = Depends(get_current_vendor)):
    requests = await db.collaboration_requests.find(
        {"vendor_id": vendor["vendor_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return requests


@router.get("/influencer/received")
async def get_influencer_received_requests(user: Dict = Depends(get_current_user)):
    inf = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not inf:
        raise HTTPException(status_code=404, detail="Not registered as influencer")

    requests = await db.collaboration_requests.find(
        {"influencer_id": inf["influencer_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return requests


@router.put("/{request_id}/accept")
async def accept_collaboration(request_id: str, user: Dict = Depends(get_current_user)):
    inf = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not inf:
        raise HTTPException(status_code=404, detail="Not registered as influencer")

    req = await db.collaboration_requests.find_one(
        {"request_id": request_id, "influencer_id": inf["influencer_id"]}, {"_id": 0}
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request is not pending")

    vendor = await db.vendors.find_one({"vendor_id": req["vendor_id"]}, {"_id": 0})

    settings = await db.platform_settings.find_one({"setting_id": "global"}, {"_id": 0})
    collab_fee = settings.get("collab_platform_fee", 5.0) if settings else 5.0

    vendor_contact = {
        "name": vendor.get("store_name", "") if vendor else "",
        "email": vendor.get("email", "") if vendor else "",
        "phone": vendor.get("phone", "") if vendor else "",
    }
    influencer_contact = {
        "name": inf.get("name", ""),
        "email": user.get("email", ""),
        "phone": user.get("phone", ""),
        "instagram": inf.get("instagram_handle", ""),
    }

    referral_code = req.get("referral_code") or generate_collab_referral_code(
        vendor.get("store_name", "V") if vendor else "V", inf.get("name", "I")
    )

    await db.collaboration_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "accepted",
            "responded_at": datetime.now(timezone.utc).isoformat(),
            "vendor_contact": vendor_contact,
            "influencer_contact": influencer_contact,
            "platform_collab_fee": collab_fee,
            "referral_code": referral_code,
        }}
    )

    link_data = {
        "link_id": generate_id("vlink_"),
        "vendor_id": req["vendor_id"],
        "influencer_id": inf["influencer_id"],
        "commission_rate": req.get("commission_rate") or (settings.get("influencer_commission_rate", 10.0) if settings else 10.0),
        "fixed_payment": req.get("fixed_payment"),
        "platform_collab_fee": collab_fee,
        "campaign_name": req.get("campaign_name"),
        "referral_code": referral_code,
        "request_id": request_id,
        "is_active": True,
        "sales_count": 0,
        "sales_revenue": 0.0,
        "commission_earned": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.vendor_influencer_links.update_one(
        {"vendor_id": req["vendor_id"], "influencer_id": inf["influencer_id"]},
        {"$set": link_data},
        upsert=True
    )

    return {
        "message": "Collaboration accepted! Contact details shared.",
        "vendor_contact": vendor_contact,
        "influencer_contact": influencer_contact,
        "platform_collab_fee": collab_fee,
        "referral_code": referral_code,
    }


@router.get("/track/{referral_code}")
async def track_referral(referral_code: str):
    """Track sales via collaboration referral code"""
    collab = await db.collaboration_requests.find_one(
        {"referral_code": referral_code, "status": "accepted"}, {"_id": 0}
    )
    if not collab:
        raise HTTPException(status_code=404, detail="Invalid referral code")

    return {
        "vendor_id": collab["vendor_id"],
        "vendor_name": collab.get("vendor_name", ""),
        "influencer_id": collab["influencer_id"],
        "influencer_name": collab.get("influencer_name", ""),
        "campaign_name": collab.get("campaign_name"),
        "commission_rate": collab.get("commission_rate"),
        "sales_count": collab.get("sales_count", 0),
        "sales_revenue": collab.get("sales_revenue", 0.0),
        "commission_earned": collab.get("commission_earned", 0.0),
    }


@router.get("/{request_id}/details")
async def get_collab_details(request_id: str, user: Dict = Depends(get_current_user)):
    """Get full collab details including contact info (only for accepted collabs)"""
    req = await db.collaboration_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req["status"] != "accepted":
        raise HTTPException(status_code=400, detail="Contact details are only available for accepted collaborations")

    inf = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    is_influencer = inf and inf["influencer_id"] == req.get("influencer_id")

    vendor = await db.vendors.find_one({"user_id": user["user_id"]}, {"_id": 0})
    is_vendor = vendor and vendor["vendor_id"] == req.get("vendor_id")

    if not is_influencer and not is_vendor:
        raise HTTPException(status_code=403, detail="You are not part of this collaboration")

    return req


@router.put("/{request_id}/reject")
async def reject_collaboration(request_id: str, user: Dict = Depends(get_current_user)):
    inf = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not inf:
        raise HTTPException(status_code=404, detail="Not registered as influencer")

    req = await db.collaboration_requests.find_one(
        {"request_id": request_id, "influencer_id": inf["influencer_id"]}, {"_id": 0}
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    await db.collaboration_requests.update_one(
        {"request_id": request_id},
        {"$set": {"status": "rejected", "responded_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"message": "Collaboration rejected"}
