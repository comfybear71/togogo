# ToGoGo — HANDOFF.md
## Session Handoff Document

**Last Updated:** 2026-04-04 (Session 2 — Admin fixes)
**Session:** Fix admin panel auth + orders/stores display
**Branch:** claude/review-safety-protocol-j8RQJ (PRODUCTION on Vercel)
**Previous Branch:** claude/ipad-dev-prompt-2C4eB (merged to master)

---

## What Was Fixed This Session

### Root Causes Found:
1. **Admin Orders/Stores showed 0 items** — Two bugs:
   - Orders page used `JOIN` instead of `LEFT JOIN` on users table (orders with missing user_id were excluded)
   - Orders & Stores pages read JWT token from Zustand store (`useAuthStore`) which was null/stale on page load. Dashboard & Users pages read from `localStorage` directly and worked fine.
2. **AdminRoute black screen** — After fixing auth, a stale `authLoading` reference (from removed Zustand import) caused a ReferenceError crash on all admin pages.
3. **Admin access from profile** — AdminRoute now verifies admin access via API call (checks DB role) instead of relying on Zustand store's `user.role`.

### Changes Made:
- `api/admin/orders.js` — Changed `JOIN` to `LEFT JOIN`, added error logging
- `api/admin/stores.js` — Added `ensureSchema()`, import fix
- `api/admin/stats.js` — Added error logging to all catch blocks
- `api/admin/debug.js` — NEW: Debug endpoint for raw DB queries
- `src/pages/admin/OrdersPage.jsx` — Read token from localStorage instead of Zustand
- `src/pages/admin/StoresPage.jsx` — Read token from localStorage instead of Zustand
- `src/components/admin/AdminRoute.jsx` — Verify admin via API call, removed Zustand dependency
- `src/pages/ProfilePage.jsx` — Added Admin tab (Shield icon) for admin users

## Current State

### All Working:
- 3,192 AliExpress products in database (growing via cron every 6hrs)
- 4 active stores: stu, jum, stuie, annies-shop (all with ~798 products each)
- Admin panel: ALL 7 pages functional (Dashboard, Users, Products, Orders, Stores, Marketing, Settings)
- Admin Orders: 5 orders showing, $6.63 fees collected
- Admin Stores: 4 stores showing, all Active
- Admin Users: 6 users with roles, stores, revenue
- Admin Products: 3,192 products with pagination (64 pages)
- Storefront: dark theme, product grid, image gallery, categories, cart, checkout
- Stripe Connect: 4 accounts (stu=active, jum=active, stuie=action_required, annies-shop=onboarding)
- Stripe Checkout: destination charges with Connect payment splits
- Email notifications: built with Resend (domain verified, DNS configured, NOT yet tested)
- Profile page: Admin tab for admin users, links to /admin
- Cron: imports products every 6 hours (vercel.json configured)

### AliExpress Integration — FULLY WORKING:
- **OAuth: COMPLETED** — access_token saved in `admin_settings` table (key: `aliexpress_access_token`)
- **Token valid for 30 days** from ~April 3, 2026
- **ds.feedname.get** — returns 135 feeds with product counts
- **ds.recommend.feed.get** — returns products from a feed (50/page)
- **ds.product.get** — TESTED & WORKING — full product details, all images, variants, shipping
- **ds.order.create** — Endpoint BUILT at `/api/orders/submit-to-supplier` (not yet tested with real order)
- **ds.order.get** — Endpoint BUILT at `/api/orders/track` (not yet tested)
- OAuth callback endpoint: `/api/platforms/callback/aliexpress`
- App: ToGoGo, AppKey: 529066, Category: Drop Shipping, Status: Online

### Email Notifications — BUILT, NOT TESTED:
- Resend API key configured in Vercel (`RESEND_API_KEY`)
- togogo.me domain verified in Resend, DNS records configured
- ImprovMX account exists for receiving @togogo.me emails (not yet configured)
- Email templates built in `api/_lib/email.js`:
  - Order confirmation → customer
  - New order alert → store owner
  - New order alert → admin (sfrench71@gmail.com)
- Triggered by `checkout.session.completed` Stripe webhook in `api/webhooks/stripe.js`

### Known Issues:
1. Storefront requires Ctrl+Shift+R on cold start (service worker caching)
2. Storefront theme hardcoded to midnight (theme_id column exists but UI not built)
3. No infinite scroll on storefronts yet
4. Order `687f70cb` (sunglasses $70.20) stuck at `pending_payment` — checkout was cancelled, needs cleanup
5. No order tracking/fulfillment pipeline wired end-to-end
6. Store owner can't manage their own products yet
7. AliExpress orders not yet auto-submitted (endpoint built, not wired into checkout flow)

### Database:
- 3,192 products (798 per store × 4 stores)
- 5 orders (2 Stuart, 3 Jum) — 1 pending, 1 pending_payment, 3 processing
- 6 users (1 admin, 3 subscribers, 2 buyers/test)
- sfrench71@gmail.com = admin role
- All 4 stores have stripe_connect_id
- AliExpress OAuth token stored in admin_settings table

### Environment:
- Production branch: claude/review-safety-protocol-j8RQJ
- All API keys confirmed working in Vercel
- Stripe: Live mode (not test mode) — use real cards for testing
- Resend: togogo.me domain verified, DNS configured
- AliExpress: OAuth token active, full DS API access

## Next Session Priorities

1. **Test email notifications** — place a small test order, verify 3 emails sent
2. **Clean up stale pending_payment order** — cancel order 687f70cb
3. **Wire auto-order flow** — after Stripe payment → auto-submit to AliExpress via ds.order.create
4. **Infinite scroll** — Temu-style product feed on storefronts
5. **Store owner product management** — let owners curate their catalog
6. **Order tracking/fulfillment** — poll ds.order.get, update status, notify customers
7. **Fix service worker caching** — eliminate need for Ctrl+Shift+R
8. **Store themes** — let owners choose from available themes
9. **Configure ImprovMX** — receive emails at @togogo.me addresses

## Important URLs

- Main site: https://togogo.me
- Admin: https://togogo.me/admin
- Profile: https://togogo.me/profile
- Storefronts: https://stu.togogo.me, https://jum.togogo.me, https://stuie.togogo.me, https://annies-shop.togogo.me
- Debug endpoint: https://togogo.me/api/admin/debug?secret=JWT_SECRET
- Product details test: https://togogo.me/api/products/details?id=1005007732555371
- Manual cron: https://togogo.me/api/cron/import-products?secret=JWT_SECRET
- Fix admin role: https://togogo.me/api/admin/fix-role?secret=JWT_SECRET

## Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/products/details?id=PRODUCT_ID` | GET | Full product details from AliExpress DS API |
| `/api/orders/submit-to-supplier` | POST | Submit order to AliExpress (ds.order.create) |
| `/api/orders/track?orderId=AE_ORDER_ID` | GET | Track AliExpress order (ds.order.get) |
| `/api/storefront/checkout` | POST | Stripe Checkout with Connect payment splits |
| `/api/connect/onboard` | POST | Stripe Connect embedded onboarding |
| `/api/connect/status` | GET | Check Connect account status |
| `/api/cron/import-products` | GET | Import products from AliExpress feeds |
| `/api/admin/debug` | GET | Raw DB query results for debugging |
