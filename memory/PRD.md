# Pigma - Premium Multi-Vendor E-Commerce Platform

## Original Problem Statement
Build "Pigma", a premium full-stack AI-powered multi-vendor e-commerce platform.

## Tech Stack
- Frontend: React, Tailwind CSS, framer-motion, Shadcn UI, react-easy-crop
- Backend: FastAPI, Python, Pandas
- Database: MongoDB
- Integrations: Interakt (WhatsApp API), Razorpay (Mocked), Emergent Object Storage

## What's Been Implemented
- Multi-vendor product management with admin & vendor dashboards
- Admin Product Photo Cropping (zoom, rotate, 4:5 aspect ratio)
- Bulk Product Upload System (CSV/Excel + ZIP, chunked upload, semicolon SKU support)
- **Seamless Cart Merge on Login** — Guest cart (LocalStorage) merges into server cart on login, same items sum quantities, checkout waits for merge to complete
- Quick Add buttons on "You May Also Like" cards, Cart Drawer opens on Add to Cart
- Cart Boosters, Flash Sales, Quick Adds, FOMO notifications, Dummy Reviews
- Real Interakt WhatsApp Integration (OTP, Support Tickets, Webhooks)
- Dynamic RBAC, Affiliate & Reseller System with price overrides
- Guest Cart System (LocalStorage), login only at checkout
- Image filtering: All customer-facing endpoints filter out imageless products

## New Features (Apr 2026)
- **Vendor Monetization System**: Complete credit-based monetization engine. Admin-configurable pricing (9 fields: credit rate, reel boost per hour/day/week/month, cart placement, featured vendor week/month, free vendor reel limit). Vendor wallet, credit purchase, reel boost with timed duration, cart placement spending, featured vendor slots, view tracking analytics.
- **Admin Monetization Panel**: `/admin/monetization` — Super admin sets all prices, manually adds credits to vendors, views active boosts table.
- **Reels Boost Feed**: Boosted products appear first in reels feed, sorted by credits spent. "Promoted" badge on boosted products.
- **Vendor Reel Strip**: Swipe left (or tap Seller button) on any reel → shows that vendor's products. Free vendors limited to 3 products, paid vendors unlimited.
- **Explore / Reels Page**: Instagram Reels-style vertical scrolling product feed at /reels. Full-screen cards with image carousel, action buttons (Like, Cart, Share, Seller), product info overlay. Uses existing cart system.
- **Guest Likes**: Anyone can like products in reels without login (stored in localStorage, synced to wishlist API for logged-in users).

## UI Redesign (Apr 2026)
- **Mobile Product Listing Premium Redesign**: Rewrite of ProductCard.jsx. Clean images with no heavy overlays. Small red "LOW STOCK" badge top-left. Blinkit-style small "+" button bottom-right (replaces full-width ADD TO BAG). Price/MRP/Discount below image. Rounded-pill qty controller on add.

## Deployment Fixes (Apr 2026)
- **FOMO polling storm**: Fixed initial polling interval from 300-600ms to 300000-600000ms (5-10 min). Was causing hundreds of requests/minute in production logs.
- **StaticFiles mount conflict**: Moved legacy `/api/uploads` static mount to `/api/static-uploads` (conditional) to avoid conflict with upload_routes router.
- **Container-safe config**: UPLOAD_DIR creation now falls back to /tmp if app directory is read-only.
- **Cart items disappearing after login**: Fixed race condition — CheckoutPage now waits for `isMerging` to complete before fetching server cart. Also fixed swapped login() parameters in CheckoutAuthModal.
- Quick Add buttons on cart recommendations
- Admin photo cropping, bulk upload chunked upload, SKU/image matching
- **Crop existing photo — tainted canvas & CORS (Feb 2026)**: Full three-layer fix: (1) Backend adds `Access-Control-Allow-Origin: *` to `/api/uploads/files/` and `/api/uploads/assets/` endpoints + new `/api/uploads/proxy-image` fallback; (2) Frontend uses `crossOrigin="anonymous"` with cache-bust param on Image element; (3) Fallback chain: CORS load → proxy endpoint → non-CORS last resort. Also fixed z-index overlap (modal at `z-[100000]`) and added `useRef` + `onerror` for reliability.

## Mocked Services
- Razorpay (Payments), Instagram Auto-DMs

## P1 Upcoming Tasks
- Track affiliate/reseller link clicks (referral URL metrics)
- "Testing Mode" for Orders (dummy order flow)
- Transition Instagram Auto DM from Mock to real Meta API

## P2 Future/Backlog
- Vendor Email Digest Notifications
- A/B testing for hero videos
- AdminDashboard.jsx / VendorDashboard.jsx refactoring
