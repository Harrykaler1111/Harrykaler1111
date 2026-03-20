# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform for "Pigma". Transform from single-vendor to a marketplace where vendors register, upload products, sell through the platform, and collaborate with influencers. Platform owner earns commission on every sale.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI, Framer Motion
- **Backend:** FastAPI (Python), modular architecture
- **Database:** MongoDB
- **Auth:** JWT (separate tokens for customer, vendor, admin), Google OAuth, RBAC

## Architecture
```
/app/backend/
  server.py          - App setup, router includes, seed data, file serving
  config.py          - DB, env vars, platform commission rates
  auth.py            - JWT, password, auth deps (get_current_user, get_admin_user, get_current_vendor, get_current_reseller)
  models/
    enums.py         - AdminRole, VendorStatus, VendorProductStatus, permissions
    schemas.py       - All Pydantic models
  routes/
    auth_routes.py, admin_routes.py, product_routes.py, cart_routes.py,
    order_routes.py, wishlist_routes.py, influencer_routes.py,
    affiliate_routes.py, coupon_routes.py, chat_routes.py, misc_routes.py,
    vendor_routes.py, reseller_routes.py, user_control_routes.py

/app/frontend/src/
  App.js             - Router with all routes (vendor, reseller, admin)
  pages/
    HomePage.jsx, ProductsPage.jsx, ProductDetailPage.jsx, CartPage.jsx,
    CheckoutPage.jsx, AuthPage.jsx, AuthCallback.jsx, ProfilePage.jsx,
    WishlistPage.jsx, OrdersPage.jsx, InfluencerDashboard.jsx,
    AffiliateDashboard.jsx, AdminDashboard.jsx, AdminLoginPage.jsx,
    VendorAuthPage.jsx, VendorDashboard.jsx, 
    ResellerRegisterPage.jsx (NEW), ResellerDashboard.jsx (NEW)
```

## Roles & Auth
- **Customer:** JWT auth via /auth/*
- **Vendor:** Separate JWT auth via /vendors/login
- **Admin (4 RBAC roles):** Separate JWT auth via /admin/auth/login
  - Super Admin, Marketing Manager, Finance Manager, Support Manager
- **Influencer:** Customer who applied at /influencers/apply
- **Reseller:** Customer who registered at /resellers/register

## Seeded Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Marketing: marketing@pigma.com / marketing123
- Finance: finance@pigma.com / finance123
- Support: support@pigma.com / support123
- Test Vendor: testvendor@example.com / vendor123

## Completed Features (as of 2026-03-20)

### Phase 0 - MVP
1. E-commerce store (homepage, products, cart, checkout, customer auth)
2. Backend refactoring (monolith -> modular, 13 route modules)
3. Admin RBAC system (4 roles, permission matrix)
4. Admin dashboard (all management panels)
5. Influencer wallet system

### Phase 1 - Multi-Vendor Marketplace
1. Vendor Registration + Login
2. Vendor KYC submission
3. Vendor Dashboard (overview, products, orders, wallet, offers, influencers)
4. Vendor Product Management with admin approval flow
5. Admin Vendor Management + KYC approval
6. Admin Product Approvals

### Admin Control System (P0 - COMPLETED 2026-03-20)
1. Universal suspend/disconnect/discontinue/reactivate for all user types
2. Admin action history logging with audit trail
3. Reseller management panel in admin
4. Suspension history page with type filtering
5. Reseller registration page + dashboard (overview, referral links, wallet)
6. Nav items + routes for Resellers & Action History in admin sidebar

## MOCKED Integrations
- Razorpay payments/payouts (mock order IDs, mock verification)
- Instagram OAuth & DM automation (mock flow)
- AI chatbot (keyword-based)
- OTP verification
- KYC document storage (local server)

## P0 - Next Up: Commission Auto-Distribution
- Auto-distribute funds on order completion (platform -> vendor -> influencer/reseller)
- Vendor wallet auto-credit on sale
- Order flow with vendor_id attribution

## P1 - Pending Features
- Real Razorpay integration (needs API keys)
- Partial payment on COD
- Shipping integration (Shiprocket/Delhivery)
- Email notifications (SendGrid/Resend)
- Instagram username verification
- CRM system

## P2 - Future/Backlog
- WhatsApp automation (Twilio/Meta)
- Push notifications (Firebase)
- Auto Creator Recruitment landing page
- Creator Growth Tools
- Vendor Rating System
- Return & Dispute Management
- Real AI chatbot (GPT via Emergent LLM Key)
- Multi-platform social integrations
