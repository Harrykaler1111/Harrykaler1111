# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma" with vendor management, influencer collaboration, admin RBAC, commission auto-settlement, reviews, credit-based promotions, referral commissions, support tickets, reward campaigns, payment enforcement, returns/disputes, marketing tools, and gamified cart experience.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Framer Motion
- Backend: FastAPI (Python), 30+ route modules
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

### Phase 43 - Guest Cart, Vendor Credits, Dummy Reviews, FOMO (2026-04-04)
- **Guest Cart System**: localStorage-based cart for unauthenticated users (key: `pigma_guest_cart`). Cart merges to server on login. /cart opens drawer without requiring auth. /checkout still requires login.
- **CartContext API Migration**: Fixed BoosterBar, ProductCard, CheckoutPage to use new CartContext API (cartItems, updateQuantity, fetchCart replacing old cart.items, updateCartItem, refreshCart).
- **Vendor Cart Booster Credits**: Backend `/api/vendor-credits/*` (wallet, purchase, spend, transactions, promotions, upsell-products). Frontend `VendorCartBooster.jsx` at `/vendor/cart-booster`. Vendors buy credits (mock Razorpay) and spend them to promote products in cart upsell section. BoosterBar now pulls vendor-promoted products.
- **Super Admin Dummy Reviews**: Backend `/api/admin/reviews` CRUD. Frontend `AdminDummyReviewsPanel.jsx` at `/admin/dummy-reviews`. Search products, add fake reviews with rating/username/text/verified badge. Reviews auto-approved and show on product pages.
- **FOMO Live Purchase Notifications**: Backend `/api/fomo/*` (settings, messages, notification). Frontend `AdminFomoPanel.jsx` at `/admin/fomo`. Toggle on/off, frequency control, custom messages. `FomoNotification.jsx` displays popups to visitors.
- **Testing**: Iteration 43 — 100% backend (16/16), 100% frontend

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
- **Testing**: Iteration 42 — 100% code verified

### Phase 36 - Image Pipeline Audit & Fix (2026-04-04)
- Created `/app/frontend/src/utils/imageUtils.js` with `normalizeImageUrl()` — strips old domains from `/api/uploads/files/` paths
- Added `handleImageError` fallback across 12+ components
- **Testing**: Iteration 41 — 93% backend, 100% frontend

### Phase 35 - Bulk Product Upload System (2026-04-04)
- Backend: bulk preview, publish, sample CSV, sessions list, revert
- Frontend: BulkUpload 3-step wizard, Import History with revert
- **Testing**: Iterations 39-40 — PASS 100%

### Phase 34 - Reseller Price Override (2026-04-04)
- Backend/Frontend price override via reseller links
- **Testing**: Iteration 38 — PASS

### Earlier Phases (12-33)
- Full platform: Security, Cart Booster, Flash Sales, Push Notifications, Mega Menu, Quick Add, Bundles, Checkout, RBAC, Affiliate/Reseller System, Interakt WhatsApp, etc.

## Key DB Collections
- `products` / `vendor_products`: Include `sku` and `variants` fields
- `bulk_upload_sessions`: Bulk upload preview sessions
- `vendor_wallets`: Vendor cart booster credit balances
- `credit_transactions`: Vendor credit purchase/spend history
- `product_promotions`: Vendor-promoted products for cart upsell
- `reviews`: Customer + dummy reviews (is_dummy flag)
- `fomo_settings`: FOMO notification config + custom messages
- `reseller_links`, `affiliate_links`, `admin_permissions`, `platform_revenue`

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
