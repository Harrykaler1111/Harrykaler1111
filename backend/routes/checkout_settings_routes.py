from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
from datetime import datetime, timezone

from config import db
from auth import get_admin_user, get_current_user, generate_id

router = APIRouter(prefix="/checkout", tags=["checkout"])

DEFAULT_SETTINGS = {
    "setting_id": "checkout_global",
    # COD config
    "cod_enabled": True,
    "cod_charge": 49,
    "cod_advance_enabled": True,
    "cod_advance_threshold": 1000,   # Cart >= this → require advance
    "cod_advance_amount": 500,       # Advance amount to collect
    "cod_max_order_value": 10000,    # Max order value allowed for COD
    "max_cod_per_user": 3,           # Max pending COD orders per user
    # Prepaid config
    "prepaid_discount_enabled": True,
    "prepaid_discount": 100,         # Flat discount for prepaid
    # Fraud/risk
    "high_risk_threshold": 3000,     # Orders above this flagged
    "block_repeat_fake_users": True,
    # Shipping
    "free_shipping_threshold": 2999,
    "shipping_charge": 199,
    # Messages
    "cod_advance_message": "To confirm your order, a small advance of Rs.{advance} is required. Remaining amount will be paid on delivery.",
    "prepaid_savings_message": "Save Rs.{discount} by paying online!",
    "updated_at": None,
    "updated_by": None,
}


async def get_checkout_settings():
    """Get or create checkout settings (singleton)"""
    settings = await db.checkout_settings.find_one({"setting_id": "checkout_global"}, {"_id": 0})
    if not settings:
        settings = {**DEFAULT_SETTINGS, "updated_at": datetime.now(timezone.utc).isoformat()}
        await db.checkout_settings.insert_one(settings)
        settings.pop("_id", None)
    return settings


# ============== PUBLIC ENDPOINT ==============

@router.get("/settings")
async def get_public_checkout_settings():
    """Public settings for frontend checkout page"""
    s = await get_checkout_settings()
    return {
        "cod_enabled": s["cod_enabled"],
        "cod_charge": s["cod_charge"],
        "cod_advance_enabled": s["cod_advance_enabled"],
        "cod_advance_threshold": s["cod_advance_threshold"],
        "cod_advance_amount": s["cod_advance_amount"],
        "cod_max_order_value": s["cod_max_order_value"],
        "prepaid_discount_enabled": s["prepaid_discount_enabled"],
        "prepaid_discount": s["prepaid_discount"],
        "free_shipping_threshold": s["free_shipping_threshold"],
        "shipping_charge": s["shipping_charge"],
        "cod_advance_message": s["cod_advance_message"],
        "prepaid_savings_message": s["prepaid_savings_message"],
    }


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/settings")
async def get_admin_checkout_settings(admin: Dict = Depends(get_admin_user)):
    return await get_checkout_settings()


@router.put("/admin/settings")
async def update_checkout_settings(data: Dict, admin: Dict = Depends(get_admin_user)):
    await get_checkout_settings()  # ensure doc exists
    allowed_keys = {
        "cod_enabled", "cod_charge", "cod_advance_enabled",
        "cod_advance_threshold", "cod_advance_amount", "cod_max_order_value",
        "max_cod_per_user", "prepaid_discount_enabled", "prepaid_discount",
        "high_risk_threshold", "block_repeat_fake_users",
        "free_shipping_threshold", "shipping_charge",
        "cod_advance_message", "prepaid_savings_message",
    }
    updates = {k: v for k, v in data.items() if k in allowed_keys}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_by"] = admin.get("admin_id")

    await db.checkout_settings.update_one(
        {"setting_id": "checkout_global"},
        {"$set": updates}
    )
    return {"message": "Checkout settings updated", **updates}


# ============== HIGH-RISK ORDERS ==============

@router.get("/admin/high-risk-orders")
async def get_high_risk_orders(admin: Dict = Depends(get_admin_user)):
    """Get orders flagged as high risk"""
    orders = await db.orders.find(
        {"risk_level": {"$in": ["high", "medium"]}},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)

    for o in orders:
        user = await db.users.find_one({"user_id": o["user_id"]}, {"_id": 0, "name": 1, "email": 1, "phone": 1})
        o["customer"] = user or {}

    return orders


