# Pigma - Premium Multi-Vendor E-Commerce Platform

## Original Problem Statement
Build "Pigma", a premium full-stack AI-powered multi-vendor e-commerce platform. Maximize conversions with advanced COD/Prepaid systems, cart boosters, bundles, flash sales, and comprehensive WhatsApp-driven automation and retention (Interakt).

## Tech Stack
- Frontend: React, Tailwind CSS, framer-motion, Shadcn UI, react-easy-crop
- Backend: FastAPI, Python, Pandas (CSV/Excel parsing)
- Database: MongoDB
- Integrations: Interakt (WhatsApp API), Razorpay (Mocked), Emergent Object Storage

## What's Been Implemented
- Multi-vendor product management with admin & vendor dashboards
- **Admin Product Photo Cropping** — Crop already-uploaded images from edit product view (zoom, rotate, 4:5 aspect ratio)
- **Bulk Product Upload System** — CSV/Excel + ZIP images, chunked upload for large ZIPs, semicolon SKU support, flexible column aliases
- Cart Boosters, Flash Sales, Quick Adds, FOMO notifications, Dummy Reviews
- Real Interakt WhatsApp Integration (OTP, Support Tickets, Webhooks)
- Dynamic RBAC, Affiliate & Reseller System with price overrides
- Guest Cart System (LocalStorage), login only at checkout
- Image filtering: All customer-facing endpoints filter out imageless products

## Recent Changes (Apr 2026)
- Admin photo cropping system for existing product images
- Chunked ZIP upload for bulk uploads (bypasses proxy limit)
- Fixed semicolon SKU parsing & image matching
- Removed "Chat on WhatsApp" from product page

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
