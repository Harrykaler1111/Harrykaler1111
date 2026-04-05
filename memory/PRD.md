# Pigma - Premium Multi-Vendor E-Commerce Platform

## Original Problem Statement
Build "Pigma", a premium full-stack AI-powered multi-vendor e-commerce platform. Maximize conversions with advanced COD/Prepaid systems, cart boosters, bundles, flash sales, and comprehensive WhatsApp-driven automation and retention (Interakt).

## Tech Stack
- Frontend: React, Tailwind CSS, framer-motion, Shadcn UI
- Backend: FastAPI, Python
- Database: MongoDB
- Integrations: Interakt (WhatsApp API), Razorpay (Mocked), Emergent Object Storage

## Core Architecture
```
/app/
├── backend/
│   ├── routes/ (product, cart, admin, vendor, auth, booster, affiliate, reseller, whatsapp, vendor_credit)
│   ├── models/schemas.py
│   └── server.py
├── frontend/
│   ├── src/components/ (ProductCard, CartDrawer, BoosterBar, AddToCartPopup, CheckoutAuthModal, etc.)
│   ├── src/pages/ (HomePage, ProductsPage, CartPage, CheckoutPage, AdminDashboard, VendorDashboard)
│   └── src/utils/imageUtils.js
```

## What's Been Implemented
- Multi-vendor product management with admin & vendor dashboards
- Cart Boosters with configurable slabs, upsell modals, vendor credit system
- Flash Sales, Quick Adds, FOMO notifications, Dummy Reviews
- Real Interakt WhatsApp Integration (Order webhooks, COD confirmation, Cart Recovery, Broadcasts, OTP, Support Tickets)
- Dynamic Role-Based Access Control (RBAC) stored in MongoDB
- Unified Affiliate & Reseller System with price overrides
- Guest Cart System (LocalStorage) with login required only at checkout
- Smart Add-to-Cart popup, GPS Address fetch
- WhatsApp-first support system (auto-ticket creation from WhatsApp chats)
- Image filtering: All customer-facing product endpoints filter out products without images

## Completed Bug Fixes
- Product photos not visible (P0): Backend filters imageless products from all listings/recommendations; Frontend normalizeImageUrl handles bad URLs (Apr 2026)
- Cart delete button fix
- Cart booster & upsell endpoint mismatches
- Guest cart visibility fixes

## Mocked Services
- Razorpay (Payments)
- Instagram Auto-DMs

## P1 Upcoming Tasks
- Track affiliate/reseller link clicks (referral URL metrics on dashboards)
- "Testing Mode" for Orders (dummy order flow for admin alerts)
- Transition Instagram Auto DM from Mock to real Meta API

## P2 Future/Backlog
- Vendor Email Digest Notifications
- A/B testing for hero videos
- AdminDashboard.jsx refactoring (3500+ lines needs splitting)
- VendorDashboard.jsx refactoring (2100+ lines)
- Bulk Product Upload System (CSV/Excel + ZIP images with SKU mapping)
