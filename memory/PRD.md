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
- **Admin Order Status Flow:** pending → confirmed → processing → shipped → delivered (+ cancel), each with dedicated button
- **Tracking Management:** Input tracking ID + courier name → auto-sets status to shipped, displayed to customer on OrdersPage
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
- **Category CRUD System:** Backend `/api/categories` with full admin CRUD (create/edit/delete categories and sub-categories). Categories stored in DB with name, slug, description, position, show_in_nav, is_active. Sub-categories linked to parent category.
- **Admin Categories Panel:** `/admin/categories` - Add/edit/delete categories, manage sub-categories, toggle nav visibility (eye icon), product count per category.
- **Dynamic Header Navigation:** Category nav links fetched from API, showing top 4 active categories with show_in_nav=true.
- **Product Filtering by Category:** `/products?category=Platform+Boots` reads from URL params. Filter dropdown updated to use structured categories.
- **Admin-Editable Policy Pages:** Backend `/api/policies` with DB-stored policies. Admin can create/edit/delete/publish/unpublish policies anytime via `/admin/policies`. Markdown-style content (## headings, ** bold, - bullets).
- **Default Policies Seeded:** Return Policy, Shipping Policy, Privacy Policy, Terms & Conditions - all with comprehensive content.
- **Policy Frontend:** `/policy/{slug}` renders formatted policy with breadcrumb, date, and links to other policies.
- **Contact Page:** `/contact` with WhatsApp, Email, Instagram, Phone cards + trust signals (Secure Payments, COD, Easy Returns, Fast Delivery) + business hours.
- **Footer Rebuild:** Trust signals bar, Shop links, Policy links (dynamic from API), Contact section with WhatsApp/email/social icons.
- **Quick Add to Cart (Blinkit-style):** Product cards show `+ Add` button on hover. After adding, shows `[-] qty [+]` quantity controller. Instant cart sync, no page reload.
- **Cart Context Enhanced:** Added `updateCartItem()` and `removeFromCart()` to CartContext for quantity controller.
- **Scarcity System:** "Only X pieces left" (when stock < 10), "Limited drop - no restock" (limited editions), "Selling Fast" (high sold_count).
- **Conversion Triggers:** "Delivery in 3-5 days" and "COD Available" badges on product detail page. "Product Details" bullet description section.
- **Out of Stock Handling:** Disabled purchase button and "Out of Stock" badge on product cards when stock=0.
- **Testing:** Iteration 25 - PASS (19/19 backend + 100% frontend)

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
- Real Razorpay live keys
- Real Meta Pixel / Google Ads pixel IDs
- Frontend refactoring (AdminDashboard 3300+ lines → smaller components)
- Vendor email digest notifications
- A/B testing for hero videos
