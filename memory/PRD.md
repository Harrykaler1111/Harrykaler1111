# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma" with vendor management, influencer collaboration, admin RBAC, commission auto-settlement, reviews, credit-based promotions, referral commissions, support tickets, reward campaigns, payment enforcement, and advanced marketing tools.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Framer Motion
- Backend: FastAPI (Python), 21 route modules
- Database: MongoDB
- Auth: JWT (per role), Google OAuth, RBAC (6 admin roles)
- File Storage: Emergent Object Storage (multi-image/video)

## Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Product Manager: products@pigma.com / products123
- Marketing: marketing@pigma.com / marketing123
- Finance: finance@pigma.com / finance123
- Support Manager: support@pigma.com / support123
- Sales Manager: (needs account creation)
- Vendor: testvendor@example.com / vendor123
- User: harpreetkaler750@gmail.com / Harpreet@123

## Completed Features

### Phase 0-5 (Foundation through Advanced Marketplace)
- MVP e-commerce, admin RBAC, vendor system (reg/KYC/dashboard)
- Auto commission settlement, platform settings
- Collab system (referral codes, fixed payments, resend)
- Reviews, Vendor Store Pages, Top/Best Sellers
- Password Reset (OTP), Strict RBAC
- Advanced Offers, Vendor Categories, Credit Promotions
- Platform Fee Enforcement, Action History

### Phase 6 - Multi-Media Upload (2026-03-26)
- MediaUploader component (drag-drop, progress, thumbnails)
- Integrated in Admin + Vendor product forms, video support

### Phase 7 - Complete Support Ticket System (2026-03-26)
- Ticket creation with 8 categories, 3 priorities, file attachments
- User/Vendor/Admin dashboards with full lifecycle workflow
- SLA timers, escalation, Knowledge Base
- RBAC: Super Admin + Support Manager access

### Phase 8 - Payment Enforcement, Rewards, Sales Manager (2026-03-26)
- **Unread Ticket Badge:** Real-time notification count in user header dropdown
- **Vendor Wallet Top-Up:** Add money via mocked Razorpay with quick-fill amounts
- **Payment Enforcement on Collabs:** Fixed payments auto-deducted from vendor wallet on collab acceptance. Insufficient balance → payment_pending status. 3 failures → auto-suspend
- **Target-Based Reward Campaigns:** Admin creates campaigns with target amounts and rewards, tags vendors/influencers, tracks progress with visual progress bars
- **Sales Manager Role:** New RBAC role with permissions for offers, coupons, analytics, platform settings
- **Top Listing / Featured Vendors:** Admin/Marketing Manager can manually push vendors to featured list with position control, remove featured status
- **Testing:** Iterations 10-11 - 100% pass rate (33+ backend tests, full frontend verification)

## MOCKED Integrations
- Razorpay (payments/payouts/wallet top-up) -> needs API keys
- Instagram OAuth & DM -> needs Meta credentials
- SMS/Email/WhatsApp notifications -> demo OTP

## Remaining Tasks

### P1 - Upcoming
1. Meta Pixel + Google Ads Pixel integration (global tracking)
2. Custom Instagram Auto DM system (requires Meta API credentials)
3. WhatsApp Cart Reminder (requires API key)
4. Verify Sales Tracking with Collab Referral Codes on checkout

### P2 - Future/Backlog
- Return & Dispute Management system
- Auto Creator Recruitment landing page
- WhatsApp integration (Interakt)
- Create Sales Manager admin account
- Frontend refactoring (AdminDashboard 3000+ lines, VendorDashboard 1600+ lines)
