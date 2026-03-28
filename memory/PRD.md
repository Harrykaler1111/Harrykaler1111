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
- **Progress Bar with Slab Markers:** Visual milestones at Rs.1,200, Rs.3,330, Rs.5,999 with animated gold fill
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
- **Green Savings Bar:** Animated gradient bar showing "Rs.X Saved so far!" when discounts are active
- **Collapsible Bill Breakdown:** Click "Estimated Total" to expand/collapse detailed bill (Subtotal, Cart Booster, Cart Subtotal, Shipping, Total Savings, Estimated Total)
- **UPI Payment Logos:** Checkout button with amber gradient + Paytm, PhonePe, Google Pay logos + "Extra Discount On UPI" text
- **"You May Also Like":** Horizontal scrollable product recommendations with "+ ADD" buttons, sourced from /api/cart/upsell-suggestions
- **Cart Count Badge:** Gold badge on header cart icon showing item count
- **Body Scroll Lock:** Prevents background scroll when drawer is open
- **URL Redirect:** /cart route auto-opens drawer and redirects to homepage
- **Testing:** Iteration 18 - 100% (13/13 backend + 17/17 frontend verified)

### Phase 16 - Product Page UX & Video System (2026-03-27)
- **Scroll Position Fix:** ScrollToTop component ensures page loads at top on every route change
- **Typography Overhaul:** Title reduced to text-2xl/28px, price text-2xl, description text-sm, labels text-xs uppercase tracking-wider
- **Image Display:** 4:5 aspect ratio with object-contain (full image visible, no cropping), discount/limited badges as overlays, image counter, prev/next arrows on hover
- **Zoom on Hover:** 2.2x magnification on image hover, transform-origin follows cursor position, crosshair cursor, "Hover to zoom" hint
- **Video Autoplay:** ProductVideo component with autoPlay, muted, loop, playsInline + hover mute/unmute toggle
- **Video Controls:** Play/pause button, gold seekable progress bar, center play/pause indicator animation, click-to-seek, gradient control overlay on hover
- **Video Upload Validation:** MediaUploader validates video duration client-side (max 10 seconds) before upload
- **Premium Minimal Layout:** Compact feature icons in 3-col grid, rounded tag pills, clean size/color selectors with rounded buttons
- **Header Dark Theme:** Solid black header on all pages (no white-on-scroll), seamless with booster bar
- **Testing:** Iteration 20 (100% - 24 features) + Iteration 21 (zoom 100%, video controls code verified)

### Phase 17 - Image Crop Tool + Customer Reviews with Images (2026-03-27)
- **Image Crop Modal:** Full-screen cropping tool using react-easy-crop (4:5 aspect ratio), zoom slider (1-3x), rotation, crop preview, Apply/Skip buttons
- **MediaUploader Integration:** On image selection, shows crop modal before upload. Supports crop queue for multiple images. Videos bypass crop.
- **Customer Reviews with Images:** Star rating (1-5), title, comment, up to 5 photo uploads per review. Reviews require verified purchase (delivered order)
- **Review Moderation:** All reviews start as "pending". Only admin-approved reviews show on product pages
- **Admin Reviews Panel (/admin/reviews):** Filter tabs (Pending/Approved/Rejected/All), expand review details, Approve/Reject/Delete actions, remove specific images, admin notes
- **Lightbox Gallery:** Click review image thumbnails to open fullscreen lightbox with prev/next navigation and keyboard support (Esc/Arrow keys)
- **Rating Stats:** Product page shows average rating with 5-star breakdown bar chart
- **Testing:** Iteration 22 - 100% (18/18 backend + all frontend verified)

