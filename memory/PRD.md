# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma" with vendor management, influencer collaboration, admin RBAC, commission auto-settlement, reviews, credit-based promotions, referral commissions, support tickets, reward campaigns, payment enforcement, returns/disputes, and marketing tools.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Framer Motion
- Backend: FastAPI (Python), 23 route modules
- Database: MongoDB
- Auth: JWT (per role), Google OAuth, RBAC (6 admin roles)
- File Storage: Emergent Object Storage (multi-image/video)

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
- **Return & Dispute Management:** Full system - user requests return (8 reasons), vendor approves/rejects, user can escalate dispute to admin. Admin override controls. Status: Requested → Vendor Approved/Rejected → Disputed → Refund Processing → Refunded → Closed
- **Referral Code Tracking Fix:** Checkout now passes `ref` param from URL/localStorage to order API. LayoutWrapper captures referral codes from any page URL
- **Creator Recruitment Landing Page:** Public `/creators` route with hero, benefits (6 cards), how-it-works (3 steps), testimonials (3 stories), CTA sections
- **Sales Manager Account:** Created with RBAC permissions (offers, coupons, analytics, settings)
- **Marketing Pixel Settings:** Admin can configure Meta Pixel ID and Google Ads Conversion ID from Settings panel, ready to activate when credentials provided
- **Testing:** Iteration 12 - 100% pass (17 backend + all frontend verified)

## MOCKED Integrations
- Razorpay (payments/payouts/wallet/refunds) -> needs API keys
- Instagram OAuth & DM -> needs Meta credentials
- SMS/Email/WhatsApp notifications -> demo OTP

## Remaining Tasks

### P1 - Upcoming
1. Meta Pixel & Google Ads Pixel frontend injection (when IDs configured)
2. Custom Instagram Auto DM system (requires Meta API credentials)
3. WhatsApp Cart Reminder (requires API key)
4. WhatsApp integration via Interakt

### P2 - Future/Backlog
- Real payment gateway integration (Razorpay live keys)
- OTP verification for login/registration (real SMS)
- AI chatbot integration
- Frontend refactoring (AdminDashboard 3200+ lines, VendorDashboard 1800+ lines)
