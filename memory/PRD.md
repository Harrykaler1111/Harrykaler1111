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
- Notification Bell Bug Fix: Optimistic updates, error rollback, token null-guard
- **Notification Center**: Full-page history for Admin/Vendor/User with search, type/status/priority/date filters, pagination, bulk mark-read & delete
- **Email Notification Preferences**: All roles (Admin, Vendor, User) can toggle 7 email categories:
  - Order emails, Return & refund emails, Promotional emails, Support/ticket emails
  - KYC status emails, Credit/wallet emails, Weekly digest
  - Backend checks prefs via `should_send_email()` before sending
  - Integrated into existing Notification Preferences panel
- Resend Email Service verified and working (5/5 sent, 0 failed)

## Production Domain
- https://thepigma.com

## Mocked / Pending
- Instagram Auto-DMs (mock)

## P1 Upcoming Tasks
- "Testing Mode" for Orders (dummy order flow triggering admin alerts)
- Track affiliate/reseller link clicks (referral URL metrics)
- Transition Instagram Auto DM from Mock to real Meta API

## P2 Future/Backlog
- Vendor Email Digest Notifications (weekly digest implementation)
- AdminDashboard.jsx refactoring (3700+ lines)
