# Pigma E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered e-commerce and influencer marketplace platform for a premium fashion brand called "Pigma". Features include e-commerce store, admin dashboard with RBAC, influencer automation & commission wallet system, and multi-channel marketing tools.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI, Framer Motion
- **Backend:** FastAPI (Python), modular architecture
- **Database:** MongoDB
- **Auth:** JWT, Google OAuth (Emergent-managed), RBAC for admins

## Architecture (Post-Refactoring)
```
/app/backend/
  server.py          - App setup, router includes, seed data
  config.py          - DB, env vars, settings
  auth.py            - JWT, password, auth dependencies
  models/
    enums.py         - AdminRole, permissions matrix, enums
    schemas.py       - All Pydantic request/response models
  routes/
    auth_routes.py   - /auth/* (register, login, google, OTP)
    admin_routes.py  - /admin/* (auth, users CRUD, dashboard, orders, withdrawals)
    product_routes.py - /products/* (CRUD, featured, new arrivals)
    cart_routes.py   - /cart/* (add, update, remove, clear)
    order_routes.py  - /orders/* (create, list, payment verify, commissions)
    wishlist_routes.py - /wishlist/* (add, remove, list)
    influencer_routes.py - /influencers/* (apply, Instagram, wallet, withdrawals)
    affiliate_routes.py - /affiliates/* (apply, management)
    coupon_routes.py - /coupons/* (CRUD, validate)
    chat_routes.py   - /chat/* (AI chatbot)
    misc_routes.py   - /health, /categories, /track/click
  tests/
    test_admin_rbac.py

/app/frontend/src/
  App.js             - Router, AuthProvider, LayoutWrapper
  pages/
    AdminLoginPage.jsx    - Secure admin login portal
    AdminDashboard.jsx    - Full admin dashboard with RBAC sidebar
    InfluencerDashboard.jsx - Influencer wallet, Instagram, referrals
    HomePage.jsx, ProductsPage.jsx, CartPage.jsx, etc.
```

## RBAC Roles & Permissions
- **Super Admin:** Full control over everything
- **Marketing Manager:** Campaigns, influencers, affiliates (no admin users/payouts)
- **Finance Manager:** Sales data, commissions, payouts (no admin users)
- **Support Manager:** Orders, customer support only

## Seeded Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Marketing: marketing@pigma.com / marketing123
- Finance: finance@pigma.com / finance123
- Support: support@pigma.com / support123
- Legacy Admin: admin@pigma.com / admin123

## Completed (Date: 2026-03-15)
1. E-commerce MVP (homepage, products, cart, checkout, auth)
2. Backend refactoring (2565-line monolith → modular architecture)
3. Admin login portal (/admin-login)
4. Full RBAC system with 4 admin roles and permission matrix
5. Admin dashboard with sub-pages (Overview, Orders, Products, Customers, Influencers, Affiliates, Coupons, Withdrawals, Admin Users)
6. Super Admin can create/delete admin users
7. Admin Users management with role-based create form
8. Influencer wallet system (backend endpoints)
9. Instagram automation (MOCKED backend)
10. Header/Footer hidden on admin pages for clean admin UX

## MOCKED Integrations
- Razorpay payments/payouts
- Instagram OAuth & DM automation
- AI chatbot (keyword-based responses)
- OTP verification

## P1 - Next Up
- Influencer dashboard frontend wiring (wallet UI, withdrawal requests)
- Instagram OAuth connect UI in influencer dashboard
- Product creation form in admin dashboard
- Coupon creation form in admin dashboard
- Real AI chatbot with GPT integration

## P2 - Backlog
- Email notifications (order confirmation, shipping)
- Push notifications
- Product reviews & ratings
- Multi-platform social integrations (YouTube, Snapchat, Facebook)
- Influencer leaderboard
- WhatsApp chat support
