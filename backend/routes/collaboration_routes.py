from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from config import db
from auth import get_current_vendor, get_current_user, get_admin_user, generate_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/collaborations", tags=["collaborations"])


class CollaborationRequest(BaseModel):
    influencer_ids: List[str]
    message: str
    commission_rate: Optional[float] = None
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

        req_doc = {
            "request_id": generate_id("collab_"),
            "vendor_id": vendor["vendor_id"],
            "vendor_name": vendor.get("store_name", ""),
            "influencer_id": inf_id,
            "influencer_name": inf.get("name", ""),
            "message": data.message,
            "commission_rate": data.commission_rate,
            "campaign_name": data.campaign_name,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.collaboration_requests.insert_one(req_doc)
        results.append({"influencer_id": inf_id, "status": "sent", "request_id": req_doc["request_id"]})

    return {"message": f"Sent {len([r for r in results if r['status'] == 'sent'])} requests", "results": results}


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

    # Get vendor and influencer contact details
    vendor = await db.vendors.find_one({"vendor_id": req["vendor_id"]}, {"_id": 0})

    # Get platform collab fee
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

    await db.collaboration_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "accepted",
            "responded_at": datetime.now(timezone.utc).isoformat(),
            "vendor_contact": vendor_contact,
            "influencer_contact": influencer_contact,
            "platform_collab_fee": collab_fee,
        }}
    )

    # Create vendor-influencer link for commission tracking
    link_data = {
        "link_id": generate_id("vlink_"),
        "vendor_id": req["vendor_id"],
        "influencer_id": inf["influencer_id"],
        "commission_rate": req.get("commission_rate") or (settings.get("influencer_commission_rate", 10.0) if settings else 10.0),
        "platform_collab_fee": collab_fee,
        "campaign_name": req.get("campaign_name"),
        "request_id": request_id,
        "is_active": True,
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
    }


@router.get("/{request_id}/details")
async def get_collab_details(request_id: str, user: Dict = Depends(get_current_user)):
    """Get full collab details including contact info (only for accepted collabs)"""
    req = await db.collaboration_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req["status"] != "accepted":
        raise HTTPException(status_code=400, detail="Contact details are only available for accepted collaborations")

    # Verify caller is part of this collab
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
