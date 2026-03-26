# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma". Features: vendor registration & product management, influencer/reseller commission system, admin RBAC, commission auto-settlement on delivery, reviews, vendor-influencer collaboration, credit-based promotions, referral commissions, and advanced marketing tools.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI, Framer Motion
- **Backend:** FastAPI (Python), modular architecture (19 route modules)
- **Database:** MongoDB
- **Auth:** JWT (separate tokens per role), Google OAuth, RBAC (5 admin roles)

## Admin Roles (5) — Strict RBAC
| Role | Access |
|------|--------|
| Super Admin | Everything |
| Product Manager | Products, Categories, Vendor Product Approvals ONLY |
| Marketing Manager | Coupons/Offers, Analytics ONLY |
| Finance Manager | Commissions, wallets, payouts, vendor KYC, withdrawals |
| Support Manager | Orders, customers |

## Seeded Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Product Manager: products@pigma.com / products123
- Marketing: marketing@pigma.com / marketing123
- Finance: finance@pigma.com / finance123
- Support: support@pigma.com / support123
- Test Vendor: vendortest3@example.com / vendor123
- Test Influencer: testinfluencer@example.com / influencer123
- User: harpreetkaler750@gmail.com / Harpreet@123

## Completed Features

### Phase 0 - MVP
- E-commerce store (homepage, products, cart, checkout, customer auth)
- Backend modular architecture (19 route modules)
- Admin RBAC system, Admin dashboard

### Phase 1 - Multi-Vendor Marketplace
- Vendor registration, login, KYC, dashboard
- Vendor product management + admin approval
- Admin vendor management + KYC approval

### Phase 2 - Commission & Control System
- Auto commission settlement on delivery
- Super Admin commission controls
- Platform Settings page
- Reseller registration + dashboard

### Phase 2.5 - Admin & Vendor Product Management
- Admin/Vendor Products pages with Add Product, Category, inline editing
- Admin session refresh on page load

### Phase 3 - Collaboration & Reviews (2026-03-26)
- Vendor-Influencer collaboration accept bug fix
- Ratings & Reviews UI (product + vendor store pages)
- Vendor Store Pages at /store/{vendorId}
- Top Sellers section on homepage
- Best Sellers Carousel from order data

### Phase 4 - Advanced Admin & Auth (2026-03-26)
- **Login Bug Fix:** Reset password for harpreetkaler750@gmail.com
- **Password Reset System:** OTP-based reset for all roles (users, vendors)
  - POST /api/auth/password/reset-request (sends OTP, demo mode returns OTP)
  - POST /api/auth/password/reset-confirm (validates OTP, resets password)
  - PUT /api/auth/password/update (logged-in user update)
  - PUT /api/vendors/password/update (vendor password update)
- **Strict RBAC Enforcement:**
  - Product Manager: ONLY products, categories, vendor_products
  - Marketing Manager: ONLY coupons, analytics
  - Frontend auto-filters nav based on permissions
- **Collaboration Enhancements:**
  - Unique referral code generated per collaboration (format: VEN+INF+6chars)
  - Fixed payment option (₹ amount alongside commission %)
  - Resend capability for rejected/expired requests
  - Sales tracking via referral codes (GET /api/collaborations/track/{code})
  - vendor_influencer_links collection for active collaborations
- **Action History System:**
  - Logs all important actions (login, password changes, etc.)
  - Admin can view all history with filters
  - Users/vendors can view own history
- **Forgot Password UI** on auth page with OTP step flow
- **Testing:** 22/22 backend + all frontend flows passed (iteration 7)

## MOCKED Integrations
- Razorpay payments/payouts -> needs API keys
- Instagram OAuth & DM -> needs Meta credentials
- SMS/Email OTP delivery -> demo OTP returned in response

## In Progress — Phase 5 Tasks
1. P1: Action History System full frontend (admin panel section)
2. P1: Advanced Offer System (time-based, category-based, Zomato/Swiggy style)
3. P1: Vendor category access (use platform categories + create own)
4. P1: Product multiple image/video upload
5. P1: Platform fee enforcement on every sale

## Upcoming Tasks
6. P1: Credit-based Promotion System (Top 20/100 products, category-wise)
7. P1: Referral Commission System (vendor 1%, influencer 1%)
8. P1: Dedicated Manager System
9. P2: Meta Pixel + Google Ads Pixel integration
10. P2: ManyChat integration for Instagram auto DM
11. P2: WhatsApp integration (Interakt)
12. P2: OTP verification for login/registration

## Future/Backlog
- Return & Dispute Management
- Auto Creator Recruitment landing page
- Real AI chatbot (GPT)
- CRM system, SEO tools, Marketing pixels
- Frontend refactoring (monolithic dashboard files)
