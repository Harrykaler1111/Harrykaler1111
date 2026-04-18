# Pigma - AI-Powered Multi-Vendor E-Commerce Platform

## Problem Statement
Build "Pigma", a premium full-stack AI-powered multi-vendor e-commerce platform with influencer marketing automation, advanced COD/Prepaid systems, cart boosters, bundles, flash sales, and WhatsApp-driven retention.

## Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI + Framer Motion
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT + Firebase Phone OTP
- **Integrations**: Firebase, Razorpay (LIVE), Resend, Interakt WhatsApp, Instagram Graph API (LIVE - Direct OAuth), OpenAI (KYC OCR), Emergent Object Storage

## What's Been Implemented

### Instagram Integration (Instagram Direct OAuth - LIVE & WORKING)
- **OAuth**: Uses `instagram.com/oauth/authorize` with Instagram App ID (3194355384096562)
- **Works with**: Creator, Professional, AND Business accounts — NO Facebook Page link required
- **Scopes**: instagram_business_basic, instagram_business_manage_messages, instagram_business_manage_comments
- **Token flow**: Code → Short token (api.instagram.com) → Long-lived token (ig_exchange_token, 60 days)
- **Profile fetch**: graph.instagram.com/me with username, followers, profile pic
- **Auto-DM**: Comment on influencer post → auto-DM with product referral link
- **Health Dashboard**: Token expiry countdown, DM delivery rates, webhook event logs, automation stats (30s auto-refresh)
- **Token Auto-Refresh**: Background cron every 6h, uses ig_refresh_token endpoint
- **Admin**: DM config, connection status, manual refresh trigger, refresh logs
- **Meta App ID**: 1280214187553693 (webhooks/DMs), Instagram App ID: 3194355384096562 (OAuth)

### Core E-Commerce
- Multi-vendor product catalog with categories, variants, images
- Cart system with drawer UI, quantity controls, variant-specific images
- Checkout flow with COD/Prepaid options
- Order management (Admin + Vendor dashboards)

### Razorpay (LIVE - all real, no mocks)
- Customer checkout, Vendor wallet top-up, Credit purchase, Promotions

### Other Features
- Reels with 3-layer swipe navigation
- Dynamic Credit Pricing, Site Popup System
- Follow/Unfollow for stores/influencers
- Data Deletion page, Social profile cards

## Key API Endpoints
- `GET /api/instagram/auth/login` — Instagram OAuth URL (instagram.com)
- `GET /api/instagram/auth/callback` — Token exchange via Instagram API
- `GET /api/instagram/auth/status` — Connection status
- `POST /api/instagram/auth/disconnect` — Disconnect
- `GET /api/instagram/health-dashboard` — Health metrics
- `GET/POST /api/webhooks/instagram` — Webhook verify + events
- `POST /api/admin/instagram/refresh-tokens` — Manual token refresh
- `GET /api/admin/instagram/refresh-logs` — Refresh history

## Pending Tasks

### P1 - Upcoming
- "Testing Mode" for Orders (dummy order flow, real-time admin alerts)
- Affiliate/Reseller link click tracking
- Meta App Review for Instagram DM permissions

### P2 - Future
- Vendor Email Digest Notifications
- AdminDashboard.jsx refactoring (3700+ lines)

## 3rd Party Credentials
- Meta App ID: 1280214187553693 (webhooks, Graph API)
- Instagram App ID: 3194355384096562 (OAuth login)
- Instagram Webhook Verify Token: pigma_ig_verify_2024
- Razorpay: LIVE keys in .env
- Firebase: User's config in frontend