@router.put("/admin/orders/{order_id}/risk-action")
async def admin_risk_action(order_id: str, data: Dict, admin: Dict = Depends(get_admin_user)):
    """Admin approve/hold/cancel a risky order"""
    action = data.get("action")  # approve, hold, cancel
    if action not in ("approve", "hold", "cancel"):
        raise HTTPException(status_code=400, detail="Invalid action")

    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    status_map = {"approve": "confirmed", "hold": "on_hold", "cancel": "cancelled"}
    new_status = status_map[action]

    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "status": new_status,
            "risk_reviewed": True,
            "risk_reviewed_by": admin.get("admin_id"),
            "risk_review_action": action,
            "risk_review_note": data.get("note", ""),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    # Log event
    from routes.order_routes import log_order_event
    await log_order_event(
        order_id, "risk_review", f"Order {action}d by Admin",
        f"Risk review: {action}. Note: {data.get('note', 'N/A')}",
        actor_type="admin", actor_id=admin.get("admin_id"), actor_name=admin.get("name")
    )

    if action == "cancel":
        # Restore stock
        for item in order.get("items", []):
            await db.products.update_one(
                {"product_id": item["product_id"]},
                {"$inc": {"stock": item["quantity"]}}
            )

    return {"message": f"Order {action}d successfully", "new_status": new_status}


# ============== PIN CODE VALIDATION ==============

# Indian PIN code prefix → state mapping (first 2 digits)
PIN_STATE_MAP = {
    "11": "Delhi", "12": "Haryana", "13": "Haryana", "14": "Punjab", "15": "Punjab",
    "16": "Punjab", "17": "Himachal Pradesh", "18": "Jammu & Kashmir", "19": "Jammu & Kashmir",
    "20": "Uttar Pradesh", "21": "Uttar Pradesh", "22": "Uttar Pradesh", "23": "Uttar Pradesh",
    "24": "Uttar Pradesh", "25": "Uttar Pradesh", "26": "Uttarakhand", "27": "Uttar Pradesh",
    "28": "Uttar Pradesh", "30": "Rajasthan", "31": "Rajasthan", "32": "Rajasthan",
    "33": "Rajasthan", "34": "Rajasthan", "36": "Gujarat", "37": "Gujarat",
    "38": "Gujarat", "39": "Gujarat", "40": "Maharashtra", "41": "Maharashtra",
    "42": "Maharashtra", "43": "Maharashtra", "44": "Maharashtra", "45": "Madhya Pradesh",
    "46": "Madhya Pradesh", "47": "Madhya Pradesh", "48": "Madhya Pradesh", "49": "Chhattisgarh",
    "50": "Telangana", "51": "Telangana", "52": "Andhra Pradesh", "53": "Andhra Pradesh",
    "56": "Karnataka", "57": "Karnataka", "58": "Karnataka", "59": "Karnataka",
    "60": "Tamil Nadu", "61": "Tamil Nadu", "62": "Tamil Nadu", "63": "Tamil Nadu",
    "64": "Tamil Nadu", "67": "Kerala", "68": "Kerala", "69": "Kerala",
    "70": "West Bengal", "71": "West Bengal", "72": "West Bengal", "73": "West Bengal",
    "74": "West Bengal", "75": "Odisha", "76": "Odisha", "77": "Odisha",
    "78": "Assam", "79": "Assam", "80": "Bihar", "81": "Bihar", "82": "Bihar",
    "83": "Bihar", "84": "Jharkhand", "85": "Jharkhand",
    "90": "Manipur", "91": "Mizoram", "92": "Meghalaya", "93": "Nagaland",
    "94": "Tripura", "95": "Arunachal Pradesh", "96": "Sikkim",
    "10": "Delhi", "35": "Gujarat",
}

