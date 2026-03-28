# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma" with vendor management, influencer collaboration, admin RBAC, commission auto-settlement, reviews, credit-based promotions, referral commissions, support tickets, reward campaigns, payment enforcement, returns/disputes, marketing tools, and gamified cart experience.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Framer Motion
- Backend: FastAPI (Python), 24+ route modules
- Database: MongoDB
- Auth: JWT (per role), Google OAuth, RBAC (6 admin roles)
- File Storage: Emergent Object Storage (multi-image/video)
- Payments: Razorpay (mocked until API keys configured)

## Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Admin (demo): admin@pigma.com / admin123
- Marketing: marketing@pigma.com / marketing123
- Vendor: testvendor@example.com / vendor123

## Completed Features (Latest)

### Phase 28 - Header Navigation & Mega Menu (2026-03-28)
- Amazon-style mega menu on "All Products" hover — 4-column category grid
- "Partner with Us" dropdown — Influencer, Affiliate, Reseller links
- "Sell on Pigma" gold-bordered CTA button
- Responsive mobile hamburger drawer menu
- Testing: Iteration 32 - PASS (8/8 backend + 100% frontend)

### Phase 29 - UI Layout Fixes, Compact Grid & Quick Add System (2026-03-28)
- **Header-Booster Gap Fix:** BoosterBar repositioned to `top-[68px]` (from `top-[80px]`), eliminating the 12px gap. Spacer reduced to `h-[48px]`
- **Cart Center Modal:** Converted from right-side drawer to center popup modal. Uses flex wrapper for proper centering with framer-motion. Sticky CHECKOUT footer always visible with UPI logos. Scrollable content area with items, coupon, savings, recommendations
- **Product Grid Density:** Desktop: 5 per row (`xl:grid-cols-5`), Tablet: 3 per row (`md:grid-cols-3`), Mobile: 2 per row (`grid-cols-2`). Compact `gap-3 md:gap-4` spacing
- **Product Card Compaction:** Image aspect ratio changed from 3:4 to 4:5. Reduced padding, font sizes, badge sizes. Rounded corners on images (`rounded-lg`)
- **Quick Add System (Always Visible):** Removed `opacity-0 group-hover:opacity-100` — button now always visible at bottom of every product card. Click transforms to `[-] qty [+]` controller with framer-motion AnimatePresence transitions. Decrease to 0 removes item and restores "+ Add" button. Cart badge and booster bar update instantly (no refresh)
- **Upsell Popup Optimization:** Widened to `max-w-3xl`. Grid changed to `grid-cols-2 md:grid-cols-4` (4 per row desktop). Compact cards with `aspect-[4/5]` images
- **HomePage Compaction:** Section padding reduced from `py-20 md:py-32` to `py-12 md:py-16`. Grid headers reduced. New Arrivals shows 10 products (up from 8) in 5-col grid
- **Products Page Compact Hero:** Reduced from `py-12 md:py-20` to `py-6 md:py-10`. Filter bar tightened
- **Testing:** Iteration 33 - PASS (9/9 backend + 100% frontend verified)

### Earlier Phases (12-27.1)
- Phase 12-27.1: Site Settings, Cart Value Booster, Cart Drawer, Product Page UX, Image Crop, Reviews, Order Flow, Admin Notifications, Order Timeline, Categories, Quick Add, Products Hub, Cart Booster Upsell, Advanced Checkout, Frequently Bought Together, Bundle Deals, Flash Sales, Push Notifications, Flash Sale Banner UI Refinement

## MOCKED Integrations
- Razorpay -> needs RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET
- Instagram Graph API -> needs Meta credentials
- WhatsApp Business API -> needs API key
- Tracking Pixels -> test IDs configured

## Remaining Tasks

### P1 - Upcoming
- "Testing Mode" for Orders: Dev/test flow to place dummy orders and verify notifications
- Real Instagram Graph API (when credentials provided)
- Real WhatsApp Business API (when credentials provided)

### P2 - Future/Backlog
- Phone/OTP verification for shipping (needs SMS provider)
- Real Razorpay live keys
- Real Meta Pixel / Google Ads pixel IDs
- Frontend refactoring (AdminDashboard 3300+ lines -> smaller components)
- Vendor email digest notifications
- A/B testing for hero videos
