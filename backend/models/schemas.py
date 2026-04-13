from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List, Optional, Dict
from .enums import AdminRole, VendorProductStatus


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
    sku: Optional[str] = None
    sizes: List[str] = []
    colors: List[str] = []
    images: List[str] = []
    videos: List[str] = []
    stock: int = 0
    variants: List[Dict] = []
    is_limited_edition: bool = False
    drop_date: Optional[str] = None
    tags: List[str] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    compare_price: Optional[float] = None
    category: Optional[str] = None
    sku: Optional[str] = None
    sizes: Optional[List[str]] = None
    colors: Optional[List[str]] = None
    images: Optional[List[str]] = None
    videos: Optional[List[str]] = None
    stock: Optional[int] = None
    variants: Optional[List[Dict]] = None
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
    sku: Optional[str] = None
    sizes: List[str]
    colors: List[str]
    images: List[str]
    videos: List[str] = []
    stock: int
    variants: List[Dict] = []
    is_limited_edition: bool
    drop_date: Optional[str] = None
    tags: List[str]
    is_active: bool
    vendor_id: Optional[str] = None
    vendor_name: Optional[str] = None
    is_vendor_product: bool = False
    created_at: str


class CartItem(BaseModel):
    product_id: str
    quantity: int = 1
    size: str
    color: str
    reseller_id: Optional[str] = None
    price_override: Optional[float] = None


class CartResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    cart_id: str
    user_id: str
    items: List[Dict]
    total: float
    updated_at: str


class OrderCreate(BaseModel):
    shipping_address: Dict
    payment_method: str = "prepaid"  # "prepaid" or "cod"
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
    payment_method: str = "prepaid"
    payment_status: str
    razorpay_order_id: Optional[str] = None
    vendor_id: Optional[str] = None
    vendor_name: Optional[str] = None
    platform_commission: float = 0.0
    influencer_commission: float = 0.0
    vendor_amount: float = 0.0
    # COD/Prepaid fields
    cod_charge: float = 0.0
    prepaid_discount: float = 0.0
    cod_advance_amount: float = 0.0
    cod_remaining: float = 0.0
    shipping_charge: float = 0.0
    risk_level: Optional[str] = None
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
    media_id: Optional[str] = None
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
    media_id: Optional[str] = None
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
    starts_at: Optional[str] = None
    affiliate_id: Optional[str] = None
    category: Optional[str] = None
    offer_type: str = "coupon"
    description: Optional[str] = None
    vendor_id: Optional[str] = None


class CouponResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    coupon_id: str
    code: str
    discount_type: str
    discount_value: float
    min_order_value: float
    max_uses: int
    used_count: int
    expires_at: Optional[str] = None
    starts_at: Optional[str] = None
    affiliate_id: Optional[str] = None
    category: Optional[str] = None
    offer_type: str = "coupon"
    description: Optional[str] = None
    vendor_id: Optional[str] = None
    is_active: bool
    created_at: str


class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


# ==================== VENDOR SCHEMAS ====================

class VendorRegister(BaseModel):
    email: EmailStr
    password: str
    store_name: str
    owner_name: str
    phone: str
    store_description: str
    gst_number: Optional[str] = None


class VendorLogin(BaseModel):
    email: EmailStr
    password: str


class VendorKYCSubmit(BaseModel):
    pan_number: str
    aadhaar_number: str
    gst_number: Optional[str] = None
    msme_registration: Optional[str] = None
    bank_account_name: str
    bank_account_number: str
    bank_ifsc: str
    bank_name: str


class VendorProfileUpdate(BaseModel):
    store_name: Optional[str] = None
    store_description: Optional[str] = None
    phone: Optional[str] = None
    gst_number: Optional[str] = None


class VendorResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    vendor_id: str
    display_id: Optional[str] = None
    email: str
    store_name: str
    owner_name: str
    phone: str
    store_description: str
    gst_number: Optional[str] = None
    status: str
    kyc_status: str = "not_submitted"
    wallet_balance: float = 0.0
    total_sales: float = 0.0
    total_products: int = 0
    total_orders: int = 0
    rating: float = 0.0
    review_count: int = 0
    created_at: str


class VendorProductCreate(BaseModel):
    name: str
    description: str
    price: float
    compare_price: Optional[float] = None
    category: str
    sku: Optional[str] = None
    sizes: List[str] = []
    colors: List[str] = []
    images: List[str] = []
    videos: List[str] = []
    stock: int = 0
    variants: List[Dict] = []
    tags: List[str] = []
    is_limited_edition: bool = False


class VendorProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    compare_price: Optional[float] = None
    category: Optional[str] = None
    sku: Optional[str] = None
    sizes: Optional[List[str]] = None
    colors: Optional[List[str]] = None
    images: Optional[List[str]] = None
    videos: Optional[List[str]] = None
    stock: Optional[int] = None
    variants: Optional[List[Dict]] = None
    tags: Optional[List[str]] = None
    is_limited_edition: Optional[bool] = None


class VendorProductResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str
    vendor_id: str
    name: str
    description: str
    price: float
    compare_price: Optional[float] = None
    category: str
    sku: Optional[str] = None
    sizes: List[str]
    colors: List[str]
    images: List[str]
    videos: List[str] = []
    stock: int
    variants: List[Dict] = []
    tags: List[str]
    is_limited_edition: bool
    approval_status: str
    rejection_reason: Optional[str] = None
    is_active: bool
    auto_deactivated: bool = False
    total_sold: int = 0
    total_revenue: float = 0.0
    created_at: str


class VendorWalletTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transaction_id: str
    vendor_id: str
    type: str
    amount: float
    balance_after: float
    description: str
    order_id: Optional[str] = None
    created_at: str


class VendorWithdrawalRequest(BaseModel):
    amount: float


class VendorWithdrawalResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    withdrawal_id: str
    vendor_id: str
    amount: float
    status: str
    bank_details: Dict
    requested_at: str
    processed_at: Optional[str] = None
    admin_note: Optional[str] = None


class VendorOfferCreate(BaseModel):
    title: str
    offer_type: str  # percentage, flat, coupon, flash_sale
    discount_value: float
    coupon_code: Optional[str] = None
    product_ids: List[str] = []
    start_date: str
    end_date: str
    max_quantity: Optional[int] = None
    min_order_value: float = 0


class VendorOfferResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    offer_id: str
    vendor_id: str
    title: str
    offer_type: str
    discount_value: float
    coupon_code: Optional[str] = None
    product_ids: List[str]
    start_date: str
    end_date: str
    max_quantity: Optional[int] = None
    min_order_value: float
    is_active: bool
    used_count: int = 0
    created_at: str


# ==================== RESELLER SCHEMAS ====================

class ResellerRegister(BaseModel):
    bio: Optional[str] = None
    social_platforms: List[str] = []


class ResellerResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reseller_id: str
    user_id: str
    name: str
    email: str
    bio: Optional[str] = None
    social_platforms: List[str]
    status: str
    referral_code: str
    commission_rate: float
    total_clicks: int
    total_conversions: int
    total_earnings: float
    wallet_balance: float = 0.0
    created_at: str


# ==================== SUSPENSION LOG ====================

class SuspensionLogResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str
    entity_type: str
    entity_id: str
    entity_name: str
    action: str
    reason: str
    admin_id: str
    admin_name: str
    created_at: str
