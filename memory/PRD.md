# Pigma - Premium Multi-Vendor E-Commerce Platform

## Original Problem Statement
Build "Pigma", a premium full-stack AI-powered multi-vendor e-commerce platform. Maximize conversions with advanced COD/Prepaid systems, cart boosters, bundles, flash sales, and comprehensive WhatsApp-driven automation and retention (Interakt).

## Tech Stack
- Frontend: React, Tailwind CSS, framer-motion, Shadcn UI, react-easy-crop
- Backend: FastAPI, Python, WebSockets
- Database: MongoDB
- Integrations: Interakt (WhatsApp API), Razorpay (Mocked), Emergent Object Storage, GPT-4o-mini Vision (KYC OCR)

## What's Been Implemented
- Multi-vendor product management with admin & vendor dashboards
- Admin Product Photo Cropping (zoom, rotate, 4:5 aspect ratio)
- Bulk Product Upload System (CSV/Excel + ZIP, chunked upload)
- Cart Merge on Login, Quick Add buttons, Cart Drawer
- Cart Boosters, Flash Sales, Quick Adds, FOMO notifications, Dummy Reviews
- Real Interakt WhatsApp Integration (OTP, Support Tickets, Webhooks)
- Dynamic RBAC, Affiliate & Reseller System with price overrides
- Guest Cart System (LocalStorage), login only at checkout
- Premium Zara/Blinkit-style ProductCard.jsx
- Instagram-style Reels/Explore vertical feed at /reels with guest localStorage likes
- Kuaishou-style Reels: Nested feed system with vendor side-panel
- Vendor Monetization System (credit wallet, reel boost, cart placement, featured vendor)
- Admin-Controlled Vendor Promotion System: request -> approval workflow
- Featured Sellers section on Homepage
- Unified ID-Based Tracking System (VND-0001, RSL-0001, etc.)
- Admin Master Search with Quick Actions (Suspend, Activate, Add Credits, Feature Vendor)
- WhatsApp OTP Login with needs_registration handling
- Comprehensive Vendor KYC System with AI-Powered OCR (auto-approve/auto-reject)
- **Real-Time Notification System**: WebSocket-based, role-targeted push notifications. NTF-XXXX sequential IDs. Bell icon with unread badge in Admin + Vendor dashboards. Sound alert (Web Audio API ring) for HIGH priority with 5s cooldown. Mute toggle. Click-to-redirect smart routing. Triggers: new orders (vendor+admin), tickets (admin), promotions (admin), credit changes (vendor).

## Deployment Fixes
- FOMO polling storm: Fixed 300ms -> 5min intervals
- StaticFiles mount conflict resolved
- Container-safe config with /tmp fallback
- Image cropping tainted canvas & CORS 3-layer fix

## Mocked Services
- Razorpay (Payments/Vendor Credit purchases)
- Instagram Auto-DMs

## P1 Upcoming Tasks
- Track affiliate/reseller link clicks (referral URL metrics)
- "Testing Mode" for Orders (dummy order flow triggering admin alerts)
- Transition Instagram Auto DM from Mock to real Meta API

## P2 Future/Backlog
- Real Razorpay integration for Vendor Credit purchases
- Vendor Email Digest Notifications
- A/B testing for hero videos
- AdminDashboard.jsx refactoring (3600+ lines, needs chunking)
