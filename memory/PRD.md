# Pigma - Premium Multi-Vendor E-Commerce Platform

## Original Problem Statement
Build "Pigma", a premium full-stack AI-powered multi-vendor e-commerce platform. Maximize conversions with advanced COD/Prepaid systems, cart boosters, bundles, flash sales, and comprehensive WhatsApp-driven automation and retention (Interakt).

## Tech Stack
- Frontend: React, Tailwind CSS, framer-motion, Shadcn UI, react-easy-crop
- Backend: FastAPI, Python, WebSockets
- Database: MongoDB
- Integrations: Interakt (WhatsApp API), Razorpay (LIVE), Emergent Object Storage, GPT-4o-mini Vision (KYC OCR), Resend (Email - ACTIVE)

## What's Been Implemented
- Multi-vendor product management with admin & vendor dashboards
- Admin Product Photo Cropping, Bulk Product Upload System
- Cart Merge on Login, Quick Add buttons, Cart Drawer, Cart Boosters
- Flash Sales, FOMO notifications, Dummy Reviews
- Real Interakt WhatsApp Integration (OTP, Support Tickets, Webhooks)
- Dynamic RBAC, Affiliate & Reseller System with price overrides
- Guest Cart System, Premium ProductCard, Reels/Explore feed
- Vendor Monetization System, Featured Sellers, Unified ID Tracking
- Admin Master Search with Quick Actions
- Comprehensive Vendor KYC with AI-Powered OCR auto-approve/auto-reject
- Real-Time WebSocket Notification System (Admin + Vendor + User)
- Browser Push Notifications, Notification Preferences, Quiet Hours
- Razorpay Payment Gateway (LIVE): Checkout popup, signature verification, webhook support
- Order Email Notification System: Branded HTML emails via Resend
- Enhanced Admin Orders Dashboard: Advanced search, time filters, payment filters
- User (Buyer) Notification System: Full notification bell in storefront Header
- Notification Bell Bug Fix: Optimistic updates with error rollback, token null-guard
- Notification Center: Full-page history for Admin/Vendor/User with search, filters, pagination, bulk ops
- Email Notification Preferences: All roles can toggle 7 email categories
- Mobile Responsive Notifications: Bell dropdowns use fixed positioning on mobile with backdrop overlay
- **Mobile Product Zoom**: Added touch event support (touchstart/touchmove/touchend) to ZoomableImage. Shows "Hold to zoom" hint on mobile, "Hover to zoom" on desktop. Uses `touch-none` CSS to prevent scroll interference during zoom.

- **Reels Vendor Mode Dimensions Fix (Apr 2026)**: Adjusted to match reference screenshots — 6:9 portrait thumbnails, 10vh top / 20vh bottom asymmetric padding, 20% side panel width, 2% gap between video and panel

- **Checkout Page Premium Redesign (Apr 2026)**: Real payment gateway SVG icons (Visa, MC, UPI, RuPay, GPay, PhonePe, NetBanking), premium gold gradient CTA button with shimmer, "Secured by Razorpay" badge, upgraded trust signals

- **Product On/Off Toggle (Apr 2026)**: Admin and vendor can toggle products active/inactive. Auto-deactivation when stock reaches 0. Inactive products hidden from frontend. Toggle UI in admin (AdminProductsHub) and vendor dashboards.

- **Firebase Phone OTP Auth (Apr 2026)**: Replaced WhatsApp OTP with Firebase Phone Auth. 6-digit OTP boxes, auto-focus, 30s resend timer, invisible reCAPTCHA, auto-create user on first login, rate limiting, user_events for WhatsApp integration readiness.

- **Site Popup System (Apr 2026)**: Full-screen admin-controlled popup with dark overlay, image/video support, CTA button, delay config, force show, localStorage dismiss. Admin UI at /admin/popup.

## Production Domain
- https://thepigma.com

## Mocked / Pending
- Instagram Auto-DMs (mock)

## P1 Upcoming Tasks
- "Testing Mode" for Orders (dummy order flow triggering admin alerts)
- Track affiliate/reseller link clicks (referral URL metrics)
- Transition Instagram Auto DM from Mock to real Meta API

## P2 Future/Backlog
- Weekly Digest email implementation (backend scheduled job)
- AdminDashboard.jsx refactoring (3700+ lines)
