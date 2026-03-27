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

### Phase 12 - Site Settings & Integrations (2026-03-27)
- Admin Hero Video Management (upload/URL/preview)
- Advanced Tiered Referral Commission (3 default tiers, configurable)
- Instagram Auto DM System (MOCKED - rules, test sending, history)
- WhatsApp Cart Reminder (MOCKED - config, template, test)
- Meta Pixel & Google Ads Pixel frontend injection (global tracking)

### Phase 13 - Cart Value Booster (2026-03-27)
- **Cart Progress Bar:** Animated gold fill bar with milestone markers at Rs.1,200 and Rs.3,330
- **Discount Slab Logic:** <Rs.1200 = no discount, >=Rs.1200 = Rs.100 OFF, >=Rs.3330 = Rs.200 OFF. Auto-applied, no refresh needed
- **Smart Upsell Suggestions:** When within Rs.500 of next slab, shows recommended products with quick-add buttons
- **Confetti Animation:** Triggers when new reward slab is unlocked
- **Floating Mini Cart (Mobile):** Sticky bottom bar showing progress, total, and slab info
- **Savings Banner:** Green highlight showing total savings
- **Urgency Microcopy:** "Almost there! Don't miss your discount" when close to threshold
- **Backend:** GET /api/cart/upsell-suggestions returns products under max_price not already in cart
- **Testing:** Iteration 16 - 100% (13 backend + all frontend verified)

### Phase 14 - Global Sticky Booster Bar & Admin Control Panel (2026-03-27)
- **Global Cart Context (CartProvider):** Wraps entire app, syncs cart state across all pages without reloads
- **Global Sticky Booster Bar:** Desktop: sticky below header (top-72px). Mobile: fixed bottom bar with expandable details
- **Progress Bar with Slab Markers:** Visual milestones at ₹1,200, ₹3,330, ₹5,999 with animated gold fill
- **Confetti Burst:** Full-screen particle animation when new slab is unlocked
- **Smart Upsell Modal:** Slide-up modal with grid of quick-add products when near next slab threshold
- **Admin Booster Panel:** Full management UI at /admin/cart-booster with 3 tabs:
  - Slab Manager: CRUD table with inline editing, toggle enable/disable, time-based scheduling
  - Messages: Customizable booster text (prefix, suffix, urgency, upsell button text) with {amount}/{reward} placeholders
  - Analytics: Total unlocks, AOV, boosted orders, per-slab breakdown
- **Upsell Prioritization:** /api/cart/upsell-suggestions now prioritizes boots-specific accessories (heel protectors, shoe care, socks, insoles) via keyword regex matching
- **Testing:** Iteration 17 - 100% (10/10 backend + all frontend verified)

### Phase 15 - Cart Drawer Popup System (2026-03-27)
- **Slide-in Cart Drawer:** Replaces full-page cart with animated right-side slide-in popup (framer-motion spring animation)
- **Cart Items:** Compact cards with thumbnail, name, variant (size|color), price, quantity +/- controls, remove button
- **Coupon Code Input:** Inline coupon input with Apply button inside drawer
- **Green Savings Bar:** Animated gradient bar showing "₹X Saved so far!" when discounts are active
- **Collapsible Bill Breakdown:** Click "Estimated Total" to expand/collapse detailed bill (Subtotal, Cart Booster, Cart Subtotal, Shipping, Total Savings, Estimated Total)
- **UPI Payment Logos:** Checkout button with amber gradient + Paytm, PhonePe, Google Pay logos + "Extra Discount On UPI" text
- **"You May Also Like":** Horizontal scrollable product recommendations with "+ ADD" buttons, sourced from /api/cart/upsell-suggestions
- **Cart Count Badge:** Gold badge on header cart icon showing item count
- **Body Scroll Lock:** Prevents background scroll when drawer is open
- **URL Redirect:** /cart route auto-opens drawer and redirects to homepage
- **Testing:** Iteration 18 - 100% (13/13 backend + 17/17 frontend verified)

## MOCKED Integrations
- Razorpay -> needs RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET
- Instagram Graph API -> needs Meta credentials
- WhatsApp Business API -> needs API key
- Tracking Pixels -> test IDs configured

## Remaining Tasks

### P1 - Upcoming
- Real Instagram Graph API (when credentials provided)
- Real WhatsApp Business API (when credentials provided)

### P2 - Future/Backlog
- Real Razorpay live keys
- Real Meta Pixel / Google Ads pixel IDs
- Frontend refactoring (AdminDashboard 3300+ lines)
- Vendor email digest notifications
- A/B testing for hero videos
