# Pigma - AI-Powered Multi-Vendor E-Commerce Platform

## Problem Statement
Build "Pigma", a premium full-stack AI-powered multi-vendor e-commerce platform. Maximize conversions with advanced COD/Prepaid systems, cart boosters, bundles, flash sales, and comprehensive WhatsApp-driven automation and retention.

## Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI + Framer Motion
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT + Firebase Phone OTP
- **Integrations**: Firebase, Razorpay, Resend, Interakt WhatsApp, OpenAI (KYC OCR), Emergent Object Storage

## What's Been Implemented

### Core E-Commerce
- Multi-vendor product catalog with categories, variants, images
- Cart system with drawer UI, quantity controls
- Checkout flow with COD/Prepaid options
- Order management (Admin + Vendor dashboards)
- Product On/Off toggles (auto-deactivation at zero stock)

### Authentication
- JWT-based email/password auth
- Firebase Phone OTP authentication (with reCAPTCHA)

### UI/UX
- Reels-style product showcase (vendor mode, 1:2 aspect ratio)
- Premium checkout page (shimmer buttons, payment icons, trust signals)
- Cart drawer with iPhone safe-area support
- Glassmorphic Site Popup system (admin-configurable)
- Responsive floating action buttons (WhatsApp, Chat)

### Admin Features
- Admin Dashboard (product management, order management, vendor KYC)
- Site Popup Manager (enable/disable, force show, media, CTA)
- Product active state toggles

### Vendor Features
- Vendor Dashboard with product management
- Product toggle controls

### Integrations
- Firebase Phone Auth (live)
- Razorpay payments (mocked on preview)
- Instagram Auto-DMs (mocked)
- WhatsApp Business API via Interakt (requires user key)
- Resend email (requires user key)
- OpenAI GPT-4o-mini for KYC OCR (via Emergent key)
- Emergent Object Storage

## Pending Tasks

### P1 - Upcoming
- "Testing Mode" for Orders (dummy order flow, real-time admin alerts)
- Affiliate/Reseller link click tracking (referral URL metrics)
- Instagram Auto DM — transition mock to real Meta API

### P2 - Future
- Vendor Email Digest Notifications
- AdminDashboard.jsx refactoring (3700+ lines → smaller files)

## Key API Endpoints
- `GET /api/popup/config` — Public popup config
- `GET/PUT /api/popup/admin/config` — Admin popup management
- `POST /api/auth/firebase/verify` — Firebase token verification
- `PUT /api/admin/products/{id}/toggle` — Product active toggle

## Key DB Collections
- `popup_config`: { enabled, force_show, title, description, image, video, cta_text, cta_link, delay_seconds, updated_at, updated_by }
- `users`: includes `firebase_uid` for OTP-authenticated users
- `products`: includes `is_active` flag for toggle feature

## Testing Notes
- Firebase Phone Auth cross-origin requests blocked in Emergent Preview iframe — test in standalone browser tab
- reCAPTCHA lifecycle in AuthPage.jsx heavily debugged — do not tamper
- Latest test report: `/app/test_reports/iteration_77.json` (11/11 passed)
