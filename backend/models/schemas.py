from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List, Optional, Dict
from .enums import AdminRole


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


class AdminUserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: AdminRole
    phone: Optional[str] = None


class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[AdminRole] = None
    is_active: Optional[bool] = None
    phone: Optional[str] = None


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    admin_id: str
    email: str
    name: str
    role: str
    phone: Optional[str] = None
    is_active: bool
    two_factor_enabled: bool
    last_login: Optional[str] = None
    created_at: str
    permissions: Dict[str, List[str]]


class AdminLogin(BaseModel):
    email: EmailStr
    password: str
    two_factor_code: Optional[str] = None


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


class WishlistItem(BaseModel):
    product_id: str


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
    wallet_balance: float = 0.0
    instagram_connected: bool = False
    instagram_user_id: Optional[str] = None
    instagram_username: Optional[str] = None
    automation_enabled: bool = False
    created_at: str


class WalletTransactionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transaction_id: str
    influencer_id: str
    type: str
    amount: float
    balance_after: float
    description: str
    order_id: Optional[str] = None
    created_at: str


class WithdrawalRequest(BaseModel):
    amount: float
    bank_account_name: str
    bank_account_number: str
    bank_ifsc: str
    bank_name: str


class WithdrawalResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    withdrawal_id: str
    influencer_id: str
    amount: float
    status: str
    bank_details: Dict
    requested_at: str
    processed_at: Optional[str] = None
    admin_note: Optional[str] = None
    payout_id: Optional[str] = None


class InstagramPostCreate(BaseModel):
    post_url: str
    post_id: str
    product_id: str
    auto_dm_enabled: bool = True
    dm_message: Optional[str] = None


class InstagramPostResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    post_record_id: str
    influencer_id: str
    post_url: str
    post_id: str
    product_id: str
    product_name: str
    auto_dm_enabled: bool
    dm_message: str
    total_comments: int
    total_dms_sent: int
    created_at: str


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


class CouponCreate(BaseModel):
    code: str
    discount_type: str = "percentage"
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


class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
