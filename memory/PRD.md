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
- Customer/Reseller: admin@pigma.com / admin123

## Completed Features

### Phase 32 - 7-Feature Fix & Enhancement (2026-03-31)
1. **Reseller System Fix**: Separate Reseller Dashboard with Meesho-style Products tab - per-product margin control, auto-generated share links, custom reseller pricing
2. **Super Admin Dark Theme**: Orders & Reviews panels converted from white to dark theme (bg-neutral-800/900)
3. **Influencer Join Flow**: AuthPage detects ?type=influencer param, redirects to /influencer dashboard after login/signup
4. **Affiliate System**: Per-product affiliate links (GET /api/affiliates/product-links), "Product Links" tab in dashboard, footer link fixed to /affiliate
5. **Dynamic RBAC**: Super Admin can assign/revoke module-level permissions per manager. Custom overrides stored in admin_permissions collection, fallback to role defaults
6. **Vendor Panel**: Scrollable sidebar (overflow-y-auto), logout button already present
7. **Credit System**: Vendor credit purchases now logged to platform_revenue collection as real revenue
- **Testing**: Iteration 36 - PASS (100% backend, 100% frontend)

### Phase 31 - Deep Interakt WhatsApp Integration (2026-03-31)
- Interakt API connected, order notifications, COD confirmation, abandoned cart recovery, broadcast marketing, admin WhatsApp panel
- Testing: Iteration 35 - PASS

### Phase 30 - Security & Super Admin Control System
- Credential cleanup, Super Admin user management, activity logging, RBAC enforcement
- Testing: Iteration 34 - PASS

### Earlier Phases (12-29)
- Full platform: Cart Booster, Flash Sales, Push Notifications, Mega Menu, Compact Grid, Quick Add, Bundles, Advanced Checkout, etc.

## Architecture
```
/app/backend/
  routes/ - 24+ route files (admin, order, vendor, whatsapp, reseller, affiliate, influencer, etc.)
  services/ - interakt_service.py
  models/ - schemas.py, enums.py
  auth.py - JWT, RBAC, dynamic permission check
  
/app/frontend/src/
  pages/ - AdminDashboard, ResellerDashboard, VendorDashboard, AffiliateDashboard, InfluencerDashboard, etc.
  components/ - PermissionsPanel, AdminOrdersPanel, AdminReviewsPanel, AdminSiteSettings, etc.
```

## Key DB Collections
- `admin_permissions` - Custom permission overrides per admin_id
- `platform_revenue` - Credit purchase revenue records
- `whatsapp_messages/settings/campaigns/webhooks` - Interakt data
- `vendor_credits/credit_transactions` - Vendor promotion credits
- Standard: orders, products, users, admin_users, resellers, affiliates, etc.

## MOCKED Integrations
- Razorpay -> needs RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET
- Instagram Graph API -> needs Meta credentials

## REAL Integrations
- Interakt WhatsApp Business API (Growth Plan) - CONNECTED & WORKING

## Remaining Tasks

### P1 - Upcoming
- "Testing Mode" for Orders (dummy order flow)
- Real Instagram Graph API (when credentials provided)
- Phone/OTP verification

### P2 - Future/Backlog
- AdminDashboard.jsx refactoring (3500+ lines -> smaller components)
- Vendor email digest notifications
- A/B testing for hero videos
- Real Razorpay live keys
