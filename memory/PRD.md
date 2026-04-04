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

### Phase 37 - WhatsApp +91 9625992057 Global Integration (2026-04-04)
- Created WhatsAppButton.jsx utility: exports `whatsappLink()`, `whatsappProductLink()`, `PHONE_NUMBER`, `PHONE_LINK`, `FloatingWhatsApp` component
- Header: Added top contact strip with WhatsApp link (left) and phone number (right)
- Footer: Updated WhatsApp icon + added phone number display with correct wa.me link
- Contact Page: Rewrote with correct WhatsApp (+91 9625992057) and phone number links
- Floating WhatsApp Button: Green circle (bottom-right) on all pages with "Chat with us" tooltip on hover
- Product Detail Page: "Chat on WhatsApp" green button with pre-filled message including product name + URL
- Checkout Page: WhatsApp support note near Place Order button
- Order Confirmation: WhatsApp contact button with order ID in pre-filled message
- Vendor Dashboard: Admin support section in sidebar with WhatsApp + phone links
- Replaced all old 919876543210 references with 919625992057
- **Testing**: Iteration 42 — 100% code verified, 8/13 UI tested (remaining 5 are behind auth wall)

### Phase 36 - Image Pipeline Audit & Fix (2026-04-04)
- Root Cause: Product images stored with old preview domain URLs (e.g., `pigma-approval-hub.preview...`) broke when the deployment domain changed
- Created `/app/frontend/src/utils/imageUtils.js` with `normalizeImageUrl()` — strips old domains from `/api/uploads/files/` paths and prepends current REACT_APP_BACKEND_URL; keeps external URLs as-is
- Added `handleImageError` fallback: clean SVG camera icon with "No Image" text for failed/missing images
- Applied normalizeImageUrl + onError to ALL product image references across 12+ components (ProductCard, ProductDetailPage, HomePage, CartDrawer, CheckoutPage, AdminDashboard, AdminProductsHub, AdminBoosterPanel, AdminBundlePanel, BundleDeals, FrequentlyBoughtTogether, BoosterBar, AffiliateDashboard, ResellerDashboard, OrdersPage, CartPage)
- Backend: Updated `serve_file` endpoint to fallback to direct Object Storage fetch when no `uploaded_files` DB record exists
- **Testing**: Iteration 41 — 93% backend (1 proxy cache-control issue), 100% frontend, 0 broken images

### Phase 35 - Bulk Product Upload System (2026-04-04)
- Backend: POST /api/products/bulk/preview — Parses CSV/Excel + optional ZIP of images, validates required fields (sku, name, description, price, category), detects duplicate SKUs, parses variant format (Color:Size:Qty;...), maps images by SKU filename prefix
- Backend: POST /api/products/bulk/publish/{session_id} — Creates products in DB with correct sku, variants, stock; uploads images to Object Storage; skips invalid rows and reports failures
- Backend: GET /api/products/bulk/sample-csv — Downloads CSV template with all columns and examples
- Backend: GET /api/products/bulk/sessions — Lists past import sessions with status, counts, timestamps
- Backend: POST /api/products/bulk/revert/{session_id} — Soft-deletes (deactivates) all products from a published batch, marks session as "reverted"
- Schema: Added `sku` (Optional[str]) and `variants` (List[Dict]) to ProductCreate, ProductUpdate, ProductResponse, VendorProductCreate, VendorProductUpdate, VendorProductResponse
- Frontend: BulkUpload component with 3-step wizard (Upload Files → Preview & Validate → Publish), drag-and-drop CSV/ZIP zones, CSV column guide, error reporting, progress indicators
- Frontend: Import History tab with session list (date, session ID, status, product count, valid/errors), Revert button with confirmation dialog, reverted timestamp display
- Admin: "Bulk Upload" tab added to AdminProductsHub (accessible to Super Admin, Product Manager)
- Vendor: "Bulk Upload" button added to VendorProducts section (accessible to approved Vendors)
- **Testing**: Iteration 39 (bulk upload) - PASS 100%, Iteration 40 (import history + revert) - PASS 100%

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