### Phase 18 - E-Commerce Order Flow & Admin Notifications (2026-03-27)
- **Order Success Page:** Animated checkmark, order ID, items summary, subtotal/discount/total, shipping address, "Order is being processed" indicator, View My Orders / Home buttons
- **Admin Orders Panel (AdminOrdersPanel.jsx):** Real-time polling (every 10s) via GET /api/admin/orders/new-count, popup notifications with orange gradient card, Web Audio API "ding" alert (880Hz + 1100Hz dual tone), sound on/off toggle
- **Order Filter Tabs:** All/Pending/Confirmed/Shipped/Delivered with count badges
- **Order Row Expansion:** Customer info (name, phone, email), shipping address, item list with images, status actions
- **Admin Order Status Flow:** pending -> confirmed -> processing -> shipped -> delivered (+ cancel), each with dedicated button
- **Tracking Management:** Input tracking ID + courier name -> auto-sets status to shipped, displayed to customer on OrdersPage
- **New Order Badge:** Pulsing orange badge showing pending order count
- **Backend Endpoints:** GET /api/admin/orders/new-count, PUT /api/admin/orders/{id}/tracking, GET /api/admin/orders/{id}/detail
- **Testing:** Iteration 23 - PASS (17/18 backend + 100% frontend verified)

### Phase 19 - Order Timeline / Activity Log (2026-03-27)
- **order_events Collection:** Every order status change, payment, and tracking update logged with event_id, order_id, event_type, title, description, actor_type, actor_id, actor_name, meta, created_at
- **log_order_event() Helper:** Reusable async function in order_routes.py that creates timeline entries
- **Events Logged:** order_placed (on order creation), payment_verified (on payment), status_change (on confirm/process/ship/deliver/cancel), tracking_added (on tracking ID)
- **Customer Timeline:** GET /api/orders/{id}/timeline - generic view, admin names stripped, actor_type forced to "system"
- **Admin Timeline:** GET /api/admin/orders/{id}/timeline - full details with actor_name ("by Super Admin")
- **Frontend OrderTimeline.jsx:** Reusable component with animated colored icon dots, chronological display, staggered entrance animation
- **Customer OrdersPage:** "View Timeline" / "Hide Timeline" expandable section per order card
- **Admin OrdersPanel:** "Activity Log" section in expanded order row showing full audit trail
- **Backfill Migration:** All 16 existing orders backfilled with synthetic timeline events based on current status
- **Testing:** Iteration 24 - PASS (11/11 backend + 100% frontend verified)

### Phase 20 - Category System, Quick Add, Policies, Conversion Optimization (2026-03-28)
- **Category CRUD System:** Backend `/api/categories` with full admin CRUD. Dynamic header navigation. Product filtering by category from URL.
- **Admin-Editable Policy Pages:** Backend `/api/policies` stored in DB. Admin CRUD via `/admin/policies`. Markdown-style content.
- **Contact Page:** WhatsApp, Email, Instagram, Phone cards + trust signals + business hours.
- **Footer Rebuild:** Trust signals bar, policy links, contact section, social icons.
- **Quick Add (Blinkit-style):** Product cards `+ Add` -> `[-] qty [+]` controller. Out of stock handling.
- **Scarcity & Conversion Triggers:** "Only X left", "Limited drop", "Selling Fast", "Delivery 3-5 days", "COD Available".
- **Testing:** Iteration 25 - PASS (19/19 backend + 100% frontend)

### Phase 21 - Unified Products Hub & Full Product Edit (2026-03-28)
- **Merged Admin Products Hub:** Removed separate Categories sidebar tab. Unified Products section now has 3 sub-tabs: "All Products" | "+ Add Product" | "Categories & Sub-Categories"
- **All Products Tab:** Table with product thumbnails, category badges, gold pricing with MRP strikethrough, color-coded stock (red/amber/green), tag badges, search bar + category filter dropdown
- **Full Product Edit:** Super admin can edit ANY field after product is live: name, description, price, compare price, category, sub-category, sizes, colors, stock, tags, images/videos, limited edition toggle
- **Categories Manager:** Integrated inside Products with add/edit/delete categories + sub-categories, quick actions (View Products, Add Product), nav visibility toggle, product count per category
- **Add Product Form:** Category dropdown populates sub-category dropdown dynamically
- **Testing:** Verified via screenshots (All Products table, Categories panel, Edit form with all fields pre-populated)

