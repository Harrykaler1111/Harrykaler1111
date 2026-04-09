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
- Real-Time WebSocket Notification System (Admin + Vendor)
- Browser Push Notifications, Notification Preferences, Quiet Hours
- **Razorpay Payment Gateway (LIVE)**: Checkout popup, signature verification, webhook support
- **Order Email Notification System**: Branded HTML emails via Resend to Admin/Vendor/Reseller with role-based sender addresses
- **Enhanced Admin Orders Dashboard**: Advanced search, time filters, payment filters, click-to-call, email status, commission breakdown
- **Notification Click Navigation Fix**: Correct nested route URLs, old URL normalization, fallback routing
- **User (Buyer) Notification System**: Full notification bell in storefront Header for ALL logged-in users with triggers on order events, returns, support, and promotions
- **Notification Bell Bug Fix**: Optimistic updates with error rollback for both Admin and User notification bells. Added token null-guard, proper error logging, and toast error feedback on API failures.

## Production Domain
- https://thepigma.com

## Mocked / Pending
- Instagram Auto-DMs (mock)

## P1 Upcoming Tasks
- "Testing Mode" for Orders (dummy order flow triggering admin alerts)
- Track affiliate/reseller link clicks (referral URL metrics)
- Transition Instagram Auto DM from Mock to real Meta API

## P2 Future/Backlog
- Vendor Email Digest Notifications
- AdminDashboard.jsx refactoring (3700+ lines)
