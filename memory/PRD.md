# Pigma - Premium Multi-Vendor E-Commerce Platform

## Original Problem Statement
Build "Pigma", a premium full-stack AI-powered multi-vendor e-commerce platform. Maximize conversions with advanced COD/Prepaid systems, cart boosters, bundles, flash sales, and comprehensive WhatsApp-driven automation and retention (Interakt).

## Tech Stack
- Frontend: React, Tailwind CSS, framer-motion, Shadcn UI, react-easy-crop
- Backend: FastAPI, Python, Pandas
- Database: MongoDB
- Integrations: Interakt (WhatsApp API), Razorpay (Mocked), Emergent Object Storage

## What's Been Implemented
- Multi-vendor product management with admin & vendor dashboards
- Admin Product Photo Cropping (zoom, rotate, 4:5 aspect ratio)
- Bulk Product Upload System (CSV/Excel + ZIP, chunked upload, semicolon SKU support)
- Seamless Cart Merge on Login — Guest cart (LocalStorage) merges into server cart on login
- Quick Add buttons on "You May Also Like" cards, Cart Drawer opens on Add to Cart
- Cart Boosters, Flash Sales, Quick Adds, FOMO notifications, Dummy Reviews
- Real Interakt WhatsApp Integration (OTP, Support Tickets, Webhooks)
- Dynamic RBAC, Affiliate & Reseller System with price overrides
- Guest Cart System (LocalStorage), login only at checkout
- Image filtering: All customer-facing endpoints filter out imageless products
- Premium Zara/Blinkit-style ProductCard.jsx (clean images, small "+" button, low stock badge)
- Instagram-style Reels/Explore vertical feed at /reels with guest localStorage likes
- Vendor Monetization System (credit wallet, reel boost, cart placement, featured vendor)
- Admin Monetization Panel (/admin/monetization) for pricing config and manual credit top-up
- Kuaishou-style horizontal swipe vendor side-panel on Reels (falls back to category if no vendor_id)
- BoosterBar repositioned to top-0 on /reels route to prevent overlap

## Deployment Fixes
- FOMO polling storm: Fixed 300ms → 5min intervals
- StaticFiles mount conflict resolved
- Container-safe config with /tmp fallback
- Cart items race condition on login fixed
- Image cropping tainted canvas & CORS 3-layer fix

## Mocked Services
- Razorpay (Payments/Vendor Credit purchases)
- Instagram Auto-DMs

## P1 Upcoming Tasks
- Featured Sellers UI on Homepage (backend exists, frontend section needed)
- Track affiliate/reseller link clicks (referral URL metrics)
- "Testing Mode" for Orders (dummy order flow triggering admin alerts)
- Transition Instagram Auto DM from Mock to real Meta API

## P2 Future/Backlog
- Real Razorpay integration for Vendor Credit purchases
- Vendor Email Digest Notifications
- A/B testing for hero videos
- AdminDashboard.jsx refactoring (3600+ lines, needs chunking)
