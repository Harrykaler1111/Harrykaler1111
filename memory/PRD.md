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

### Phase 34 - Reseller Price Override (2026-04-04)
- Backend: Product API accepts `?reseller_id=X&price=Y`, validates against `reseller_links` collection, overrides price in response and nulls `compare_price`
- Backend: Cart validates reseller price override on add (checks reseller_links + price >= base_price). Manipulated URLs rejected.
- Backend: Order creation uses `price_override` as effective price
- Frontend: Product page reads URL params, passes to API — buyer sees ONLY reseller price. No strikethrough, no discount badge, no compare_price, no partner links section.
- Cart shows reseller price cleanly without base price exposure
- **Testing**: Iteration 38 - PASS (100% backend, 100% frontend)

### Phase 33 - Scalable On-Demand Affiliate + Reseller System (2026-03-31)
- On-demand link generation per product (not bulk). ProductPartnerLinks component on product pages. Lightweight dashboards with link history + search.
- Link structure: `?aff_id=USER_ID` (affiliate), `?reseller_id=USER_ID&price=CUSTOM_PRICE` (reseller)
- **Testing**: Iteration 37 - PASS

### Phase 32 - 7-Feature Fix & Enhancement (2026-03-31)
- Reseller System, Admin Dark Theme, Influencer Join Flow, Affiliate System, Dynamic RBAC, Vendor Sidebar, Credit Revenue
- **Testing**: Iteration 36 - PASS

### Phase 31 - Deep Interakt WhatsApp Integration (2026-03-31)
- Order notifications, COD confirmation, abandoned cart recovery, broadcast marketing
- **Testing**: Iteration 35 - PASS

### Earlier Phases (12-30)
- Full platform: Security, Cart Booster, Flash Sales, Push Notifications, Mega Menu, Quick Add, Bundles, Checkout, etc.

## Key DB Collections
- `reseller_links` — generated reseller links with validated prices
- `affiliate_links` — generated affiliate links
- `admin_permissions` — dynamic RBAC overrides
- `platform_revenue` — credit purchase revenue
- `whatsapp_messages/settings/campaigns` — Interakt data

## MOCKED: Razorpay, Instagram Graph API
## REAL: Interakt WhatsApp Business API

## Remaining Tasks
### P1
- Track affiliate/reseller link clicks and conversions
- "Testing Mode" for Orders
- Real Instagram Graph API

### P2
- AdminDashboard.jsx refactoring
- Vendor email digest notifications
- A/B testing for hero videos
- Real Razorpay live keys
