# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma" with vendor management, influencer collaboration, admin RBAC, commission auto-settlement, reviews, credit-based promotions, referral commissions, support tickets, reward campaigns, payment enforcement, returns/disputes, marketing tools, and gamified cart experience.

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
- Vendor: testvendor@example.com / vendor123
- Note: Demo credentials are NO LONGER shown on login pages

## Completed Features (Latest)

### Phase 28 - Header Navigation & Mega Menu (2026-03-28)
- Amazon-style mega menu, Partner with Us dropdown, Sell on Pigma CTA
- Responsive hamburger mobile menu
- Testing: Iteration 32 - PASS

### Phase 29 - UI Layout Fixes, Compact Grid & Quick Add System (2026-03-28)
- Header-Booster gap eliminated, Cart center modal, 5-per-row product grid
- Always-visible Quick Add with qty controller, Upsell popup 4 per row
- Testing: Iteration 33 - PASS

### Phase 30 - Security & Super Admin Control System (2026-03-28)
- **Credential Cleanup:** Removed ALL demo credentials from AdminLoginPage and AuthPage. Auth page now links to /admin-login instead
- **Mobile Booster Fix:** Moved mobile booster bar from `bottom-0` to `top-16` (sticky below header). No overlap, proper alignment
- **Super Admin User Management:**
  - View all admin users with name, email, role, status, last login
  - Edit user details (name, email, role, phone) — Super Admin only
  - Reset password: Generates secure 12-char random or custom password, returns ONCE (never reveals existing passwords). Stores bcrypt hash only
  - Enable/Disable accounts: Toggle with reason logging. Disabled accounts cannot login (403)
  - Delete users (except super_admin role and self)
- **Activity Log System:**
  - `admin_activity_log` collection tracks: login, password_reset, account_disabled, account_enabled, user_edited
  - Stores actor_id, actor_name, actor_role, target_user_id, target_user_email, details, timestamp
  - Super Admin-only access via Activity Log tab in Admin Users panel
  - Sorted by timestamp descending, paginated
- **Role-Based Access Enforcement:**
  - Only super_admin can: reset passwords, toggle status, edit users, view activity log
  - Non-super-admin gets 403 on all control endpoints
  - Cannot modify own account (reset password, disable)
- **Security Rules:** Passwords never shown in UI, bcrypt hashing, JWT auth, all actions audited
- **Testing:** Iteration 34 - PASS (20/20 backend + 100% frontend verified)

### Earlier Phases (12-27.1)
- Phases 12-27.1: Site Settings, Cart Value Booster, Cart Drawer, Product Page UX, Image Crop, Reviews, Order Flow, Admin Notifications, Order Timeline, Categories, Quick Add, Products Hub, Cart Booster Upsell, Advanced Checkout, Frequently Bought Together, Bundle Deals, Flash Sales, Push Notifications, Flash Sale Banner Refinement

## MOCKED Integrations
- Razorpay -> needs RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET
- Instagram Graph API -> needs Meta credentials
- WhatsApp Business API -> needs API key

## Remaining Tasks

### P1 - Upcoming
- "Testing Mode" for Orders: Dev/test flow to place dummy orders and verify notifications
- Real Instagram Graph API (when credentials provided)
- Real WhatsApp Business API (when credentials provided)

### P2 - Future/Backlog
- Phone/OTP verification for shipping (needs SMS provider)
- Real Razorpay live keys
- Real Meta Pixel / Google Ads pixel IDs
- Frontend refactoring (AdminDashboard 3300+ lines -> smaller components)
- Vendor email digest notifications
- A/B testing for hero videos
