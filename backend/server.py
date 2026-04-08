import sys
import os
from pathlib import Path

# Ensure backend dir is on Python path for relative imports
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import logging
from datetime import datetime, timezone, timedelta

from config import db
from auth import generate_id, hash_password
from models.enums import AdminRole

from routes.auth_routes import router as auth_router
from routes.admin_routes import router as admin_router
from routes.product_routes import router as product_router
from routes.cart_routes import router as cart_router
from routes.order_routes import router as order_router
from routes.wishlist_routes import router as wishlist_router
from routes.influencer_routes import router as influencer_router
from routes.affiliate_routes import router as affiliate_router
from routes.coupon_routes import router as coupon_router
from routes.chat_routes import router as chat_router
from routes.misc_routes import router as misc_router
from routes.vendor_routes import router as vendor_router
from routes.reseller_routes import router as reseller_router
from routes.user_control_routes import router as user_control_router
from routes.platform_settings_routes import router as settings_router
from routes.review_routes import router as review_router
from routes.collaboration_routes import router as collab_router
from routes.action_history_routes import router as action_history_router
from routes.referral_manager_routes import router as referral_manager_router
from routes.upload_routes import router as upload_router
from routes.reward_routes import router as reward_router
from routes.return_routes import router as return_router
from routes.site_settings_routes import router as site_settings_router
from routes.booster_routes import router as booster_router
from routes.category_routes import router as category_router
from routes.policy_routes import router as policy_router
from routes.checkout_settings_routes import router as checkout_settings_router
from routes.bundle_routes import router as bundle_router
from routes.notification_routes import router as notification_router
from routes.whatsapp_routes import router as whatsapp_router
from routes.support_ticket_routes import router as support_ticket_router
from routes.bulk_upload_routes import router as bulk_upload_router
from routes.dummy_review_routes import router as dummy_review_router
from routes.fomo_routes import router as fomo_router
from routes.vendor_credit_routes import router as vendor_credit_router
from routes.master_search_routes import router as master_search_router

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="Pigma E-commerce API", version="2.0.0")

