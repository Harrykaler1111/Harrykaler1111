# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma" with vendor management, influencer collaboration, admin RBAC, commission auto-settlement, reviews, credit-based promotions, referral commissions, support tickets, reward campaigns, payment enforcement, returns/disputes, marketing tools, and gamified cart experience.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Framer Motion
- Backend: FastAPI (Python), 25+ route modules
- Database: MongoDB
- Auth: JWT (per role), Google OAuth, RBAC (6 admin roles + dynamic permissions)
- File Storage: Emergent Object Storage
- Payments: Razorpay (mocked until API keys configured)
- WhatsApp: Interakt Business API (REAL - Growth Plan)
- Libraries: Pandas, openpyxl (for CSV/Excel bulk upload)

## Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Marketing: marketing@pigma.com / marketing123
- Product Manager: products@pigma.com / products123
- Vendor: testvendor@example.com / vendor123
- Customer/Affiliate/Reseller: admin@pigma.com / admin123

## Completed Features

### Phase 35 - Bulk Product Upload System (2026-04-04)
- Backend: POST /api/products/bulk/preview — Parses CSV/Excel + optional ZIP of images, validates required fields (sku, name, description, price, category), detects duplicate SKUs, parses variant format (Color:Size:Qty;...), maps images by SKU filename prefix
- Backend: POST /api/products/bulk/publish/{session_id} — Creates products in DB with correct sku, variants, stock; uploads images to Object Storage; skips invalid rows and reports failures
- Backend: GET /api/products/bulk/sample-csv — Downloads CSV template with all columns and examples
- Schema: Added `sku` (Optional[str]) and `variants` (List[Dict]) to ProductCreate, ProductUpdate, ProductResponse, VendorProductCreate, VendorProductUpdate, VendorProductResponse
- Frontend: BulkUpload component with 3-step wizard (Upload Files → Preview & Validate → Publish), drag-and-drop CSV/ZIP zones, CSV column guide, error reporting, progress indicators
- Admin: "Bulk Upload" tab added to AdminProductsHub (accessible to Super Admin, Product Manager)
- Vendor: "Bulk Upload" button added to VendorProducts section (accessible to approved Vendors)
- **Testing**: Iteration 39 - PASS (100% backend, 100% frontend)

### Phase 34 - Reseller Price Override (2026-04-04)
- Backend: Product API accepts `?reseller_id=X&price=Y`, validates against `reseller_links` collection, overrides price in response and nulls `compare_price`
- Backend: Cart validates reseller price override on add (checks reseller_links + price >= base_price). Manipulated URLs rejected.
- Backend: Order creation uses `price_override` as effective price
- Frontend: Product page reads URL params, passes to API — buyer sees ONLY reseller price. No strikethrough, no discount badge, no compare_price, no partner links section.
- **Testing**: Iteration 38 - PASS

### Phase 33 - Scalable On-Demand Affiliate + Reseller System (2026-03-31)
- On-demand link generation per product (not bulk). ProductPartnerLinks component on product pages. Lightweight dashboards with link history + search.
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
- `products` / `vendor_products`: Now include `sku` and `variants` fields
- `bulk_upload_sessions`: Stores preview sessions for bulk upload
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
- "Testing Mode" for Orders (dummy order flow to trigger real-time admin alerts)
- Real Instagram Meta API integration

### P2
- AdminDashboard.jsx refactoring (3500+ lines)
- Vendor email digest notifications
- A/B testing for hero videos
- Real Razorpay live keys
