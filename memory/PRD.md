# Pigma - AI-Powered Multi-Vendor E-Commerce Platform

## Problem Statement
Build "Pigma", a premium full-stack AI-powered multi-vendor e-commerce platform with influencer marketing automation, advanced COD/Prepaid systems, cart boosters, bundles, flash sales, and WhatsApp-driven retention.

## Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI + Framer Motion
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT + Firebase Phone OTP
- **Integrations**: Firebase, Razorpay (LIVE), Resend, Interakt WhatsApp, Instagram Graph API (LIVE), OpenAI (KYC OCR), Emergent Object Storage

## What's Been Implemented

### Core E-Commerce
- Multi-vendor product catalog with categories, variants, images
- Cart system with drawer UI, quantity controls, variant-specific images
- Checkout flow with COD/Prepaid options
- Order management (Admin + Vendor dashboards)
- Product On/Off toggles (auto-deactivation at zero stock)

### Authentication
- JWT-based email/password auth (phone mandatory on signup)
- Firebase Phone OTP authentication (hidden, available for re-enable)

### Reels / Explore
- 3-layer swipe navigation: Global → Vendor Mode → Image Carousel
- Swipe left/right cycles through product variant images inline
- Color variant badge shows current color (e.g., "Bottle Green 3/3")
- Add to cart captures the exact variant being viewed
- Vertical scroll for next product

### Instagram Integration (LIVE)
- Real Meta Graph API OAuth for influencer accounts
- Webhook endpoint for comments + messages
- Auto-DM system: comment on influencer post → DM with product referral link
- Rate limiting + duplicate protection
- Brand account @officialpigma connected
- Admin endpoints for DM config and connection status

### Razorpay (LIVE - all real, no mocks)
- Customer checkout payments
- Vendor wallet top-up (create order + verify)
- Vendor credit purchase (create order + verify)
- Vendor promotion credits

### Dynamic Credit Pricing
- Admin sets credit rate (₹ per credit) from panel
- All frontend components fetch and display dynamic pricing
- Pack prices auto-calculate based on admin-set rate

### Site Popup System
- Recurring popup with admin-controlled interval (minutes)
- Background timer checks every 60s
- localStorage timestamp-based, survives page refresh
- Excluded from admin pages
- Glassmorphic UI

### Admin Features
- Admin Dashboard (products, orders, vendors, KYC)
- Site Popup Manager (enable/disable, interval, force, media, CTA)
- Credit Pricing Manager
- Instagram connection status + auto-DM config

### Other
- Data Deletion page (/data-deletion)
- Footer links for policies

## Key API Endpoints
- `GET/POST /api/webhooks/instagram` — Instagram webhook verify + events
- `GET /api/influencers/instagram/connect` — OAuth URL generation
- `GET /api/influencers/instagram/callback` — OAuth token exchange
- `POST /api/influencers/instagram/posts` — Register post-product mapping
- `GET/PUT /api/admin/instagram/dm-config` — Auto-DM settings
- `GET /api/admin/instagram/status` — Connection status
- `POST /api/vendors/wallet/topup` + `/verify` — Real Razorpay wallet
- `POST /api/vendor-credits/purchase` + `/verify` — Real Razorpay credits
- `GET /api/vendor-credits/pricing` — Dynamic credit rate
- `PUT /api/vendor-credits/admin/pricing` — Admin set credit rate
- `GET /api/popup/config` — Public popup config with interval

## Pending Tasks

### P1 - Upcoming
- "Testing Mode" for Orders (dummy order flow, real-time admin alerts)
- Affiliate/Reseller link click tracking (referral URL metrics)
- Meta App Review completion for Instagram DMs

### P2 - Future
- Vendor Email Digest Notifications
- AdminDashboard.jsx refactoring (3700+ lines → smaller files)

## 3rd Party Credentials
- Meta App ID: 957392783642123
- Instagram Webhook Verify Token: pigma_ig_verify_2024
- Razorpay: LIVE keys in .env
- Firebase: User's config in frontend
