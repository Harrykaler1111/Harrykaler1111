# Pigma - AI-Powered Multi-Vendor E-Commerce Platform

## Problem Statement
Build "Pigma", a premium full-stack AI-powered multi-vendor e-commerce platform with influencer marketing automation, advanced COD/Prepaid systems, cart boosters, bundles, flash sales, and WhatsApp-driven retention.

## Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI + Framer Motion
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT + Firebase Phone OTP
- **Integrations**: Firebase, Razorpay (LIVE), Resend, Interakt WhatsApp, Facebook Graph API v19.0 (LIVE), OpenAI (KYC OCR), Emergent Object Storage

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
- Color variant badge shows current color
- Add to cart captures the exact variant being viewed

### Instagram Integration (REBUILT - Facebook Graph API v19.0)
- **OAuth**: Uses `www.facebook.com/v19.0/dialog/oauth` (Facebook Login for Business)
- **Scopes**: instagram_basic, instagram_manage_messages, instagram_manage_comments, pages_show_list, pages_read_engagement, business_management
- **Token flow**: Code → User Token → Long-lived Token → Facebook Pages → Page Access Token → IG Business Account
- **Messaging**: All DMs sent via PAGE ACCESS TOKEN (non-expiring for pages)
- **Webhooks**: Handles comments, messages, messaging_postbacks from Graph API
- **Auto-DM**: Comment on influencer post → auto-DM with product referral link
- **Admin**: DM config, connection status, brand account management
- **Meta App ID**: 1280214187553693

### Razorpay (LIVE - all real, no mocks)
- Customer checkout payments
- Vendor wallet top-up (create order + verify)
- Vendor credit purchase (create order + verify)
- Vendor promotion credits

### Dynamic Credit Pricing
- Admin sets credit rate from panel
- All frontend components fetch and display dynamic pricing

### Site Popup System
- Recurring popup with admin-controlled interval
- localStorage timestamp-based, survives page refresh

### Admin Features
- Admin Dashboard (products, orders, vendors, KYC)
- Site Popup Manager
- Credit Pricing Manager
- Instagram connection status + auto-DM config

### Other
- Data Deletion page (/data-deletion)
- Follow/Unfollow system for stores and influencers
- Social-media style profile cards
- Footer links for policies

## Key API Endpoints
- `GET /api/instagram/auth/login` — Facebook v19.0 OAuth URL generation
- `GET /api/instagram/auth/callback` — Code exchange + Page token flow
- `GET /api/instagram/auth/status` — Connection status check
- `POST /api/instagram/auth/disconnect` — Disconnect account
- `GET/POST /api/webhooks/instagram` — Webhook verify + event handler
- `GET /api/influencers/instagram/connect` — Influencer OAuth URL
- `POST /api/influencers/instagram/posts` — Register post-product mapping
- `GET/PUT /api/admin/instagram/dm-config` — Auto-DM settings
- `GET /api/admin/instagram/status` — Connection status (admin)
- `POST /api/vendors/wallet/topup` + `/verify` — Razorpay wallet
- `POST /api/vendor-credits/purchase` + `/verify` — Razorpay credits
- `GET /api/vendor-credits/pricing` — Dynamic credit rate

## Pending Tasks

### P1 - Upcoming
- "Testing Mode" for Orders (dummy order flow, real-time admin alerts)
- Affiliate/Reseller link click tracking (referral URL metrics)
- Meta App Review completion for Instagram DMs

### P2 - Future
- Vendor Email Digest Notifications
- AdminDashboard.jsx refactoring (3700+ lines → smaller files)

## 3rd Party Credentials
- Meta App ID: 1280214187553693
- Instagram Webhook Verify Token: pigma_ig_verify_2024
- Razorpay: LIVE keys in .env
- Firebase: User's config in frontend
