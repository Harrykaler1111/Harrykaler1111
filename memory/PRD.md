# Pigma E-commerce Platform - Product Requirements Document

## Original Problem Statement
Build a full-stack AI-powered e-commerce and influencer marketplace platform for Pigma - a premium fashion brand selling bold limited-edition women's boots (5-inch platform and stiletto heels). Focus on exclusivity, high margins, limited drops, and social-media-driven sales.

## User Choices
- **Payment**: Razorpay (MOCKED for demo)
- **Authentication**: JWT + Google OAuth + WhatsApp OTP
- **Social Platforms**: All with Instagram priority (basic integration)
- **AI Features**: Chatbot (MOCKED), Product recommendations
- **Theme**: Light, modern, luxury
- **Marketing**: WhatsApp, push notifications (stubs)

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI + Framer Motion
- **Backend**: FastAPI + MongoDB
- **Authentication**: JWT tokens, Google OAuth via Emergent Auth, OTP verification

## User Personas
1. **Fashion Shoppers** - Women 18-35 seeking luxury limited-edition boots
2. **Influencers** - Content creators promoting products for commission
3. **Affiliates** - Marketers/businesses earning referral commissions
4. **Admin** - Platform managers handling products, orders, approvals

## Core Requirements (Static)
- E-commerce store with product catalog
- User authentication (multi-method)
- Shopping cart and checkout
- Order management
- Influencer marketplace
- Affiliate program
- Admin dashboard
- AI chatbot support

## What's Been Implemented (March 14, 2026)

### Completed Features
- [x] Homepage with hero banner, featured products, new arrivals
- [x] Product catalog with filtering, search, categories
- [x] Product detail pages with size/color selection
- [x] User authentication (email/password, Google OAuth, OTP)
- [x] Shopping cart (add, update, remove items)
- [x] Checkout flow with order creation
- [x] Wishlist functionality
- [x] Order history and tracking
- [x] Influencer program (signup, dashboard, referral tracking)
- [x] Affiliate program (signup, dashboard, commission tracking)
- [x] Admin dashboard (stats, orders, influencer/affiliate management)
- [x] AI Chatbot widget (MOCKED responses)
- [x] Coupon/discount system
- [x] Mobile-responsive design

### MOCKED Integrations
- Razorpay payment (creates mock order IDs)
- AI Chatbot (static responses)
- OTP verification (returns demo OTP)

## Prioritized Backlog

### P0 - Critical (Next Phase)
- [ ] Real Razorpay payment integration
- [ ] Real AI chatbot with GPT-5.2 integration
- [ ] Real Twilio SMS/WhatsApp OTP
- [ ] Product image upload for admin
- [ ] Commission payout system

### P1 - High Priority
- [ ] Push notification integration
- [ ] Email notifications (order confirmation, shipping updates)
- [ ] Instagram API integration (auto-posting)
- [ ] Product reviews and ratings
- [ ] Advanced analytics dashboard

### P2 - Nice to Have
- [ ] Multi-currency support
- [ ] Inventory alerts
- [ ] Abandoned cart recovery
- [ ] A/B testing for landing pages
- [ ] Loyalty points system

## Next Tasks
1. Integrate real Razorpay payment gateway
2. Connect AI chatbot with GPT-5.2 via Emergent integrations
3. Set up Twilio for real OTP verification
4. Add product image upload in admin dashboard
5. Implement email notifications with SendGrid
