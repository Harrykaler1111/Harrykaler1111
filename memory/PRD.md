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
- **Bulk Product Upload System** — CSV/Excel + ZIP images, **chunked upload for large ZIPs** (5 MB chunks), semicolon-separated SKU support, flexible column aliases, upload progress bar, preview/publish/revert
- Cart Boosters, Flash Sales, Quick Adds, FOMO notifications, Dummy Reviews
- Real Interakt WhatsApp Integration (OTP, Support Tickets, Webhooks)
- Dynamic RBAC, Affiliate & Reseller System with price overrides
- Guest Cart System (LocalStorage), login only at checkout
- Image filtering: All customer-facing endpoints filter out imageless products

## Recent Bug Fixes (Apr 2026)
- **Bulk upload "Network Error"**: Implemented chunked ZIP upload (5 MB pieces) to bypass K8s ingress body size limit for 100+ MB files
- **Bulk upload products not showing**: Fixed semicolon SKU parsing, image matching, re-publish after revert
- **Product photos not visible**: Backend filters imageless products
- **Removed "Chat on WhatsApp" button** from product detail page per user request

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