# Include all routers under /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(product_router, prefix="/api")
app.include_router(cart_router, prefix="/api")
app.include_router(order_router, prefix="/api")
app.include_router(wishlist_router, prefix="/api")
app.include_router(influencer_router, prefix="/api")
app.include_router(affiliate_router, prefix="/api")
app.include_router(coupon_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(misc_router, prefix="/api")
app.include_router(vendor_router, prefix="/api")
app.include_router(reseller_router, prefix="/api")
app.include_router(user_control_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(review_router, prefix="/api")
app.include_router(collab_router, prefix="/api")
app.include_router(action_history_router, prefix="/api")
app.include_router(referral_manager_router, prefix="/api")
app.include_router(upload_router, prefix="/api")
app.include_router(reward_router, prefix="/api")
app.include_router(return_router, prefix="/api")
app.include_router(site_settings_router, prefix="/api")
app.include_router(booster_router, prefix="/api")
app.include_router(category_router, prefix="/api")
app.include_router(policy_router, prefix="/api")
app.include_router(checkout_settings_router, prefix="/api")
app.include_router(bundle_router, prefix="/api")
app.include_router(notification_router, prefix="/api")
app.include_router(whatsapp_router, prefix="/api")
app.include_router(support_ticket_router, prefix="/api")
app.include_router(bulk_upload_router, prefix="/api")
app.include_router(dummy_review_router, prefix="/api")
app.include_router(fomo_router, prefix="/api")
app.include_router(vendor_credit_router, prefix="/api")
app.include_router(master_search_router, prefix="/api")

# Serve uploaded files — only if local uploads directory exists (dev/legacy)
from config import UPLOAD_DIR
if UPLOAD_DIR.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/api/static-uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    # Initialize object storage
    try:
        from routes.upload_routes import init_storage
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Object storage init failed (uploads will init on first use): {e}")

    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.admin_users.create_index("email", unique=True)
    await db.admin_users.create_index("admin_id", unique=True)
    await db.products.create_index("product_id", unique=True)
    await db.orders.create_index("order_id", unique=True)
    await db.influencers.create_index("referral_code", unique=True)
    await db.affiliates.create_index("referral_code", unique=True)
    await db.coupons.create_index("code", unique=True)
    await db.withdrawals.create_index("withdrawal_id", unique=True)
    await db.wallet_transactions.create_index("transaction_id", unique=True)
    await db.vendors.create_index("email", unique=True)
    await db.vendors.create_index("vendor_id", unique=True)
    await db.vendor_products.create_index("product_id", unique=True)
    await db.vendor_withdrawals.create_index("withdrawal_id", unique=True)
    await db.vendor_wallet_transactions.create_index("transaction_id", unique=True)
    await db.vendor_offers.create_index("offer_id", unique=True)
    await db.platform_transactions.create_index("transaction_id", unique=True)
    await db.sales_tracking.create_index("tracking_id", unique=True)
    await db.sales_tracking.create_index("vendor_id")
    await db.resellers.create_index("user_id", unique=True)
    await db.resellers.create_index("reseller_id", unique=True)
    await db.resellers.create_index("referral_code", unique=True)
    await db.suspension_logs.create_index("entity_id")
    await db.reseller_wallet_transactions.create_index("reseller_id")
    await db.reviews.create_index("product_id")
    await db.reviews.create_index("review_id", unique=True)
    await db.collaboration_requests.create_index("request_id", unique=True)
    await db.tickets.create_index("ticket_id", unique=True)
    await db.tickets.create_index("user_id")
    await db.tickets.create_index("status")
    await db.kb_articles.create_index("article_id", unique=True)
    await db.reward_campaigns.create_index("campaign_id", unique=True)
    await db.returns.create_index("return_id", unique=True)
    await db.returns.create_index("user_id")
    await db.returns.create_index("vendor_id")
    await db.categories.create_index("category_id", unique=True)
    await db.sub_categories.create_index("sub_category_id", unique=True)
    await db.policies.create_index("policy_id", unique=True)
    await db.policies.create_index("slug", unique=True)
    await db.order_events.create_index("order_id")
    await db.checkout_settings.create_index("setting_id", unique=True)
    await db.bundles.create_index("bundle_id", unique=True)
    await db.bundles.create_index("product_ids")
    await db.push_subscriptions.create_index("endpoint", unique=True)
    await db.push_subscriptions.create_index("is_active")

    # Seed booster slabs
    from routes.booster_routes import seed_default_slabs
    await seed_default_slabs()

    # Migrate display IDs for all existing users
    from display_ids import migrate_existing_users
    migration_stats = await migrate_existing_users()
    logger.info(f"Display ID migration: {migration_stats}")

    # Seed default categories
    cat_count = await db.categories.count_documents({})
    if cat_count == 0:
        default_cats = [
            {"category_id": generate_id("cat_"), "name": "Platform Boots", "slug": "platform-boots", "description": "Bold platform boots for the fearless", "image": "", "position": 1, "is_active": True, "show_in_nav": True, "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
            {"category_id": generate_id("cat_"), "name": "Stiletto Heels", "slug": "stiletto-heels", "description": "Elegant stiletto heels for every occasion", "image": "", "position": 2, "is_active": True, "show_in_nav": True, "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
            {"category_id": generate_id("cat_"), "name": "Ankle Boots", "slug": "ankle-boots", "description": "Stylish ankle boots", "image": "", "position": 3, "is_active": True, "show_in_nav": True, "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
            {"category_id": generate_id("cat_"), "name": "Party Wear", "slug": "party-wear", "description": "Statement pieces for parties", "image": "", "position": 4, "is_active": True, "show_in_nav": True, "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.categories.insert_many(default_cats)
        logger.info(f"Seeded {len(default_cats)} default categories")

    # Seed default policies (admin-editable)
    pol_count = await db.policies.count_documents({})
    if pol_count == 0:
        default_policies = [
            {
                "policy_id": generate_id("pol_"), "title": "Return Policy", "slug": "return-policy", "position": 1, "is_published": True,
                "last_updated_by": "System",
                "content": "## Return & Exchange Policy\n\n**Exchange Policy**\n- Size exchanges are accepted within 7 days of delivery\n- Product must be unworn, unwashed, and in original packaging\n- Tags must be intact\n\n**Return Policy**\n- Returns are only accepted for defective or damaged products\n- Report issues within 48 hours of delivery with photos\n- Refund will be processed within 5-7 business days after inspection\n\n**Non-Returnable Items**\n- Products without original tags\n- Used or worn items\n- Items purchased on sale/clearance\n\n**How to Initiate**\n1. Contact us via WhatsApp or email\n2. Share your order ID and photos\n3. We'll arrange pickup within 48 hours",
                "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "policy_id": generate_id("pol_"), "title": "Shipping Policy", "slug": "shipping-policy", "position": 2, "is_published": True,
                "last_updated_by": "System",
                "content": "## Shipping Policy\n\n**Delivery Timeline**\n- Standard Delivery: 3-5 business days\n- Express Delivery: 1-2 business days (select cities)\n\n**Shipping Charges**\n- Free shipping on orders above Rs.2,999\n- Standard shipping: Rs.199\n\n**Tracking**\n- You will receive a tracking ID via email/SMS once your order is shipped\n- Track your order in the 'My Orders' section\n\n**Delivery Areas**\n- We deliver across India (all pin codes)\n- Cash on Delivery (COD) available on orders up to Rs.10,000\n\n**Important Notes**\n- Delivery timelines may vary during sales or festive seasons\n- Ensure someone is available to receive the package",
                "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "policy_id": generate_id("pol_"), "title": "Privacy Policy", "slug": "privacy-policy", "position": 3, "is_published": True,
                "last_updated_by": "System",
                "content": "## Privacy Policy\n\n**Information We Collect**\n- Personal info: Name, email, phone, address\n- Payment info: Processed securely via Razorpay (we don't store card details)\n- Usage data: Browsing patterns to improve your experience\n\n**How We Use Your Information**\n- Process and deliver your orders\n- Send order updates and tracking info\n- Improve our products and services\n- Send promotional offers (you can opt out anytime)\n\n**Data Protection**\n- All data is encrypted and stored securely\n- We never sell your personal information to third parties\n- You can request data deletion by contacting us\n\n**Cookies**\n- We use cookies to enhance your browsing experience\n- You can disable cookies in your browser settings\n\n**Contact**\n- For privacy concerns, email us at privacy@thepigma.com",
                "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "policy_id": generate_id("pol_"), "title": "Terms & Conditions", "slug": "terms-and-conditions", "position": 4, "is_published": True,
                "last_updated_by": "System",
                "content": "## Terms & Conditions\n\n**General**\n- By using thepigma.com, you agree to these terms\n- We reserve the right to modify these terms at any time\n\n**Orders & Payments**\n- All prices are in INR and inclusive of taxes\n- We accept UPI, Credit/Debit Cards, Net Banking, and COD\n- Orders are confirmed only after successful payment verification\n\n**Product Information**\n- We strive to display accurate product colors and details\n- Slight variations may occur due to screen settings\n- Product availability is subject to stock\n\n**Intellectual Property**\n- All content, images, and designs are owned by Pigma\n- Unauthorized reproduction is prohibited\n\n**Limitation of Liability**\n- Pigma is not liable for delays caused by shipping partners\n- Maximum liability is limited to the order value\n\n**Governing Law**\n- These terms are governed by the laws of India\n- Disputes shall be resolved in Delhi jurisdiction",
                "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
            },
        ]
        await db.policies.insert_many(default_policies)
        logger.info(f"Seeded {len(default_policies)} default policies")

    # Seed platform settings
    settings = await db.platform_settings.find_one({"setting_id": "global"})
    if not settings:
        await db.platform_settings.insert_one({
            "setting_id": "global",
            "commission_enabled": True,
            "platform_commission_rate": 15.0,
            "influencer_commission_rate": 10.0,
            "reseller_commission_rate": 5.0,
            "min_withdrawal_amount": 1000,
            "auto_settle_on_delivery": True,
            "commission_targets": [],
            "commission_rewards": [],
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": None,
        })
        logger.info("Platform settings seeded")

    # Seed super admin if not exists
    super_admin = await db.admin_users.find_one({"email": "superadmin@pigma.com"})
    if not super_admin:
        await db.admin_users.insert_one({
            "admin_id": generate_id("admin_"),
            "email": "superadmin@pigma.com",
            "name": "Super Admin",
            "password": hash_password("superadmin123"),
            "role": AdminRole.SUPER_ADMIN.value,
            "phone": None,
            "is_active": True,
            "two_factor_enabled": False,
            "two_factor_secret": None,
            "failed_login_attempts": 0,
            "last_login": None,
            "created_by": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Super admin created: superadmin@pigma.com / superadmin123")

    # Seed demo admin users for each role
    demo_admins = [
        {"email": "marketing@pigma.com", "name": "Marketing Manager", "role": AdminRole.MARKETING_MANAGER.value, "password": "marketing123"},
        {"email": "finance@pigma.com", "name": "Finance Manager", "role": AdminRole.FINANCE_MANAGER.value, "password": "finance123"},
        {"email": "support@pigma.com", "name": "Support Manager", "role": AdminRole.SUPPORT_MANAGER.value, "password": "support123"},
        {"email": "products@pigma.com", "name": "Product Manager", "role": AdminRole.PRODUCT_MANAGER.value, "password": "products123"},
    ]

    for admin_data in demo_admins:
        existing = await db.admin_users.find_one({"email": admin_data["email"]})
        if not existing:
            await db.admin_users.insert_one({
                "admin_id": generate_id("admin_"),
                "email": admin_data["email"],
                "name": admin_data["name"],
                "password": hash_password(admin_data["password"]),
                "role": admin_data["role"],
                "phone": None,
                "is_active": True,
                "two_factor_enabled": False,
                "two_factor_secret": None,
                "failed_login_attempts": 0,
                "last_login": None,
                "created_by": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"Demo admin created: {admin_data['email']} / {admin_data['password']}")

    # Seed regular admin for backwards compatibility
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
    from config import client
    client.close()
