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
  auth.py            - JWT, password, auth deps (get_current_user, get_admin_user, get_current_vendor)
  models/
    enums.py         - AdminRole, VendorStatus, VendorProductStatus, permissions
    schemas.py       - All Pydantic models including Vendor schemas
  routes/
    auth_routes.py, admin_routes.py, product_routes.py, cart_routes.py,
    order_routes.py, wishlist_routes.py, influencer_routes.py,
    affiliate_routes.py, coupon_routes.py, chat_routes.py, misc_routes.py,
    vendor_routes.py  - NEW: Vendor registration, KYC, products, wallet, offers, admin management

/app/frontend/src/
  App.js             - Router with vendor routes (/vendor-login, /vendor/*)
  pages/
    VendorAuthPage.jsx    - NEW: Vendor login/register portal
    VendorDashboard.jsx   - NEW: Full vendor dashboard (overview, KYC, products, orders, wallet, offers, influencers)
    AdminDashboard.jsx    - Updated: Added Vendors + Product Approvals tabs
    AdminLoginPage.jsx, InfluencerDashboard.jsx, HomePage.jsx, etc.
```

## Roles & Auth
- **Customer:** Standard JWT auth via /auth/*
- **Vendor:** Separate JWT auth via /vendors/login, token in pigma_vendor_token
- **Admin (4 RBAC roles):** Separate JWT auth via /admin/auth/login, token in pigma_admin_token
  - Super Admin, Marketing Manager, Finance Manager, Support Manager

## Seeded Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Marketing: marketing@pigma.com / marketing123
- Finance: finance@pigma.com / finance123
- Support: support@pigma.com / support123
- Test Vendor: testvendor@example.com / vendor123

## Completed (2026-03-15)
### Phase 0 - MVP
1. E-commerce store (homepage, products, cart, checkout, customer auth)
2. Backend refactoring (monolith -> modular)
3. Admin RBAC system (4 roles, permission matrix)
4. Admin dashboard (overview, orders, products, customers, influencers, affiliates, coupons, withdrawals, admin users)
5. Influencer wallet system (backend)

### Phase 1 - Multi-Vendor Marketplace (NEW)
1. Vendor Registration (store name, contact, GST)
2. Vendor KYC (PAN, Aadhaar, bank details, document upload)
3. Vendor Dashboard (overview stats, sidebar navigation)
4. Vendor Product Management (create, list, edit, delete with admin approval flow)
5. Vendor Wallet System (balance, transactions, withdrawal requests)
6. Vendor Offer/Discount System (percentage, flat, coupon, flash sale)
7. Vendor-Influencer Browsing (view approved influencers for promotion)
8. Admin Vendor Management (list, approve/reject, suspend, KYC approval)
9. Admin Product Approval (pending products list, approve/reject to marketplace)
10. "Sell on Pigma" link in main header navigation

## MOCKED Integrations
- Razorpay payments/payouts
- Instagram OAuth & DM automation
- AI chatbot (keyword-based)
- OTP verification
- KYC document storage (local server)

## P0 - Next Up (Phase 2 - Vendor Commerce)
- Vendor wallet auto-credit on sale (platform commission -> influencer commission -> vendor earnings)
- Order flow integration with vendor_id attribution
- Vendor withdrawal processing by admin
- Commission settlement automation
- Vendor product appears in main product listing after approval

## P1 - Phase 3 (Influencer-Vendor & Reseller)
- Vendor invites influencers for promotion campaigns
- Reseller system (any user can become reseller)
- Reseller wallet & referral link generation
- Auto creator recruitment landing page
- Creator growth tools (shareable links, promo content, analytics)

## P2 - Phase 4 (Trust & Support)
- Vendor rating system (1-5 stars, written reviews)
- Return & dispute management
- Enhanced sales tracking (vendor, influencer, reseller attribution)
- Full marketplace analytics dashboard

## P3 - Backlog
- Real AI chatbot (GPT via Emergent LLM key)
- Email notifications
- Push notifications
- Multi-platform social integrations (YouTube, Snapchat, Facebook)
- Influencer leaderboard
- WhatsApp support