# More specific 3-digit → city mapping for major cities
PIN_CITY_MAP = {
    "110": ("New Delhi", "Delhi"),
    "120": ("Gurgaon", "Haryana"), "121": ("Faridabad", "Haryana"), "122": ("Gurgaon", "Haryana"),
    "124": ("Rohtak", "Haryana"), "125": ("Hisar", "Haryana"),
    "131": ("Sonipat", "Haryana"), "132": ("Panipat", "Haryana"), "133": ("Ambala", "Haryana"),
    "134": ("Panchkula", "Haryana"), "135": ("Yamunanagar", "Haryana"),
    "140": ("Ludhiana", "Punjab"), "141": ("Ludhiana", "Punjab"),
    "142": ("Moga", "Punjab"), "143": ("Amritsar", "Punjab"), "144": ("Jalandhar", "Punjab"),
    "147": ("Patiala", "Punjab"), "148": ("Sangrur", "Punjab"),
    "150": ("Chandigarh", "Punjab"), "160": ("Chandigarh", "Chandigarh"),
    "171": ("Shimla", "Himachal Pradesh"), "176": ("Dharamshala", "Himachal Pradesh"),
    "180": ("Jammu", "Jammu & Kashmir"), "190": ("Srinagar", "Jammu & Kashmir"),
    "201": ("Ghaziabad", "Uttar Pradesh"), "202": ("Aligarh", "Uttar Pradesh"),
    "208": ("Kanpur", "Uttar Pradesh"), "211": ("Allahabad", "Uttar Pradesh"),
    "221": ("Varanasi", "Uttar Pradesh"), "226": ("Lucknow", "Uttar Pradesh"),
    "227": ("Lucknow", "Uttar Pradesh"), "228": ("Sultanpur", "Uttar Pradesh"),
    "231": ("Mirzapur", "Uttar Pradesh"), "241": ("Bareilly", "Uttar Pradesh"),
    "248": ("Dehradun", "Uttarakhand"), "249": ("Haridwar", "Uttarakhand"),
    "250": ("Meerut", "Uttar Pradesh"), "282": ("Agra", "Uttar Pradesh"),
    "301": ("Alwar", "Rajasthan"), "302": ("Jaipur", "Rajasthan"),
    "303": ("Jaipur", "Rajasthan"), "305": ("Ajmer", "Rajasthan"),
    "311": ("Bhilwara", "Rajasthan"), "312": ("Chittorgarh", "Rajasthan"),
    "313": ("Udaipur", "Rajasthan"), "321": ("Bharatpur", "Rajasthan"),
    "324": ("Kota", "Rajasthan"), "342": ("Jodhpur", "Rajasthan"),
    "360": ("Rajkot", "Gujarat"), "361": ("Jamnagar", "Gujarat"),
    "370": ("Kutch", "Gujarat"), "380": ("Ahmedabad", "Gujarat"),
    "382": ("Gandhinagar", "Gujarat"), "390": ("Vadodara", "Gujarat"),
    "395": ("Surat", "Gujarat"), "396": ("Navsari", "Gujarat"),
    "400": ("Mumbai", "Maharashtra"), "401": ("Thane", "Maharashtra"),
    "410": ("Pune", "Maharashtra"), "411": ("Pune", "Maharashtra"),
    "412": ("Pune", "Maharashtra"), "413": ("Solapur", "Maharashtra"),
    "416": ("Kolhapur", "Maharashtra"), "421": ("Thane", "Maharashtra"),
    "422": ("Nashik", "Maharashtra"), "431": ("Aurangabad", "Maharashtra"),
    "440": ("Nagpur", "Maharashtra"), "441": ("Nagpur", "Maharashtra"),
    "452": ("Indore", "Madhya Pradesh"), "462": ("Bhopal", "Madhya Pradesh"),
    "474": ("Gwalior", "Madhya Pradesh"), "482": ("Jabalpur", "Madhya Pradesh"),
    "491": ("Durg", "Chhattisgarh"), "492": ("Raipur", "Chhattisgarh"),
    "500": ("Hyderabad", "Telangana"), "501": ("Hyderabad", "Telangana"),
    "502": ("Medak", "Telangana"), "520": ("Vijayawada", "Andhra Pradesh"),
    "530": ("Visakhapatnam", "Andhra Pradesh"), "560": ("Bangalore", "Karnataka"),
    "561": ("Bangalore Rural", "Karnataka"), "570": ("Mysore", "Karnataka"),
    "575": ("Mangalore", "Karnataka"), "580": ("Hubli", "Karnataka"),
    "590": ("Belgaum", "Karnataka"),
    "600": ("Chennai", "Tamil Nadu"), "601": ("Chennai", "Tamil Nadu"),
    "620": ("Trichy", "Tamil Nadu"), "625": ("Madurai", "Tamil Nadu"),
    "636": ("Salem", "Tamil Nadu"), "641": ("Coimbatore", "Tamil Nadu"),
    "670": ("Kannur", "Kerala"), "673": ("Kozhikode", "Kerala"),
    "680": ("Thrissur", "Kerala"), "682": ("Kochi", "Kerala"),
    "689": ("Pathanamthitta", "Kerala"), "695": ("Thiruvananthapuram", "Kerala"),
    "700": ("Kolkata", "West Bengal"), "711": ("Howrah", "West Bengal"),
    "712": ("Hooghly", "West Bengal"), "713": ("Durgapur", "West Bengal"),
    "734": ("Siliguri", "West Bengal"), "751": ("Bhubaneswar", "Odisha"),
    "753": ("Cuttack", "Odisha"), "781": ("Guwahati", "Assam"),
    "800": ("Patna", "Bihar"), "801": ("Patna", "Bihar"),
    "831": ("Jamshedpur", "Jharkhand"), "834": ("Ranchi", "Jharkhand"),
}


