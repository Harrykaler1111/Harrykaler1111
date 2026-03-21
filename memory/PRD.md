# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma". Features: vendor registration & product management, influencer/reseller commission system, admin RBAC, commission auto-settlement on delivery, reviews, vendor-influencer collaboration.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI, Framer Motion
- **Backend:** FastAPI (Python), modular architecture (15 route modules)
- **Database:** MongoDB
- **Auth:** JWT (separate tokens per role), Google OAuth, RBAC (5 admin roles)

## Architecture
```
/app/backend/
  server.py, config.py, auth.py
  models/ (enums.py, schemas.py)
  routes/ (admin_routes, auth_routes, product_routes, cart_routes,
           order_routes, wishlist_routes, influencer_routes,
           affiliate_routes, coupon_routes, chat_routes, misc_routes,
           vendor_routes, reseller_routes, user_control_routes,
           platform_settings_routes, review_routes, collaboration_routes)

/app/frontend/src/
  App.js
  pages/ (HomePage, ProductsPage, ProductDetailPage, CartPage,
          CheckoutPage, AuthPage, ProfilePage, WishlistPage, OrdersPage,
          InfluencerDashboard, AffiliateDashboard, AdminDashboard,
          AdminLoginPage, VendorAuthPage, VendorDashboard,
          ResellerRegisterPage, ResellerDashboard)
  components/layout/ (Header.jsx, Footer.jsx)
```

## Admin Roles (5)
| Role | Key Permissions |
|------|----------------|
| Super Admin | Everything + platform_settings, categories, admin_users |
| Product Manager | products CRUD, vendor_products approve/reject, categories |
| Marketing Manager | coupons CRUD, influencers/affiliates/resellers approve |
| Finance Manager | commissions, wallets, payouts, vendor_kyc, withdrawals |
| Support Manager | orders update, customers edit |

## Seeded Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Product Manager: products@pigma.com / products123
- Marketing: marketing@pigma.com / marketing123
- Finance: finance@pigma.com / finance123
- Support: support@pigma.com / support123
- Test Vendor: testvendor@example.com / vendor123
- Test Customer: audit@test.com / test123

## Completed Features

### Phase 0 - MVP
- E-commerce store (homepage, products, cart, checkout, customer auth)
- Backend refactoring (monolith → modular)
- Admin RBAC system, Admin dashboard

### Phase 1 - Multi-Vendor Marketplace
- Vendor registration, login, KYC, dashboard
- Vendor product management + admin approval
- Admin vendor management + KYC approval

### Phase 2 - Commission & Control System (COMPLETED 2026-03-21)
- **Auto commission settlement on delivery** (platform → vendor → influencer → reseller)
- **Super Admin commission controls** (rates, toggle on/off, auto-settle, min withdrawal)
- **Product Manager role** (new RBAC role for product CRUD + category management)
- **Platform Settings page** (stats, commission controls, toggles)
- **Reviews & Ratings system** (product reviews with images/videos, vendor ratings)
- **Vendor-Influencer collaboration** (send/accept/reject collaboration requests)
- **Reseller registration + dashboard** (overview, referral links, wallet)
- **Logout on all dashboards** (admin, vendor, influencer, reseller)
- **Status warnings** for suspended/disconnected users
- **Header UI fix** (properly aligned nav with Sell on Pigma + Become Reseller)
- **Admin action history** + suspension logs

## MOCKED Integrations
- Razorpay payments/payouts → needs API keys
- Instagram OAuth & DM → needs Meta credentials
- AI chatbot → keyword-based

## P0 - Next Tasks
- None pending

## P1 - Upcoming Tasks
1. Real Razorpay integration (when keys provided)
2. WhatsApp integration (Interakt - user will provide credentials later)
3. Instagram API integration (needs Meta credentials)
4. OTP verification for login/registration (needs SMS provider)
5. Partial payment on COD
6. Shipping integration (Shiprocket/Delhivery)
7. Email notifications (SendGrid/Resend)

## P2 - Future/Backlog
- WhatsApp cart abandonment automation
- Push notifications (Firebase)
- Auto Creator Recruitment landing page
- Creator Growth Tools
- Vendor Rating System (UI already exists via reviews API)
- Return & Dispute Management
- Real AI chatbot (GPT via Emergent LLM Key)
- CRM system
- SEO management tools
- Marketing pixels (Meta, Google)
