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
- Unread ticket badge, Vendor wallet top-up, Collab payment enforcement (3-strike suspend)
- Reward campaigns, Sales Manager role, Featured vendors control

### Phase 9 - Returns, Creator Recruitment, Pixel Settings (2026-03-26)
- Return & Dispute Management (full lifecycle)
- Referral Code Tracking Fix, Creator Recruitment Landing Page
- Sales Manager Account, Marketing Pixel Settings UI

### Phase 10 - Credit System, ChatWidget, Marketing Hub, UI Update (2026-03-26)
- **Real-Money Credit System:** Razorpay-integrated credit purchase with order creation, payment verification, and transaction history. Auto-mocks when keys not configured. Credits only deducted on successful product promotion.
- **ChatWidget + Ticket Integration:** Rebuilt ChatWidget with dual-mode: "Create Support Ticket" (structured form → POST /api/tickets with category/priority/description) and "Quick Chat with AI". Globally accessible on all customer-facing pages. Login required for ticket creation.
- **Admin Marketing Hub:** Renamed Coupons tab to "Marketing" in sidebar. Contains Coupons & Offers, Sales Targets, and Rewards tabs. RBAC restricted to Super Admin and Marketing Manager only.
- **Zomato-style Top Vendors:** Moved Top Sellers from lower page section to immediately below Hero. Redesigned as circular avatars with store initials, horizontal scroll, hover effects. Clickable → navigates to vendor store.
- **Testing:** Iteration 13 - 100% pass (20 backend + all frontend verified)

## MOCKED Integrations
- Razorpay (payments/payouts/wallet/refunds/credits) -> needs RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET
- Instagram OAuth & DM -> needs Meta credentials
- SMS/Email/WhatsApp notifications -> demo OTP

## Remaining Tasks

### P1 - Upcoming
1. Custom Instagram Auto DM system (requires Meta API credentials, NOT ManyChat)
2. Advanced Referral Commission logic (Tiered: 1% for 1, 1.5% for 10+)
3. WhatsApp Cart Reminder System (requires API key)
4. Meta Pixel & Google Ads Pixel frontend injection (when IDs configured)

### P2 - Future/Backlog
- Real payment gateway integration (Razorpay live keys)
- OTP verification for login/registration (real SMS)
- AI chatbot integration enhancement
- Frontend refactoring (AdminDashboard 3300+ lines, VendorDashboard 1800+ lines)
