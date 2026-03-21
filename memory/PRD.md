# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma". Features: vendor registration & product management, influencer/reseller commission system, admin RBAC, commission auto-settlement on delivery, reviews, vendor-influencer collaboration.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI, Framer Motion
- **Backend:** FastAPI (Python), modular architecture (17 route modules)
- **Database:** MongoDB
- **Auth:** JWT (separate tokens per role), Google OAuth, RBAC (5 admin roles)

## Admin Roles (5)
| Role | Key Permissions |
|------|----------------|
| Super Admin | Everything + platform_settings, categories, admin_users |
| Product Manager | products CRUD, vendor_products approve/reject, categories, stock |
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
- Backend modular architecture (17 route modules)
- Admin RBAC system, Admin dashboard

### Phase 1 - Multi-Vendor Marketplace
- Vendor registration, login, KYC, dashboard
- Vendor product management + admin approval
- Admin vendor management + KYC approval

### Phase 2 - Commission & Control System (COMPLETED 2026-03-21)
- Auto commission settlement on delivery (platform → vendor → influencer → reseller)
- Super Admin commission controls (rates, toggle, auto-settle, min withdrawal)
- Product Manager role (new RBAC role)
- Platform Settings page (stats, commission controls)
- Reviews & Ratings API
- Vendor-Influencer collaboration system
- Reseller registration + dashboard
- Logout on all dashboards + status warnings for suspended accounts

### Phase 2.5 - Admin & Vendor Product Management (COMPLETED 2026-03-21)
- **Admin Products page**: Add Product form, Add Category, inline price/stock editing, delete
- **Vendor Products page**: Add Product with category dropdown, inline stock/price editing (no re-approval needed), inventory summary (total/approved/pending/low stock)
- Admin session refresh on page load (fixes stale permissions)
- Scrollable admin sidebar with all nav items visible
- Header UI fix (proper alignment, nav links)
- Vendor stock/price update APIs (without triggering re-approval)

## MOCKED Integrations
- Razorpay payments/payouts → needs API keys
- Instagram OAuth & DM → needs Meta credentials
- AI chatbot → keyword-based

## P1 - Upcoming Tasks
1. WhatsApp integration (Interakt - user will provide credentials)
2. Instagram API integration (needs Meta credentials)
3. OTP verification for login/registration (needs SMS provider)
4. Real Razorpay integration (when keys provided)
5. Partial payment on COD
6. Shipping integration (Shiprocket/Delhivery)
7. Email notifications (SendGrid/Resend)
8. Ratings & Reviews frontend UI (backend ready)
9. Vendor-Influencer collaboration frontend UI (backend ready)
10. Security hardening (rate limiting, input sanitization)

## P2 - Future/Backlog
- WhatsApp cart abandonment automation
- Push notifications (Firebase)
- Auto Creator Recruitment landing page
- Creator Growth Tools
- Return & Dispute Management
- Real AI chatbot (GPT via Emergent LLM Key)
- CRM system
- SEO management tools
- Marketing pixels (Meta, Google)
