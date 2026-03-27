# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma" with vendor management, influencer collaboration, admin RBAC, commission auto-settlement, reviews, credit-based promotions, referral commissions, support tickets, reward campaigns, payment enforcement, returns/disputes, and marketing tools.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Framer Motion
- Backend: FastAPI (Python), 23+ route modules
- Database: MongoDB
- Auth: JWT (per role), Google OAuth, RBAC (6 admin roles)
- File Storage: Emergent Object Storage (multi-image/video)
- Payments: Razorpay (mocked until API keys configured)

## Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Product Manager: products@pigma.com / products123
- Marketing: marketing@pigma.com / marketing123
- Finance: finance@pigma.com / finance123
- Support Manager: support@pigma.com / support123
- Sales Manager: sales@pigma.com / sales123
- Vendor: testvendor@example.com / vendor123
- User: harpreetkaler750@gmail.com / Harpreet@123

## Completed Features

### Phase 0-5 (Foundation through Advanced Marketplace)
- MVP e-commerce, admin RBAC, vendor system, auto commission settlement
- Collab system, Reviews, Vendor Store Pages, Top/Best Sellers
- Password Reset (OTP), Strict RBAC, Advanced Offers
- Credit Promotions, Platform Fee Enforcement, Action History

### Phase 6 - Multi-Media Upload (2026-03-26)
- MediaUploader component, Admin + Vendor product forms, video support

### Phase 7 - Complete Support Ticket System (2026-03-26)
- Ticket creation (8 categories, 3 priorities, attachments)
- User/Vendor/Admin dashboards with full lifecycle, SLA, Knowledge Base

### Phase 8 - Payment Enforcement, Rewards, Sales Manager (2026-03-26)
- Unread ticket badge, Vendor wallet top-up, Collab payment enforcement
- Reward campaigns, Sales Manager role, Featured vendors control

### Phase 9 - Returns, Creator Recruitment, Pixel Settings (2026-03-26)
- Return & Dispute Management, Creator Recruitment Landing Page

### Phase 10 - Credit System, ChatWidget, Marketing Hub (2026-03-26)
- Real-Money Credit System with Razorpay (mocked w/o keys)
- ChatWidget + Ticket Integration (dual-mode: ticket creation + AI chat)
- Admin Marketing Hub (RBAC: Super Admin & Marketing Manager)
- Zomato-style Top Vendors in Hero Section

### Phase 10.5 - Vendor Analytics Dashboard (2026-03-26)
- Summary Cards, 30-day Sales Trend Chart, Top Products Table
- Credit Analytics (usage breakdown by type + transactions)

### Phase 11 - Hero Section Video Background (2026-03-27)
- **Full-screen video hero:** Replaced static image with autoplay looping video of fashion model wearing boots/products
- **Video source:** Mixkit CDN (52278 - model in white dress with red boots) with local fallback
- **Video attributes:** autoPlay, muted, loop, playsInline for seamless playback
- **Public asset serving:** Added `/api/uploads/assets/{path}` endpoint for static asset delivery
- **Poster fallback:** Unsplash fashion photo shows while video loads

## MOCKED Integrations
- Razorpay -> needs RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET
- Instagram OAuth & DM -> needs Meta credentials
- SMS/Email/WhatsApp notifications -> demo OTP

## Remaining Tasks

### P1 - Upcoming
1. Custom Instagram Auto DM system (requires Meta API credentials)
2. Advanced Referral Commission logic (Tiered: 1% for 1, 1.5% for 10+)
3. WhatsApp Cart Reminder System
4. Meta Pixel & Google Ads Pixel frontend injection

### P2 - Future/Backlog
- Real payment gateway integration (Razorpay live keys)
- OTP verification (real SMS)
- Frontend refactoring (AdminDashboard 3300+ lines)
