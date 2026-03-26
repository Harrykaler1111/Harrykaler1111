# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma" with vendor management, influencer collaboration, admin RBAC, commission auto-settlement, reviews, credit-based promotions, referral commissions, and advanced marketing tools.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Framer Motion
- Backend: FastAPI (Python), 19 route modules
- Database: MongoDB
- Auth: JWT (per role), Google OAuth, RBAC (5 admin roles)

## Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Product Manager: products@pigma.com / products123
- Marketing: marketing@pigma.com / marketing123
- Finance: finance@pigma.com / finance123
- Support: support@pigma.com / support123
- Vendor: vendortest3@example.com / vendor123
- Influencer: testinfluencer@example.com / influencer123
- User: harpreetkaler750@gmail.com / Harpreet@123

## Completed Features

### Phase 0-2 (Foundation)
- MVP e-commerce, admin RBAC, vendor registration/KYC/dashboard
- Auto commission settlement, platform settings
- Reseller system, basic coupon/offer system

### Phase 3 - Collaboration & Reviews (2026-03-26)
- Collab accept bug fix, Reviews UI, Vendor Store Pages
- Top Sellers + Best Sellers on homepage

### Phase 4 - Auth & Admin (2026-03-26)
- Password Reset (OTP-based for all roles)
- Strict RBAC (Product Manager: products only; Marketing: coupons only)
- Collab referral codes, fixed payment, resend, sales tracking
- Action History system
- Forgot Password UI on auth + vendor-login pages

### Phase 5 - Advanced Marketplace (2026-03-26)
- **Advanced Offer System:** Time-based (starts_at/expires_at), category-based, offer types. Validation checks time windows + categories. Public active offers endpoint.
- **Vendor Category Access:** Platform categories + own categories. Create/delete vendor categories via UI.
- **Credit-based Promotion System:** Buy credits (MOCKED payment), promote products to Top 20 (₹50/day), Top 100 (₹20/day), Category Top (₹30/day). Full vendor Promotions page with balance, buy, promote UI.
- **Platform Fee Enforcement:** Applied on every sale via order settlement logic.
- **Referral Code Tracking on Orders:** Orders with collab referral codes update collaboration sales metrics.
- **Testing:** iterations 7-8: 47/47 backend + all frontend flows passed

## MOCKED Integrations
- Razorpay (payments/payouts/credits) -> needs API keys
- Instagram OAuth & DM -> needs Meta credentials
- SMS/Email OTP delivery -> demo OTP returned in response

## Remaining Tasks (from user's 16-item request)

### P1 - In Progress
1. Referral Commission System (vendor 1%, influencer 1%, super admin controls)
2. Dedicated Manager System (manager per vendor/influencer)
3. Product multiple image/video upload
4. Action History full frontend in admin panel

### P2 - Upcoming
5. Meta Pixel + Google Ads Pixel integration
6. ManyChat integration (needs API key)
7. WhatsApp integration (Interakt - needs credentials)
8. OTP verification for login/registration

### Future/Backlog
- Return & Dispute Management
- Auto Creator Recruitment landing page
- Real AI chatbot, CRM, SEO tools
- Frontend refactoring (monolithic dashboard files)