### Phase 22 - Cart Booster Upsell Popup & Admin Curation (2026-03-28)
- **Admin Upsell Products Tab:** New "Upsell Products" tab in Cart Booster admin panel with product picker (search + add), priority list, remove buttons
- **Backend CRUD:** POST/GET/PUT/DELETE `/api/cart/admin/upsell-products` for admin curation. Separate `upsell_products` collection with priority ordering
- **Customer Upsell Popup:** Modal triggered by "Add more to unlock" button on BoosterBar. Shows 2-column grid of product cards with images, prices, discount badges
- **Quick Add in Popup:** Blinkit-style +/- quantity controllers directly inside the upsell popup. Cart syncs in real-time
- **Smart Prioritization:** `/api/cart/upsell-suggestions` prioritizes admin-curated picks first, then fills remaining slots with recent/affordable products. Excludes items already in cart
- **Fallback Images:** Added SVG placeholder for products without images
- **Testing:** Iteration 26 - PASS (15/15 backend + 100% frontend verified)

### Phase 23 - Advanced Checkout & COD System (2026-03-28)
- **Partial COD Payment:** Rs.500 advance required for COD orders >= Rs.1000 subtotal. Split display: "Pay Now Rs.500 | Pay on Delivery Rs.X"
- **COD Charge:** Rs.49 handling fee added to all COD orders, clearly shown in checkout
- **Prepaid Incentive:** Rs.100 flat discount for online payments. "SAVE Rs.100" badge on Prepaid option
- **PIN Code Validation:** Auto-fills city/state from 6-digit Indian PIN code. Covers 200+ cities across all states. Invalid PINs blocked
- **Risk Scoring:** COD orders scored as low/medium/high risk based on: order value > Rs.3000, multiple pending COD orders, etc.
- **COD Limits:** Max 3 pending COD per user. Users with 3+ cancelled COD orders blocked from COD
- **Checkout Page Redesign:** Premium dark/gold theme, 2-column layout (shipping + payment | order summary), animated interactions, trust badges
- **Switch Nudge:** When COD selected, green nudge "Switch to online payment & save Rs.X instantly"
- **Admin Checkout Settings:** 6 config cards (COD, COD Advance, Prepaid, Fraud, Shipping, Messages) with real-time toggle/save
- **High-Risk Orders Panel:** Admin can review flagged orders, approve/hold/cancel with audit trail
- **Order Success Page:** Updated to show COD/prepaid breakdown, advance paid, remaining on delivery
- **Testing:** Iteration 27 - PASS (21/21 backend + 100% frontend verified)

### Phase 24 - Frequently Bought Together (2026-03-28)
- **Backend API:** `GET /api/products/frequently-bought-together/{product_id}` with 3-step fallback: co-purchase analysis from orders -> same-category products -> popular by sold_count
- **Product Detail Page (Amazon-style):** "Frequently Bought Together" section with source product ("This Item" badge), up to 3 recommended products with toggle checkboxes, plus separators, bundle price summary with savings, "Add X to Cart" button
- **Cart Drawer (Compact):** "Frequently Bought Together" mini section with product thumbnails and "+ Add" quick-add buttons. Filters out items already in cart
- **Fallback Images:** SVG placeholder for products missing images
- **Testing:** Iteration 28 - PASS (14/14 backend + 100% frontend verified)

### Phase 25 - Admin-Managed Bundle Deals (2026-03-28)
- **Backend API:** Full CRUD at `/api/bundles/admin` (create, update, delete, list all). Public endpoints: GET `/api/bundles` (active), GET `/api/bundles/{id}`, GET `/api/bundles/for-product/{id}`. Server-side pricing calculation with percentage or flat discounts (max 50% for percentage)
- **Admin Bundle Panel:** Create/edit bundles with product search picker, discount type toggles (% / flat), badge text, active/inactive toggle, live price preview. List view shows product thumbnails, pricing, and action buttons
- **Homepage Section:** "Curated Collections - Bundle Deals" section with 3-column product image grid, gold badge, pricing with savings
- **Bundle Detail Page:** `/bundle/{id}` with product grid, full pricing breakdown, "Add Entire Bundle to Cart" CTA (dark box with gold styling)
- **PDP Bundle Banner:** Products that belong to a bundle show "Part of [Bundle Name] - Save Rs.X" banner linking to the bundle page
- **Validation:** Min 2 products, max 6, percentage max 50%, name required
- **Testing:** Iteration 29 - PASS (25/25 backend + 100% frontend verified)

