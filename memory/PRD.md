# Pigma Multi-Vendor E-commerce Platform - PRD

## Tech Stack
React + FastAPI + MongoDB | Interakt WhatsApp | Razorpay (mocked)

## Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Vendor: testvendor@example.com / vendor123
- Customer: admin@pigma.com / admin123

## Completed Features

### Phase 47 - Cart Booster & Recommendations Fix (2026-04-05)
- **Fixed**: BoosterBar/CartDrawer/CartPage all called wrong `/api/cart-booster/slabs` (404) → corrected to `/api/booster/config`
- **Fixed**: Field name mismatch `min_amount`/`is_active` → `min_cart_value`/`is_enabled`
- **Fixed**: Upsell endpoint required auth, blocking guests → made auth optional
- **Fixed**: BoosterBar fetched admin-only messages endpoint → now reads from `/booster/config` response
- **Added**: "You May Also Like" recommendation grid (6 products) on CartPage
- Testing: Iteration 47 — 100% (15/15 backend, all frontend)

### Phase 46 - Guest Cart Flow Fix (2026-04-05)
- Cart icon always visible in header (removed user-only guard), mobile menu cart link for guests
- Testing: Iteration 46 — 100%

### Phase 45 - Cart & Checkout Redesign (2026-04-04)
- AddToCartPopup, Full CartPage, CheckoutAuthModal (WhatsApp OTP + Email), GPS address
- Testing: Iteration 45 — 100%

### Phase 44 - WhatsApp Support System (2026-04-04)
### Phase 43 - Guest Cart, Vendor Credits, Dummy Reviews, FOMO (2026-04-04)
### Earlier Phases (12-42) - Full platform

## MOCKED: Razorpay, WhatsApp OTP (demo), Instagram Graph API

## Remaining Tasks
### P1
- Track affiliate/reseller link clicks & conversions
- "Testing Mode" for Orders
- Real Instagram Meta API

### P2
- AdminDashboard refactoring (3500+ lines)
- Real WhatsApp OTP via Interakt
- Vendor email digests, A/B testing, Real Razorpay
