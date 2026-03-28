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
- Marketing: marketing@pigma.com / marketing123
- Vendor: testvendor@example.com / vendor123
- Customer: harpreetkaler750@gmail.com / Harpreet@123

## Completed Features (Latest)

### Phase 27.1 - Flash Sale Banner UI Refinement (2026-03-28)
- Premium gold/black theme, top-right positioning, auto-hide progress bar
- Desktop: top-right floating card. Mobile: bottom bar
- Testing: Verified via screenshots - PASS

### Phase 28 - Header Navigation & Mega Menu (2026-03-28)
- **Header Cleanup:** Removed individual category links from top bar. Clean 3-item nav: All Products, Partner with Us, Sell on Pigma
- **Amazon-Style Mega Menu:** Full-width dropdown on "All Products" hover. 4-column grid layout with gold category names. Sub-categories listed under each category. "View All Products" link at bottom with tagline
- **Partner with Us Dropdown:** Hover-triggered dropdown with 3 links: Become an Influencer (/creators), Affiliate Program (/affiliate), Reseller Program (/reseller-register). Gold icons, dark theme
- **Sell on Pigma CTA:** Gold-bordered button with hover fill effect, links to /vendor-login
- **Alignment Fix:** Proper gap-7 spacing, single-line labels with `whitespace-nowrap`, vertically centered items, uppercase tracking-[0.12em]
- **Responsive Mobile Menu:** Custom drawer (z-[61]) with backdrop overlay. PIGMA logo + close button header. Expandable categories with chevron toggle. Partner with Us expandable section. Account section for logged-in users
- **Hover Intent:** 150ms timeout on mouse leave prevents flicker. Opening one dropdown auto-closes the other
- **Premium Theme:** bg-neutral-950 dropdowns, gold/10 borders, shadow-2xl shadow-black/60, smooth transitions
- **Dynamic Categories:** Fetched from /api/categories, filtered by show_in_nav and is_active
- **Testing:** Iteration 32 - PASS (8/8 backend + 100% frontend verified)

### Earlier Phases (12-27)
- Phase 12: Site Settings & Integrations
- Phase 13: Cart Value Booster
- Phase 14: Global Sticky Booster Bar & Admin Control Panel
- Phase 15: Cart Drawer Popup System
- Phase 16: Product Page UX & Video System
- Phase 17: Image Crop Tool + Customer Reviews with Images
- Phase 18: E-Commerce Order Flow & Admin Notifications
- Phase 19: Order Timeline / Activity Log
- Phase 20: Category System, Quick Add, Policies, Conversion Optimization
- Phase 21: Unified Products Hub & Full Product Edit
- Phase 22: Cart Booster Upsell Popup & Admin Curation
- Phase 23: Advanced Checkout & COD System
- Phase 24: Frequently Bought Together
- Phase 25: Admin-Managed Bundle Deals
- Phase 26: Time-Limited Flash Sales on Bundles
- Phase 27: Push Notifications & Flash Sale Toast

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