### Phase 26 - Time-Limited Flash Sales on Bundles (2026-03-28)
- **Backend:** Added `flash_sale_start`, `flash_sale_end`, `flash_extra_discount_type`, `flash_extra_discount_value` to bundles. New `GET /api/bundles/flash-sales` returns only currently-active flash sales. Pricing engine calculates base + flash extra discount
- **Homepage Flash Banner:** Red-themed "Flash Sale LIVE" banner with animated lightning bolt, digit-box countdown timer (HRS:MIN:SEC), flash bundle preview cards with compact timers
- **Bundle Cards:** Flash bundles get red border, "FLASH SALE" pulsing badge, red pricing, inline countdown. Non-flash bundles retain gold theme
- **Bundle Detail Page:** Red countdown bar at top ("Hurry, offer ends soon!"), red CTA button, "Includes extra Rs.X flash discount!" label
- **PDP Banner:** Updated to show "FLASH SALE - Part of [Bundle]" with timer for flash bundles
- **Admin Controls:** Flash Sale Timer section in bundle form with on/off toggle, quick-start presets (2h/6h/12h/24h/48h), datetime pickers, extra discount type & value. Bundle list shows "FLASH SALE LIVE" pulsing badge
- **Testing:** Iteration 30 - PASS (14/14 backend + 100% frontend verified)

### Phase 27 - Push Notifications & Flash Sale Toast (2026-03-28)
- **Backend Push System:** VAPID key-based Web Push using `pywebpush`. `POST /api/notifications/subscribe` stores browser push subscriptions, `POST /api/notifications/unsubscribe` deactivates them, `GET /api/notifications/admin/stats` shows subscriber counts + recent logs
- **Admin Manual Send:** `POST /api/notifications/admin/send` sends custom push to all active subscribers with title, body, URL
- **Flash Sale Auto-Trigger:** When admin activates a flash sale on a bundle, push notification is automatically sent to all subscribers: "Flash Sale LIVE: [Bundle Name] - Save Rs.X"
- **Notification Bell:** Bell icon in header between search and user menu. Registers service worker, requests browser permission, subscribes to push with VAPID public key. Gold dot when subscribed
- **Service Worker:** `sw-push.js` handles push events, shows notification with "Shop Now" action, navigates to bundle page on click
- **In-App Flash Toast:** Premium gold/black animated slide-in banner "Flash Sale is Live" with Shop Now button and dismiss. Auto-hide progress bar (7s). Uses sessionStorage to only show once per session. Desktop: top-right floating card. Mobile: bottom bar. Hidden on admin pages
- **Testing:** Iteration 31 - PASS (15/15 backend + 100% frontend verified)

### Phase 27.1 - Flash Sale Banner UI Refinement (2026-03-28)
- **Design Overhaul:** Replaced red theme with premium gold/black matching site aesthetic
- **Desktop Positioning:** Moved from bottom-center to top-right (top-[140px] right-5) to avoid overlapping Cart Booster bar
- **Compact Layout:** Smaller card (340px), gold lightning icon, truncated bundle name, gold "Shop Now" CTA
- **Mobile Layout:** Bottom bar (bottom-16) with ultra-compact inline layout, gold "Shop" button
- **Auto-Hide:** 7-second countdown with gold progress bar, sessionStorage dismissal
- **Testing:** Verified via desktop & mobile screenshots - PASS

## MOCKED Integrations
- Razorpay -> needs RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET (checkout uses demo payment IDs)
- Instagram Graph API -> needs Meta credentials
- WhatsApp Business API -> needs API key
- Tracking Pixels -> test IDs configured

## Remaining Tasks

### P1 - Upcoming
- "Testing Mode" for Orders: Add a dev/test flow to place dummy orders and verify notifications fire correctly
- Real Instagram Graph API (when credentials provided)
- Real WhatsApp Business API (when credentials provided)

### P2 - Future/Backlog
- Phone/OTP verification for shipping (needs SMS provider)
- Real Razorpay live keys
- Real Meta Pixel / Google Ads pixel IDs
- Frontend refactoring (AdminDashboard 3300+ lines -> smaller components)
- Vendor email digest notifications
- A/B testing for hero videos