@router.get("/validate-pincode/{pincode}")
async def validate_pincode(pincode: str):
    """Validate Indian PIN code and return city/state"""
    pincode = pincode.strip()
    if len(pincode) != 6 or not pincode.isdigit():
        raise HTTPException(status_code=400, detail="Invalid PIN code. Must be 6 digits.")

    first_digit = pincode[0]
    if first_digit == "0":
        raise HTTPException(status_code=400, detail="Invalid PIN code")

    prefix3 = pincode[:3]
    prefix2 = pincode[:2]

    # Try 3-digit city match first
    if prefix3 in PIN_CITY_MAP:
        city, state = PIN_CITY_MAP[prefix3]
        return {"valid": True, "pincode": pincode, "city": city, "state": state}

    # Fall back to 2-digit state match
    if prefix2 in PIN_STATE_MAP:
        state = PIN_STATE_MAP[prefix2]
        return {"valid": True, "pincode": pincode, "city": "", "state": state}

    raise HTTPException(status_code=400, detail="PIN code not serviceable")


# ============== COD ELIGIBILITY CHECK ==============

@router.get("/cod-eligibility")
async def check_cod_eligibility(user: Dict = Depends(get_current_user)):
    """Check if user is eligible for COD"""
    settings = await get_checkout_settings()

    if not settings["cod_enabled"]:
        return {"eligible": False, "reason": "COD is currently disabled"}

    # Check pending COD order count
    pending_cod = await db.orders.count_documents({
        "user_id": user["user_id"],
        "payment_method": "cod",
        "status": {"$in": ["pending", "confirmed", "processing", "shipped", "cod_confirmed"]}
    })

    max_cod = settings.get("max_cod_per_user", 3)
    if pending_cod >= max_cod:
        return {
            "eligible": False,
            "reason": f"You have {pending_cod} pending COD orders. Maximum {max_cod} allowed.",
            "pending_count": pending_cod
        }

    # Check if user has cancelled COD orders (fraud signal)
    cancelled_cod = await db.orders.count_documents({
        "user_id": user["user_id"],
        "payment_method": "cod",
        "status": "cancelled"
    })

    if settings.get("block_repeat_fake_users") and cancelled_cod >= 3:
        return {
            "eligible": False,
            "reason": "COD is not available for your account due to previous order history"
        }

    return {
        "eligible": True,
        "pending_cod_orders": pending_cod,
        "max_allowed": max_cod
    }
