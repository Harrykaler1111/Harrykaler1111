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
- Test Vendor: vendortest3@example.com / vendor123
- Test Influencer: testinfluencer@example.com / influencer123

## Completed Features

### Phase 0 - MVP
- E-commerce store (homepage, products, cart, checkout, customer auth)
- Backend modular architecture (17 route modules)
- Admin RBAC system, Admin dashboard

### Phase 1 - Multi-Vendor Marketplace
- Vendor registration, login, KYC, dashboard
- Vendor product management + admin approval
- Admin vendor management + KYC approval

### Phase 2 - Commission & Control System
- Auto commission settlement on delivery (platform > vendor > influencer > reseller)
- Super Admin commission controls (rates, toggle, auto-settle, min withdrawal)
- Product Manager role (new RBAC role)
- Platform Settings page (stats, commission controls)
- Reseller registration + dashboard
- Logout on all dashboards + status warnings for suspended accounts

### Phase 2.5 - Admin & Vendor Product Management
- Admin Products page: Add Product form, Add Category, inline price/stock editing, delete
- Vendor Products page: Add Product with category dropdown, inline stock/price editing
- Admin session refresh on page load (fixes stale permissions)
- Scrollable admin sidebar with all nav items visible
- Header UI fix (proper alignment, nav links)
- Vendor stock/price update APIs (without triggering re-approval)

### Phase 3 - Collaboration & Reviews (COMPLETED 2026-03-26)
- **P0 Bug Fix:** Vendor-Influencer collaboration accept flow - fixed KeyError on vendor document (vendor doesn't have user_id field; now reads contact info directly from vendor doc)
- **Ratings & Reviews Frontend UI:**
  - ProductReviews component with star ratings, rating distribution bars, review cards
  - Write Review form (requires delivered order)
  - Helpful button on reviews
  - Average rating display on product cards and product detail page
  - Empty state for products with no reviews
- **Testing:** 100% pass rate (14/14 backend, all frontend flows verified)

## MOCKED Integrations
- Razorpay payments/payouts -> needs API keys
- Instagram OAuth & DM -> needs Meta credentials
- AI chatbot -> keyword-based

## P1 - Upcoming Tasks
1. WhatsApp integration (Interakt - user will provide credentials)
2. Instagram API integration (needs Meta credentials)
3. OTP verification for login/registration (needs SMS provider)
4. Real Razorpay integration (when keys provided)
5. Partial payment on COD
6. Shipping integration (Shiprocket/Delhivery)
7. Email notifications (SendGrid/Resend)
8. Security hardening (rate limiting, input sanitization)

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
- Frontend refactoring (break monolithic dashboard files into sub-components)
