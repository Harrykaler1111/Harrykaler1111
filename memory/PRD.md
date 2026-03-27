# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma" with vendor management, influencer collaboration, admin RBAC, commission auto-settlement, reviews, credit-based promotions, referral commissions, support tickets, reward campaigns, payment enforcement, returns/disputes, and marketing tools.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Framer Motion
- Backend: FastAPI (Python), 24+ route modules
- Database: MongoDB
- Auth: JWT (per role), Google OAuth, RBAC (6 admin roles)
- File Storage: Emergent Object Storage (multi-image/video)
- Payments: Razorpay (mocked until API keys configured)

## Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Marketing: marketing@pigma.com / marketing123
- Finance: finance@pigma.com / finance123
- Support: support@pigma.com / support123
- Sales: sales@pigma.com / sales123
- Vendor: testvendor@example.com / vendor123
- User: harpreetkaler750@gmail.com / Harpreet@123

## Completed Features

### Phase 0-9 (Foundation through Returns & Recruitment)
- MVP e-commerce, admin RBAC, vendor system, auto commission settlement
- Collab system, Reviews, Vendor Store Pages, Top/Best Sellers
- Password Reset (OTP), Credit Promotions, Platform Fee Enforcement
- Multi-Media Upload, Support Tickets (8 categories, SLA)
- Vendor Wallet, Reward Campaigns, Return & Dispute Management

### Phase 10 - Credit System, ChatWidget, Marketing Hub (2026-03-26)
- Real-Money Credit System with Razorpay (mocked w/o keys)
- ChatWidget + Ticket Integration (dual-mode)
- Admin Marketing Hub (RBAC restricted)
- Zomato-style Top Vendors in Hero Section

### Phase 10.5 - Vendor Analytics Dashboard (2026-03-26)
- Summary Cards, 30-day Sales Trend Chart, Top Products Table
- Credit Analytics (usage breakdown + transactions)

### Phase 11 - Hero Video & Full-Screen Background (2026-03-27)
- Full-screen video hero with dynamic URL from DB settings
- Admin-uploadable/changeable video via Hero Video Management panel

### Phase 12 - Site Settings, Integrations & Tracking (2026-03-27)
- **Admin Hero Video Management:** Super Admin can upload video (MP4/WebM up to 50MB) or paste URL. Video preview, poster URL setting. Stored in Emergent Object Storage, DB-backed config.
- **Advanced Tiered Referral Commission:** 3 default tiers (1%/1.5%/2%), fully configurable. Add/remove/edit tiers. Toggle enable/disable. Tracking report showing all referrers with their tier, rate, and earnings.
- **Instagram Auto DM System (MOCKED):** Connect Instagram handle + Meta Graph API token. Create keyword-trigger auto-DM rules. Test DM sending with simulated history log. Ready for real Meta API when credentials provided.
- **WhatsApp Cart Reminder System (MOCKED):** Connect WhatsApp Business API. Enable/disable auto-reminders. Configurable delay (hours) and message template with {name}/{cart_link} variables. Test reminder sending. Ready for real API.
- **Meta Pixel & Google Ads Pixel Injection:** TrackingPixels component in App.js reads pixel IDs from backend. Injects Facebook Pixel (fbq) and Google Ads (gtag) scripts globally. Auto-tracks PageView on route changes. Export helpers: trackPurchase(), trackAddToCart(), trackEvent().
- **Testing:** Iteration 15 - 100% (22/22 backend, all frontend verified)

## MOCKED Integrations
- Razorpay -> needs RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET
- Instagram Graph API -> needs Meta App credentials (handle + access token)
- WhatsApp Business API -> needs API key + phone number
- SMS/Email notifications -> demo OTP
- Tracking Pixels -> test IDs configured (TEST_META_PIXEL_123456, TEST_GOOGLE_ADS_789012)

## Code Architecture
```
/app/backend/routes/
  site_settings_routes.py  # NEW: Hero video, referral tiers, IG DM, WA reminders, pixels
  vendor_routes.py         # Credits, promotions, analytics
  support_ticket_routes.py # Tickets
  ...24+ route files

/app/frontend/src/components/
  AdminSiteSettings.jsx    # NEW: HeroVideoManagement, ReferralTiersManagement, InstagramDMManagement, WhatsAppRemindersManagement
  TrackingPixels.jsx       # NEW: Meta Pixel + Google Ads injection
  ChatWidget.jsx           # Ticket creation + AI chat
  ...
```

## Remaining Tasks

### P2 - Future/Backlog
- Real Instagram Graph API integration (when credentials provided)
- Real WhatsApp Business API integration (when credentials provided)
- Real Razorpay live keys
- Real Meta Pixel / Google Ads pixel IDs
- Real SMS/OTP verification
- Frontend refactoring (AdminDashboard 3300+ lines)
- Email digest notifications for vendors
