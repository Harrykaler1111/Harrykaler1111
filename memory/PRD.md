# Pigma - Premium Multi-Vendor E-Commerce Platform

## Original Problem Statement
Build "Pigma", a premium full-stack AI-powered multi-vendor e-commerce platform.

## Tech Stack
- Frontend: React, Tailwind CSS, framer-motion, Shadcn UI, react-easy-crop
- Backend: FastAPI, Python, Pandas
- Database: MongoDB
- Integrations: Interakt (WhatsApp API), Razorpay (Mocked), Emergent Object Storage

## What's Been Implemented
- Multi-vendor product management with admin & vendor dashboards
- Admin Product Photo Cropping (zoom, rotate, 4:5 aspect ratio)
- Bulk Product Upload System (CSV/Excel + ZIP, chunked upload, semicolon SKU support)
- **Seamless Cart Merge on Login** — Guest cart (LocalStorage) merges into server cart on login, same items sum quantities, checkout waits for merge to complete
- Quick Add buttons on "You May Also Like" cards, Cart Drawer opens on Add to Cart
- Cart Boosters, Flash Sales, Quick Adds, FOMO notifications, Dummy Reviews
- Real Interakt WhatsApp Integration (OTP, Support Tickets, Webhooks)
- Dynamic RBAC, Affiliate & Reseller System with price overrides
- Guest Cart System (LocalStorage), login only at checkout
- Image filtering: All customer-facing endpoints filter out imageless products

## Recent Bug Fixes (Apr 2026)
- **Cart items disappearing after login**: Fixed race condition — CheckoutPage now waits for `isMerging` to complete before fetching server cart. Also fixed swapped login() parameters in CheckoutAuthModal.
- Quick Add buttons on cart recommendations
- Admin photo cropping, bulk upload chunked upload, SKU/image matching
- **Crop existing photo infinite processing (Feb 2026)**: Fixed `createCroppedImage` in `ImageCropModal.jsx` — remote images now fetched as blob URLs first (avoids CORS/tainted canvas), added `onerror` rejection and `try-catch` around `toBlob`.

## Mocked Services
- Razorpay (Payments), Instagram Auto-DMs

## P1 Upcoming Tasks
- Track affiliate/reseller link clicks (referral URL metrics)
- "Testing Mode" for Orders (dummy order flow)
- Transition Instagram Auto DM from Mock to real Meta API

## P2 Future/Backlog
- Vendor Email Digest Notifications
- A/B testing for hero videos
- AdminDashboard.jsx / VendorDashboard.jsx refactoring
