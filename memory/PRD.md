# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma" with vendor management, influencer collaboration, admin RBAC, commission auto-settlement, reviews, credit-based promotions, referral commissions, and advanced marketing tools.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Framer Motion
- Backend: FastAPI (Python), 19 route modules
- Database: MongoDB
- Auth: JWT (per role), Google OAuth, RBAC (5 admin roles)
- File Storage: Emergent Object Storage (multi-image/video)

## Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Product Manager: products@pigma.com / products123
- Marketing: marketing@pigma.com / marketing123
- Finance: finance@pigma.com / finance123
- Support: support@pigma.com / support123
- Vendor: testvendor@example.com / vendor123
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
- Advanced Offer System: Time-based, category-based, offer types
- Vendor Category Access: Platform + own categories
- Credit-based Promotion System: Buy credits, promote products
- Platform Fee Enforcement on every sale
- Referral Code Tracking on Orders

### Phase 6 - Phase 3 Completion & Multi-Media Upload (2026-03-26)
- **Admin Action History Page:** Filter by user type and action, paginated history list with timestamps
- **Dedicated Managers Page:** Assign admin managers to vendors/influencers/users, remove assignments
- **Referral Commission Settings:** Vendor & influencer referral rate controls in Platform Settings
- **Resellers Management Page:** Full table with approve/reject/suspend/disconnect/reactivate actions, inline history viewer
- **Suspension History Page:** Filterable log of all admin actions on users
- **Multi-Image/Video Product Upload:** MediaUploader component with drag-and-drop, progress bar, thumbnail previews. Integrated in both Admin and Vendor product creation forms. Backend uses Emergent Object Storage. ProductDetailPage updated to render video media in gallery.
- **Testing:** Iteration 9 - 100% pass (17 backend + all frontend flows)

## MOCKED Integrations
- Razorpay (payments/payouts/credits) -> needs API keys
- Instagram OAuth & DM -> needs Meta credentials
- SMS/Email OTP delivery -> demo OTP returned in response

## Remaining Tasks

### P1 - Upcoming
1. Meta Pixel + Google Ads Pixel integration (global tracking)
2. ManyChat integration (Instagram auto DM via comment triggers)
3. Verify Sales Tracking with Collab Referral Codes on frontend checkout
4. WhatsApp integration (Interakt - needs credentials)

### P2 - Future/Backlog
- Return & Dispute Management system
- Auto Creator Recruitment landing page (Module 18)
- Real AI chatbot integration
- OTP verification for login/registration (real SMS)
- Frontend refactoring (AdminDashboard.jsx 2500+ lines, VendorDashboard.jsx 1300+ lines)
