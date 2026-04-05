# Pigma - Premium Multi-Vendor E-Commerce Platform

## Original Problem Statement
Build "Pigma", a premium full-stack AI-powered multi-vendor e-commerce platform. Maximize conversions with advanced COD/Prepaid systems, cart boosters, bundles, flash sales, and comprehensive WhatsApp-driven automation and retention (Interakt).

## Tech Stack
- Frontend: React, Tailwind CSS, framer-motion, Shadcn UI
- Backend: FastAPI, Python, Pandas (CSV/Excel parsing)
- Database: MongoDB
- Integrations: Interakt (WhatsApp API), Razorpay (Mocked), Emergent Object Storage

## What's Been Implemented
- Multi-vendor product management with admin & vendor dashboards
- **Bulk Product Upload System** — CSV/Excel + ZIP images, semicolon-separated SKU support, flexible column aliases, upload progress bar, preview/publish/revert
- Cart Boosters, Flash Sales, Quick Adds, FOMO notifications, Dummy Reviews
- Real Interakt WhatsApp Integration (OTP, Support Tickets, Webhooks)
- Dynamic RBAC, Affiliate & Reseller System with price overrides
- Guest Cart System (LocalStorage), login only at checkout
- Image filtering: All customer-facing endpoints filter out imageless products

## Recent Bug Fixes (Apr 2026)
- **Bulk upload products not showing**: Fixed 3 issues:
  1. Semicolon-separated SKUs (e.g., `PG-COORD-001; PG-COORD-001.1`) now parsed — first part = primary SKU
  2. ZIP image matching fixed — no longer splits on hyphens (which broke SKUs like `PG-COORD-001`)
  3. Re-publish after revert now works — duplicate check only against active products, inactive ones auto-deleted
- Product photos not visible (P0): Backend filters imageless products; Frontend handles bad URLs
- Frontend Content-Type header fix for multipart uploads

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
