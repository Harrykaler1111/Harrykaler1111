from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import hashlib
import hmac
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import httpx
import razorpay

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Razorpay client (use test keys if not provided)
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_placeholder')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', 'placeholder_secret')

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'pigma-super-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Create the main app
app = FastAPI(title="Pigma E-commerce API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== PYDANTIC MODELS ==============

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: str = "customer"
    created_at: str
    avatar: Optional[str] = None

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp: str

# Product Models
class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    compare_price: Optional[float] = None
    category: str
    sizes: List[str] = []
    colors: List[str] = []
    images: List[str] = []
    stock: int = 0
    is_limited_edition: bool = False
    drop_date: Optional[str] = None
    tags: List[str] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    compare_price: Optional[float] = None
    category: Optional[str] = None
    sizes: Optional[List[str]] = None
    colors: Optional[List[str]] = None
    images: Optional[List[str]] = None
    stock: Optional[int] = None
    is_limited_edition: Optional[bool] = None
    drop_date: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None

class ProductResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str
    name: str
    description: str
    price: float
    compare_price: Optional[float] = None
    category: str
    sizes: List[str]
    colors: List[str]
    images: List[str]
    stock: int
    is_limited_edition: bool
    drop_date: Optional[str] = None
    tags: List[str]
    is_active: bool
    created_at: str

# Cart Models
class CartItem(BaseModel):
    product_id: str
    quantity: int = 1
    size: str
    color: str

class CartResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    cart_id: str
    user_id: str
    items: List[Dict]
    total: float
    updated_at: str

# Order Models
class OrderCreate(BaseModel):
    shipping_address: Dict
    payment_method: str = "razorpay"
    coupon_code: Optional[str] = None

class OrderResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    order_id: str
    user_id: str
    items: List[Dict]
    subtotal: float
    discount: float
    total: float
    status: str
    shipping_address: Dict
    payment_status: str
    razorpay_order_id: Optional[str] = None
    created_at: str

# Wishlist Models
class WishlistItem(BaseModel):
    product_id: str

# Influencer Models
class InfluencerCreate(BaseModel):
    bio: str
    instagram_handle: Optional[str] = None
    youtube_channel: Optional[str] = None
    snapchat_handle: Optional[str] = None
    facebook_page: Optional[str] = None
    followers_count: int = 0
    niche: List[str] = []

class InfluencerResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    influencer_id: str
    user_id: str
    name: str
    email: str
    bio: str
    instagram_handle: Optional[str] = None
    youtube_channel: Optional[str] = None
    snapchat_handle: Optional[str] = None
    facebook_page: Optional[str] = None
    followers_count: int
    niche: List[str]
    status: str
    referral_code: str
    total_clicks: int
    total_conversions: int
    total_earnings: float
    created_at: str

# Affiliate Models
class AffiliateCreate(BaseModel):
    company_name: Optional[str] = None
    website: Optional[str] = None
    marketing_channels: List[str] = []

class AffiliateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    affiliate_id: str
    user_id: str
    name: str
    email: str
    company_name: Optional[str] = None
    website: Optional[str] = None
    marketing_channels: List[str]
    status: str
    referral_code: str
    commission_rate: float
    total_clicks: int
    total_conversions: int
    total_earnings: float
    created_at: str

# Coupon Models
class CouponCreate(BaseModel):
    code: str
    discount_type: str = "percentage"  # percentage or fixed
    discount_value: float
    min_order_value: float = 0
    max_uses: int = 100
    expires_at: Optional[str] = None
    affiliate_id: Optional[str] = None

class CouponResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    coupon_id: str
    code: str
    discount_type: str
    discount_value: float
    min_order_value: float
    max_uses: int
    used_count: int
    expires_at: Optional[str]
    affiliate_id: Optional[str]
    is_active: bool
    created_at: str

# Chat Models
class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

# ============== HELPER FUNCTIONS ==============

def generate_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_jwt_token(user_id: str, role: str = "customer") -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing")
    token = authorization.split(" ")[1]
    payload = decode_jwt_token(token)
    user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split(" ")[1]
        payload = decode_jwt_token(token)
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        return user
    except:
        return None

def generate_referral_code(name: str) -> str:
    base = name.upper().replace(" ", "")[:4]
    return f"{base}{uuid.uuid4().hex[:6].upper()}"

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=Dict)
async def register_user(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = generate_id("user_")
    user_doc = {
        "user_id": user_id,
        "email": user.email,
        "name": user.name,
        "phone": user.phone,
        "password": hash_password(user.password),
        "role": "customer",
        "avatar": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create empty cart for user
    await db.carts.insert_one({
        "cart_id": generate_id("cart_"),
        "user_id": user_id,
        "items": [],
        "updated_at": datetime.now(timezone.utc).isoformat()
    })
    
    token = create_jwt_token(user_id, "customer")
    return {
        "token": token,
        "user": UserResponse(**{k: v for k, v in user_doc.items() if k != "password"}).model_dump()
    }

@api_router.post("/auth/login", response_model=Dict)
async def login_user(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_jwt_token(user["user_id"], user["role"])
    return {
        "token": token,
        "user": UserResponse(**{k: v for k, v in user.items() if k != "password"}).model_dump()
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(user: Dict = Depends(get_current_user)):
    return UserResponse(**{k: v for k, v in user.items() if k != "password"})

@api_router.post("/auth/google/callback", response_model=Dict)
async def google_auth_callback(session_id: str):
    """Exchange session_id for user data from Emergent Auth"""
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            data = response.json()
            email = data["email"]
            name = data["name"]
            picture = data.get("picture")
            
            # Check if user exists
            user = await db.users.find_one({"email": email}, {"_id": 0})
            if user:
                # Update user info
                await db.users.update_one(
                    {"email": email},
                    {"$set": {"name": name, "avatar": picture, "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                user = await db.users.find_one({"email": email}, {"_id": 0})
            else:
                # Create new user
                user_id = generate_id("user_")
                user = {
                    "user_id": user_id,
                    "email": email,
                    "name": name,
                    "phone": None,
                    "password": None,  # Google auth users don't have password
                    "role": "customer",
                    "avatar": picture,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.users.insert_one(user)
                
                # Create empty cart
                await db.carts.insert_one({
                    "cart_id": generate_id("cart_"),
                    "user_id": user_id,
                    "items": [],
                    "updated_at": datetime.now(timezone.utc).isoformat()
                })
            
            token = create_jwt_token(user["user_id"], user["role"])
            return {
                "token": token,
                "user": UserResponse(**{k: v for k, v in user.items() if k != "password"}).model_dump()
            }
    except httpx.HTTPError as e:
        logger.error(f"Google auth error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@api_router.post("/auth/otp/send")
async def send_otp(request: OTPRequest):
    """Send OTP to phone number (MOCKED for demo)"""
    otp = str(uuid.uuid4().int)[:6]
    await db.otp_verifications.update_one(
        {"phone": request.phone},
        {"$set": {
            "phone": request.phone,
            "otp": otp,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        }},
        upsert=True
    )
    # In production, integrate Twilio to send actual SMS
    logger.info(f"OTP for {request.phone}: {otp}")
    return {"message": "OTP sent successfully", "demo_otp": otp}  # Remove demo_otp in production

@api_router.post("/auth/otp/verify", response_model=Dict)
async def verify_otp(request: OTPVerify):
    """Verify OTP and create/login user"""
    verification = await db.otp_verifications.find_one({"phone": request.phone}, {"_id": 0})
    if not verification or verification["otp"] != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    expires_at = datetime.fromisoformat(verification["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
    
    # Check if user with phone exists
    user = await db.users.find_one({"phone": request.phone}, {"_id": 0})
    if not user:
        # Create new user
        user_id = generate_id("user_")
        user = {
            "user_id": user_id,
            "email": f"{request.phone}@phone.pigma.com",
            "name": f"User {request.phone[-4:]}",
            "phone": request.phone,
            "password": None,
            "role": "customer",
            "avatar": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
        
        # Create empty cart
        await db.carts.insert_one({
            "cart_id": generate_id("cart_"),
            "user_id": user_id,
            "items": [],
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Delete used OTP
    await db.otp_verifications.delete_one({"phone": request.phone})
    
    token = create_jwt_token(user["user_id"], user["role"])
    return {
        "token": token,
        "user": UserResponse(**{k: v for k, v in user.items() if k != "password"}).model_dump()
    }

# ============== PRODUCT ROUTES ==============

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(
    category: Optional[str] = None,
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

@api_router.get("/products/featured", response_model=List[ProductResponse])
async def get_featured_products(limit: int = 8):
    products = await db.products.find(
        {"is_active": True, "is_limited_edition": True},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return [ProductResponse(**p) for p in products]

@api_router.get("/products/new-arrivals", response_model=List[ProductResponse])
async def get_new_arrivals(limit: int = 8):
    products = await db.products.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return [ProductResponse(**p) for p in products]

@api_router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    product = await db.products.find_one({"product_id": product_id, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductResponse(**product)

@api_router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, user: Dict = Depends(get_current_user)):
    if user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
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

@api_router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product: ProductUpdate, user: Dict = Depends(get_current_user)):
    if user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = {k: v for k, v in product.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.products.update_one({"product_id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    updated = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    return ProductResponse(**updated)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: Dict = Depends(get_current_user)):
    if user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ============== CART ROUTES ==============

@api_router.get("/cart", response_model=CartResponse)
async def get_cart(user: Dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not cart:
        cart = {
            "cart_id": generate_id("cart_"),
            "user_id": user["user_id"],
            "items": [],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.carts.insert_one(cart)
    
    # Calculate total
    total = 0
    for item in cart["items"]:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if product:
            item["product"] = product
            total += product["price"] * item["quantity"]
    
    cart["total"] = total
    return CartResponse(**cart)

@api_router.post("/cart/add", response_model=CartResponse)
async def add_to_cart(item: CartItem, user: Dict = Depends(get_current_user)):
    # Check product exists
    product = await db.products.find_one({"product_id": item.product_id, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check stock
    if product["stock"] < item.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    cart = await db.carts.find_one({"user_id": user["user_id"]})
    if not cart:
        cart = {
            "cart_id": generate_id("cart_"),
            "user_id": user["user_id"],
            "items": [],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.carts.insert_one(cart)
    
    # Check if item already in cart
    item_exists = False
    for existing_item in cart["items"]:
        if (existing_item["product_id"] == item.product_id and 
            existing_item["size"] == item.size and 
            existing_item["color"] == item.color):
            existing_item["quantity"] += item.quantity
            item_exists = True
            break
    
    if not item_exists:
        cart["items"].append(item.model_dump())
    
    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": cart["items"], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return await get_cart(user)

@api_router.put("/cart/update", response_model=CartResponse)
async def update_cart_item(item: CartItem, user: Dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["user_id"]})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    for existing_item in cart["items"]:
        if (existing_item["product_id"] == item.product_id and 
            existing_item["size"] == item.size and 
            existing_item["color"] == item.color):
            if item.quantity <= 0:
                cart["items"].remove(existing_item)
            else:
                existing_item["quantity"] = item.quantity
            break
    
    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": cart["items"], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return await get_cart(user)

@api_router.delete("/cart/item/{product_id}")
async def remove_from_cart(product_id: str, size: str, color: str, user: Dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["user_id"]})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    cart["items"] = [
        item for item in cart["items"]
        if not (item["product_id"] == product_id and item["size"] == size and item["color"] == color)
    ]
    
    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": cart["items"], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Item removed from cart"}

@api_router.delete("/cart/clear")
async def clear_cart(user: Dict = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Cart cleared"}

# ============== WISHLIST ROUTES ==============

@api_router.get("/wishlist", response_model=List[ProductResponse])
async def get_wishlist(user: Dict = Depends(get_current_user)):
    wishlist = await db.wishlists.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not wishlist:
        return []
    
    products = []
    for product_id in wishlist.get("product_ids", []):
        product = await db.products.find_one({"product_id": product_id, "is_active": True}, {"_id": 0})
        if product:
            products.append(ProductResponse(**product))
    
    return products

@api_router.post("/wishlist/add")
async def add_to_wishlist(item: WishlistItem, user: Dict = Depends(get_current_user)):
    # Check product exists
    product = await db.products.find_one({"product_id": item.product_id, "is_active": True})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.wishlists.update_one(
        {"user_id": user["user_id"]},
        {"$addToSet": {"product_ids": item.product_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"message": "Added to wishlist"}

@api_router.delete("/wishlist/{product_id}")
async def remove_from_wishlist(product_id: str, user: Dict = Depends(get_current_user)):
    await db.wishlists.update_one(
        {"user_id": user["user_id"]},
        {"$pull": {"product_ids": product_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Removed from wishlist"}

# ============== ORDER ROUTES ==============

@api_router.post("/orders", response_model=OrderResponse)
async def create_order(order: OrderCreate, user: Dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not cart or not cart["items"]:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Calculate order totals
    items = []
    subtotal = 0
    for item in cart["items"]:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if not product:
            continue
        if product["stock"] < item["quantity"]:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product['name']}")
        
        item_total = product["price"] * item["quantity"]
        subtotal += item_total
        items.append({
            **item,
            "product_name": product["name"],
            "product_image": product["images"][0] if product["images"] else None,
            "price": product["price"],
            "item_total": item_total
        })
    
    # Apply coupon discount
    discount = 0
    affiliate_id = None
    if order.coupon_code:
        coupon = await db.coupons.find_one({"code": order.coupon_code.upper(), "is_active": True}, {"_id": 0})
        if coupon:
            if coupon["discount_type"] == "percentage":
                discount = subtotal * (coupon["discount_value"] / 100)
            else:
                discount = coupon["discount_value"]
            affiliate_id = coupon.get("affiliate_id")
            
            # Update coupon usage
            await db.coupons.update_one(
                {"code": order.coupon_code.upper()},
                {"$inc": {"used_count": 1}}
            )
    
    total = subtotal - discount
    order_id = generate_id("order_")
    
    # Create Razorpay order (MOCKED for demo)
    razorpay_order_id = f"order_{uuid.uuid4().hex[:16]}"
    
    order_doc = {
        "order_id": order_id,
        "user_id": user["user_id"],
        "items": items,
        "subtotal": subtotal,
        "discount": discount,
        "total": total,
        "status": "pending",
        "shipping_address": order.shipping_address,
        "payment_method": order.payment_method,
        "payment_status": "pending",
        "razorpay_order_id": razorpay_order_id,
        "coupon_code": order.coupon_code,
        "affiliate_id": affiliate_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order_doc)
    
    # Update product stock
    for item in items:
        await db.products.update_one(
            {"product_id": item["product_id"]},
            {"$inc": {"stock": -item["quantity"]}}
        )
    
    # Clear cart
    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return OrderResponse(**order_doc)

@api_router.get("/orders", response_model=List[OrderResponse])
async def get_orders(user: Dict = Depends(get_current_user), skip: int = 0, limit: int = 20):
    orders = await db.orders.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [OrderResponse(**o) for o in orders]

@api_router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, user: Dict = Depends(get_current_user)):
    order = await db.orders.find_one(
        {"order_id": order_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderResponse(**order)

@api_router.post("/orders/{order_id}/payment/verify")
async def verify_payment(order_id: str, razorpay_payment_id: str, razorpay_signature: str, user: Dict = Depends(get_current_user)):
    """Verify Razorpay payment (MOCKED for demo)"""
    order = await db.orders.find_one({"order_id": order_id, "user_id": user["user_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # In production, verify signature with Razorpay
    # For demo, we'll mark as paid
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "payment_status": "paid",
            "razorpay_payment_id": razorpay_payment_id,
            "status": "confirmed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Credit affiliate commission if applicable
    if order.get("affiliate_id"):
        affiliate = await db.affiliates.find_one({"affiliate_id": order["affiliate_id"]}, {"_id": 0})
        if affiliate:
            commission = order["total"] * (affiliate["commission_rate"] / 100)
            await db.affiliates.update_one(
                {"affiliate_id": order["affiliate_id"]},
                {"$inc": {"total_earnings": commission, "total_conversions": 1}}
            )
    
    return {"message": "Payment verified", "status": "paid"}

# ============== INFLUENCER ROUTES ==============

@api_router.post("/influencers/apply", response_model=InfluencerResponse)
async def apply_as_influencer(data: InfluencerCreate, user: Dict = Depends(get_current_user)):
    # Check if already an influencer
    existing = await db.influencers.find_one({"user_id": user["user_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already registered as influencer")
    
    influencer_id = generate_id("inf_")
    referral_code = generate_referral_code(user["name"])
    
    influencer_doc = {
        "influencer_id": influencer_id,
        "user_id": user["user_id"],
        "name": user["name"],
        "email": user["email"],
        **data.model_dump(),
        "status": "pending",
        "referral_code": referral_code,
        "total_clicks": 0,
        "total_conversions": 0,
        "total_earnings": 0.0,
        "commission_rate": 10.0,  # Default 10%
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.influencers.insert_one(influencer_doc)
    
    # Don't change admin role when applying as influencer
    if user["role"] != "admin":
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"role": "influencer", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return InfluencerResponse(**influencer_doc)

@api_router.get("/influencers/me", response_model=InfluencerResponse)
async def get_my_influencer_profile(user: Dict = Depends(get_current_user)):
    influencer = await db.influencers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Not registered as influencer")
    return InfluencerResponse(**influencer)

@api_router.get("/influencers/leaderboard", response_model=List[InfluencerResponse])
async def get_influencer_leaderboard(limit: int = 10):
    influencers = await db.influencers.find(
        {"status": "approved"},
        {"_id": 0}
    ).sort("total_earnings", -1).limit(limit).to_list(limit)
    return [InfluencerResponse(**i) for i in influencers]

@api_router.get("/influencers", response_model=List[InfluencerResponse])
async def get_all_influencers(status: Optional[str] = None, user: Dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if status:
        query["status"] = status
    
    influencers = await db.influencers.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [InfluencerResponse(**i) for i in influencers]

@api_router.put("/influencers/{influencer_id}/status")
async def update_influencer_status(influencer_id: str, status: str, user: Dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if status not in ["pending", "approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.influencers.update_one(
        {"influencer_id": influencer_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    return {"message": f"Influencer status updated to {status}"}

@api_router.get("/track/click/{referral_code}")
async def track_referral_click(referral_code: str):
    """Track clicks from influencer/affiliate referral links"""
    # Check influencer
    influencer = await db.influencers.find_one({"referral_code": referral_code})
    if influencer:
        await db.influencers.update_one(
            {"referral_code": referral_code},
            {"$inc": {"total_clicks": 1}}
        )
        return {"type": "influencer", "code": referral_code}
    
    # Check affiliate
    affiliate = await db.affiliates.find_one({"referral_code": referral_code})
    if affiliate:
        await db.affiliates.update_one(
            {"referral_code": referral_code},
            {"$inc": {"total_clicks": 1}}
        )
        return {"type": "affiliate", "code": referral_code}
    
    raise HTTPException(status_code=404, detail="Invalid referral code")

# ============== AFFILIATE ROUTES ==============

@api_router.post("/affiliates/apply", response_model=AffiliateResponse)
async def apply_as_affiliate(data: AffiliateCreate, user: Dict = Depends(get_current_user)):
    existing = await db.affiliates.find_one({"user_id": user["user_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already registered as affiliate")
    
    affiliate_id = generate_id("aff_")
    referral_code = generate_referral_code(user["name"])
    
    affiliate_doc = {
        "affiliate_id": affiliate_id,
        "user_id": user["user_id"],
        "name": user["name"],
        "email": user["email"],
        **data.model_dump(),
        "status": "pending",
        "referral_code": referral_code,
        "commission_rate": 5.0,  # Default 5%
        "total_clicks": 0,
        "total_conversions": 0,
        "total_earnings": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.affiliates.insert_one(affiliate_doc)
    
    return AffiliateResponse(**affiliate_doc)

@api_router.get("/affiliates/me", response_model=AffiliateResponse)
async def get_my_affiliate_profile(user: Dict = Depends(get_current_user)):
    affiliate = await db.affiliates.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Not registered as affiliate")
    return AffiliateResponse(**affiliate)

@api_router.get("/affiliates", response_model=List[AffiliateResponse])
async def get_all_affiliates(status: Optional[str] = None, user: Dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if status:
        query["status"] = status
    
    affiliates = await db.affiliates.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [AffiliateResponse(**a) for a in affiliates]

@api_router.put("/affiliates/{affiliate_id}/status")
async def update_affiliate_status(affiliate_id: str, status: str, user: Dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.affiliates.update_one(
        {"affiliate_id": affiliate_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    
    return {"message": f"Affiliate status updated to {status}"}

@api_router.put("/affiliates/{affiliate_id}/commission")
async def update_affiliate_commission(affiliate_id: str, commission_rate: float, user: Dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.affiliates.update_one(
        {"affiliate_id": affiliate_id},
        {"$set": {"commission_rate": commission_rate, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    
    return {"message": f"Commission rate updated to {commission_rate}%"}

# ============== COUPON ROUTES ==============

@api_router.post("/coupons", response_model=CouponResponse)
async def create_coupon(coupon: CouponCreate, user: Dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.coupons.find_one({"code": coupon.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    coupon_id = generate_id("coupon_")
    coupon_doc = {
        "coupon_id": coupon_id,
        "code": coupon.code.upper(),
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "min_order_value": coupon.min_order_value,
        "max_uses": coupon.max_uses,
        "used_count": 0,
        "expires_at": coupon.expires_at,
        "affiliate_id": coupon.affiliate_id,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.coupons.insert_one(coupon_doc)
    return CouponResponse(**coupon_doc)

@api_router.get("/coupons", response_model=List[CouponResponse])
async def get_coupons(user: Dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    coupons = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [CouponResponse(**c) for c in coupons]

@api_router.post("/coupons/validate")
async def validate_coupon(code: str, subtotal: float):
    coupon = await db.coupons.find_one({"code": code.upper(), "is_active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    
    if coupon["used_count"] >= coupon["max_uses"]:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    
    if coupon["min_order_value"] > subtotal:
        raise HTTPException(status_code=400, detail=f"Minimum order value is {coupon['min_order_value']}")
    
    if coupon["expires_at"]:
        expires_at = datetime.fromisoformat(coupon["expires_at"])
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Coupon has expired")
    
    discount = 0
    if coupon["discount_type"] == "percentage":
        discount = subtotal * (coupon["discount_value"] / 100)
    else:
        discount = coupon["discount_value"]
    
    return {"valid": True, "discount": discount, "coupon": coupon}

# ============== ADMIN ROUTES ==============

@api_router.get("/admin/dashboard")
async def get_admin_dashboard(user: Dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get counts
    total_products = await db.products.count_documents({"is_active": True})
    total_orders = await db.orders.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})
    total_influencers = await db.influencers.count_documents({})
    total_affiliates = await db.affiliates.count_documents({})
    pending_influencers = await db.influencers.count_documents({"status": "pending"})
    pending_affiliates = await db.affiliates.count_documents({"status": "pending"})
    
    # Calculate revenue
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Recent orders
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    # Low stock products
    low_stock = await db.products.find(
        {"stock": {"$lt": 10}, "is_active": True},
        {"_id": 0}
    ).limit(5).to_list(5)
    
    return {
        "stats": {
            "total_products": total_products,
            "total_orders": total_orders,
            "total_customers": total_customers,
            "total_influencers": total_influencers,
            "total_affiliates": total_affiliates,
            "pending_influencers": pending_influencers,
            "pending_affiliates": pending_affiliates,
            "total_revenue": total_revenue
        },
        "recent_orders": recent_orders,
        "low_stock_products": low_stock
    }

@api_router.get("/admin/orders", response_model=List[OrderResponse])
async def get_all_orders(
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: Dict = Depends(get_current_user)
):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if status:
        query["status"] = status
    if payment_status:
        query["payment_status"] = payment_status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [OrderResponse(**o) for o in orders]

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, user: Dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    valid_statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": f"Order status updated to {status}"}

@api_router.get("/admin/customers")
async def get_customers(skip: int = 0, limit: int = 50, user: Dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    customers = await db.users.find(
        {"role": "customer"},
        {"_id": 0, "password": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return customers

# ============== AI CHATBOT ROUTES ==============

@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(message: ChatMessage, user: Optional[Dict] = Depends(get_optional_user)):
    """AI Chatbot for customer support (MOCKED for demo - integrate with GPT-5.2 in production)"""
    session_id = message.session_id or generate_id("chat_")
    
    # Store message in chat history
    await db.chat_history.insert_one({
        "session_id": session_id,
        "user_id": user["user_id"] if user else None,
        "role": "user",
        "content": message.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # MOCKED AI response - In production, use emergentintegrations with GPT-5.2
    responses = {
        "shipping": "We offer free shipping on orders over Rs. 2999! Standard delivery takes 5-7 business days.",
        "return": "You can return unworn items within 14 days of delivery for a full refund.",
        "size": "Our boots run true to size. Check our size guide for detailed measurements.",
        "payment": "We accept all major credit cards, UPI, and net banking through Razorpay.",
        "default": "Thank you for reaching out to Pigma! How can I help you with your luxury boot shopping experience today?"
    }
    
    response_text = responses["default"]
    msg_lower = message.message.lower()
    for key, value in responses.items():
        if key in msg_lower:
            response_text = value
            break
    
    # Store AI response
    await db.chat_history.insert_one({
        "session_id": session_id,
        "user_id": user["user_id"] if user else None,
        "role": "assistant",
        "content": response_text,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return ChatResponse(response=response_text, session_id=session_id)

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    messages = await db.chat_history.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return messages

# ============== CATEGORIES ROUTES ==============

@api_router.get("/categories")
async def get_categories():
    categories = await db.products.distinct("category")
    return categories

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "Pigma API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.products.create_index("product_id", unique=True)
    await db.orders.create_index("order_id", unique=True)
    await db.influencers.create_index("referral_code", unique=True)
    await db.affiliates.create_index("referral_code", unique=True)
    await db.coupons.create_index("code", unique=True)
    
    # Seed admin user if not exists
    admin = await db.users.find_one({"email": "admin@pigma.com"})
    if not admin:
        await db.users.insert_one({
            "user_id": generate_id("user_"),
            "email": "admin@pigma.com",
            "name": "Pigma Admin",
            "phone": None,
            "password": hash_password("admin123"),
            "role": "admin",
            "avatar": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Admin user created: admin@pigma.com / admin123")
    
    # Seed sample products if empty
    product_count = await db.products.count_documents({})
    if product_count == 0:
        sample_products = [
            {
                "product_id": generate_id("prod_"),
                "name": "Midnight Obsidian Platform Boots",
                "description": "Bold 5-inch platform boots in sleek black leather. Features chunky sole and side zipper for easy wear. Limited edition - only 50 pairs available.",
                "price": 12999,
                "compare_price": 15999,
                "category": "Platform Boots",
                "sizes": ["36", "37", "38", "39", "40", "41"],
                "colors": ["Black", "Patent Black"],
                "images": [
                    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800",
                    "https://images.unsplash.com/photo-1605733160314-4fc7dac4bb16?w=800"
                ],
                "stock": 50,
                "is_limited_edition": True,
                "drop_date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                "tags": ["platform", "limited", "black", "leather"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "product_id": generate_id("prod_"),
                "name": "Champagne Gold Stiletto Heels",
                "description": "Elegant 5-inch stiletto heels with champagne gold finish. Perfect for special occasions. Padded insole for comfort.",
                "price": 9999,
                "compare_price": 12999,
                "category": "Stiletto Heels",
                "sizes": ["35", "36", "37", "38", "39", "40"],
                "colors": ["Gold", "Rose Gold", "Silver"],
                "images": [
                    "https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?w=800",
                    "https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=800"
                ],
                "stock": 75,
                "is_limited_edition": False,
                "drop_date": None,
                "tags": ["stiletto", "gold", "elegant", "party"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "product_id": generate_id("prod_"),
                "name": "Velvet Crush Platform Boots",
                "description": "Luxurious velvet platform boots with 4-inch heel. Rich burgundy color for the bold fashionista.",
                "price": 14999,
                "compare_price": 18999,
                "category": "Platform Boots",
                "sizes": ["36", "37", "38", "39", "40"],
                "colors": ["Burgundy", "Navy", "Emerald"],
                "images": [
                    "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800"
                ],
                "stock": 30,
                "is_limited_edition": True,
                "drop_date": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
                "tags": ["platform", "velvet", "limited", "burgundy"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "product_id": generate_id("prod_"),
                "name": "Classic Black Stiletto Pumps",
                "description": "Timeless black stiletto pumps. 4-inch heel with pointed toe. Essential for every wardrobe.",
                "price": 7999,
                "compare_price": None,
                "category": "Stiletto Heels",
                "sizes": ["35", "36", "37", "38", "39", "40", "41"],
                "colors": ["Black", "Nude", "Red"],
                "images": [
                    "https://images.unsplash.com/photo-1518049362265-d5b2a6467637?w=800"
                ],
                "stock": 100,
                "is_limited_edition": False,
                "drop_date": None,
                "tags": ["stiletto", "classic", "black", "essential"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "product_id": generate_id("prod_"),
                "name": "Metallic Snake Print Boots",
                "description": "Eye-catching metallic snake print ankle boots. 5-inch block heel for stability and style.",
                "price": 11999,
                "compare_price": 14999,
                "category": "Ankle Boots",
                "sizes": ["36", "37", "38", "39", "40"],
                "colors": ["Silver Snake", "Gold Snake"],
                "images": [
                    "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800"
                ],
                "stock": 40,
                "is_limited_edition": True,
                "drop_date": None,
                "tags": ["ankle", "metallic", "snake", "statement"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "product_id": generate_id("prod_"),
                "name": "White Cloud Platform Sneakers",
                "description": "Chunky white platform sneakers with cloud-like comfort. 3-inch platform sole.",
                "price": 8999,
                "compare_price": None,
                "category": "Platform Sneakers",
                "sizes": ["36", "37", "38", "39", "40", "41"],
                "colors": ["White", "Black", "Pink"],
                "images": [
                    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800"
                ],
                "stock": 80,
                "is_limited_edition": False,
                "drop_date": None,
                "tags": ["platform", "sneakers", "casual", "white"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.products.insert_many(sample_products)
        logger.info(f"Seeded {len(sample_products)} sample products")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
