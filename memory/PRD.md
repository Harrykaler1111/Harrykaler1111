# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma" with vendor management, influencer collaboration, admin RBAC, commission auto-settlement, reviews, credit-based promotions, referral commissions, support tickets, reward campaigns, payment enforcement, returns/disputes, marketing tools, and gamified cart experience.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Framer Motion
- Backend: FastAPI (Python), 24+ route modules
- Database: MongoDB
- Auth: JWT (per role), Google OAuth, RBAC (6 admin roles + dynamic permissions)
- File Storage: Emergent Object Storage
- Payments: Razorpay (mocked until API keys configured)
- WhatsApp: Interakt Business API (REAL - Growth Plan)

## Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Marketing: marketing@pigma.com / marketing123
- Vendor: testvendor@example.com / vendor123
- Customer/Affiliate/Reseller: admin@pigma.com / admin123

## Completed Features

### Phase 33 - Scalable On-Demand Affiliate + Reseller System (2026-03-31)
**Architecture**: Amazon+Meesho model — links generated PER PRODUCT on-demand, not bulk-loaded.

**Backend Changes:**
- `POST /api/affiliates/generate-link` — generate affiliate link for one product (stores in `affiliate_links` collection)
- `GET /api/affiliates/my-links` — paginated history of generated links only
- `GET /api/affiliates/check-product/{product_id}` — check if link exists for a product
- `POST /api/resellers/generate-link` — generate reseller link with custom margin
- `GET /api/resellers/my-links` — paginated history of generated reseller links
- `GET /api/resellers/check-product/{product_id}` — check if link exists
- **REMOVED**: Bulk `/api/affiliates/product-links` and `/api/resellers/products` endpoints

**Frontend Changes:**
- `ProductPartnerLinks` component on every product page — inline affiliate/reseller link generation
- Affiliate Dashboard: lightweight with My Links + Find Products (search) tabs
- Reseller Dashboard: lightweight with Overview + My Links + Find Products + Wallet tabs
- No bulk product loading anywhere — supports 10K+ products efficiently

**Link Structure:**
- Affiliate: `?aff_id=USER_ID`
- Reseller: `?reseller_id=USER_ID&price=CUSTOM_PRICE`

**Testing**: Iteration 37 - PASS (17/17 backend, 100% frontend)

### Phase 32 - 7-Feature Fix & Enhancement (2026-03-31)
- Reseller System Fix, Admin Dark Theme, Influencer Join Flow, Affiliate System, Dynamic RBAC, Vendor Scrollable Sidebar, Credit Revenue Tracking
- Testing: Iteration 36 - PASS

### Phase 31 - Deep Interakt WhatsApp Integration (2026-03-31)
- Interakt API connected, order notifications, COD confirmation, abandoned cart recovery, broadcast marketing
- Testing: Iteration 35 - PASS

### Phase 30 - Security & Super Admin Control System
- Credential cleanup, Super Admin user management, activity logging
- Testing: Iteration 34 - PASS

### Earlier Phases (12-29)
- Full platform: Cart Booster, Flash Sales, Push Notifications, Mega Menu, Compact Grid, Quick Add, Bundles, Advanced Checkout, etc.

## Key DB Collections (New)
- `affiliate_links` — generated affiliate links (one per user+product)
- `reseller_links` — generated reseller links (one per user+product)
- `admin_permissions` — custom permission overrides per admin
- `platform_revenue` — credit purchase revenue records
- `whatsapp_messages/settings/campaigns/webhooks` — Interakt data

## MOCKED Integrations
- Razorpay, Instagram Graph API

## REAL Integrations
- Interakt WhatsApp Business API (Growth Plan)

## Remaining Tasks
### P1 - Upcoming
- "Testing Mode" for Orders (dummy order flow)
- Real Instagram Graph API (when credentials provided)
- Track affiliate/reseller link clicks and conversions on product page

### P2 - Future/Backlog
- AdminDashboard.jsx refactoring (3500+ lines)
- Vendor email digest notifications
- A/B testing for hero videos
- Real Razorpay live keys
