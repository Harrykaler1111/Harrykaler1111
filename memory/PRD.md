# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma" with vendor management, influencer collaboration, admin RBAC, commission auto-settlement, reviews, credit-based promotions, referral commissions, support tickets, and advanced marketing tools.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Framer Motion
- Backend: FastAPI (Python), 20 route modules
- Database: MongoDB
- Auth: JWT (per role), Google OAuth, RBAC (5 admin roles)
- File Storage: Emergent Object Storage (multi-image/video)

## Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Product Manager: products@pigma.com / products123
- Marketing: marketing@pigma.com / marketing123
- Finance: finance@pigma.com / finance123
- Support Manager: support@pigma.com / support123
- Vendor: testvendor@example.com / vendor123
- User: harpreetkaler750@gmail.com / Harpreet@123

## Completed Features

### Phase 0-2 (Foundation)
- MVP e-commerce, admin RBAC, vendor registration/KYC/dashboard
- Auto commission settlement, platform settings
- Reseller system, basic coupon/offer system

### Phase 3-5 (Collaboration, Auth, Marketplace)
- Collab system (referral codes, fixed payments, resend)
- Reviews UI, Vendor Store Pages, Top/Best Sellers
- Password Reset (OTP), Strict RBAC
- Advanced Offers, Vendor Categories, Credit Promotions
- Platform Fee Enforcement, Action History

### Phase 6 - Multi-Media Upload (2026-03-26)
- MediaUploader component (drag-drop, progress, thumbnails)
- Integrated in Admin + Vendor product forms
- Backend Object Storage + ProductDetailPage video support
- Testing: Iteration 9 - 100% pass

### Phase 7 - Complete Support Ticket System (2026-03-26)
- **Ticket Creation:** Users, vendors, influencers can raise tickets with title, description, category (8 predefined), priority (low/medium/high), attachments
- **Unique Ticket IDs:** Auto-generated `tkt_` prefixed IDs
- **User Support Dashboard:** `/support` route - list tickets, create new, view detail, reply, reopen, status filters
- **Vendor Support Tab:** `/vendor/support` - same features within vendor dashboard
- **Admin Support Panel:** `/admin/tickets` - view all tickets, analytics cards (total/open/in-progress/waiting/resolved/escalated), filters (status/priority/category/search), assign to agents, change status, reply, escalate
- **Ticket Workflow:** Open → Assigned → In Progress → Waiting for User → Resolved → Closed
- **SLA Timers:** High=4hrs, Medium=12hrs, Low=24hrs with visual overdue indicators
- **Escalation System:** Admin can escalate tickets, overdue SLA highlighted
- **Knowledge Base:** Admin can create FAQ articles, shown as suggestions during ticket creation
- **RBAC:** Super Admin + Support Manager have `tickets` view/manage permissions
- **Security:** Users see only their tickets, admins see all
- **Testing:** Iteration 10 - 20/20 backend tests passed, all frontend verified

## MOCKED Integrations
- Razorpay (payments/payouts/credits) -> needs API keys
- Instagram OAuth & DM -> needs Meta credentials
- SMS/Email/WhatsApp notifications -> demo OTP returned in response

## Remaining Tasks

### P0 - Current Request (Advanced Features)
1. Payment Enforcement: Mandatory platform payments for collabs, vendor wallet top-up, penalty system (3 strikes → auto-suspend)
2. Target-Based Reward System (admin creates campaigns, tracks progress)
3. Sales Manager role with specific permissions
4. Top Listing manual control (admin/marketing override)

### P1 - Upcoming
1. Meta Pixel + Google Ads Pixel integration (global tracking)
2. Custom Instagram Auto DM system (requires Meta API credentials)
3. WhatsApp Cart Reminder (requires Interakt/WhatsApp API)
4. Verify Sales Tracking with Collab Referral Codes on frontend checkout

### P2 - Future/Backlog
- Return & Dispute Management system
- Auto Creator Recruitment landing page
- WhatsApp integration (Interakt)
- Real AI chatbot integration
- Frontend refactoring (AdminDashboard.jsx 2850+ lines, VendorDashboard.jsx 1550+ lines)
