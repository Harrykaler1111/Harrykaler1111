# Pigma Multi-Vendor E-commerce & Influencer Marketplace - PRD

## Original Problem Statement
Build a full-stack AI-powered multi-vendor e-commerce and influencer marketplace platform "Pigma" with vendor management, influencer collaboration, admin RBAC, commission auto-settlement, reviews, credit-based promotions, referral commissions, support tickets, reward campaigns, payment enforcement, returns/disputes, marketing tools, and gamified cart experience.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Framer Motion
- Backend: FastAPI (Python), 30+ route modules
- Database: MongoDB
- Auth: JWT (per role), Google OAuth, RBAC (6 admin roles + dynamic permissions)
- File Storage: Emergent Object Storage
- Payments: Razorpay (mocked until API keys configured)
- WhatsApp: Interakt Business API (REAL - Growth Plan)
- Libraries: Pandas, openpyxl (for CSV/Excel bulk upload)

## Credentials
- Super Admin: superadmin@pigma.com / superadmin123
- Marketing: marketing@pigma.com / marketing123
- Product Manager: products@pigma.com / products123
- Vendor: testvendor@example.com / vendor123
- Customer/Affiliate/Reseller: admin@pigma.com / admin123

## Completed Features

### Phase 44 - WhatsApp-Based Ticket/Support System (2026-04-04)
- **Support Page Rewrite**: Removed standalone ticket creation form. New page shows WhatsApp CTA ("Chat & Raise Ticket on WhatsApp"), 6 quick issue categories, phone number, and read-only ticket history for logged-in users.
- **ChatWidget Rewrite**: Replaced ticket form + AI chat with WhatsApp support widget. "Chat on WhatsApp" primary CTA + category selector with pre-filled messages. No forms, no AI.
- **Vendor Support Rewrite**: Removed ticket creation form. WhatsApp CTA + ticket history. Vendors contact support via WhatsApp.
- **Backend Auto-Ticket from WhatsApp**: Enhanced Interakt webhook (`handle_customer_reply`) to auto-create tickets when WhatsApp messages arrive. Parses context (order ID, product, category). De-duplicates within 5-min window. COD confirmations filtered out.
- **Admin Panel Enhancement**: Added WhatsApp source badge to ticket table and detail view. Shows phone number for WhatsApp tickets.
- **Guest Access**: /support and /cart pages no longer require authentication.
- **Testing**: Iteration 44 — 100% backend (12/12), 100% frontend

### Phase 43 - Guest Cart, Vendor Credits, Dummy Reviews, FOMO (2026-04-04)
- Guest Cart System (localStorage), CartContext API migration, Vendor Cart Booster Credits, Admin Dummy Reviews, FOMO Notifications
- Testing: Iteration 43 — 100% pass

### Phase 37-42 - WhatsApp Integration, Image Fix, Bulk Upload, Reseller Override
- Interakt WhatsApp global integration, Image pipeline audit, Bulk product upload, Reseller price override

### Earlier Phases (12-36)
- Full platform: Security, Cart Booster, Flash Sales, Mega Menu, Quick Add, Bundles, Checkout, RBAC, Affiliate/Reseller System, etc.

## Key DB Collections
- `products`, `vendor_products`, `bulk_upload_sessions`, `vendor_wallets`, `credit_transactions`, `product_promotions`
- `reviews` (customer + dummy), `fomo_settings`, `tickets` (now includes WhatsApp-sourced tickets with `source: "whatsapp"`)
- `whatsapp_webhooks`, `whatsapp_messages`, `reseller_links`, `affiliate_links`, `admin_permissions`

## MOCKED: Razorpay, Instagram Graph API, Interakt auto-reply (may fail without API key)
## REAL: Interakt WhatsApp Business API (for order webhooks, COD confirmation, cart recovery)

## Remaining Tasks
### P1
- Track affiliate/reseller link clicks and conversions
- "Testing Mode" for Orders (dummy order flow for admin alerts)
- Real Instagram Meta API integration

### P2
- AdminDashboard.jsx refactoring (3500+ lines)
- Vendor email digest notifications
- A/B testing for hero videos
- Real Razorpay live keys
