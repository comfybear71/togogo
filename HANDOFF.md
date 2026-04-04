# ToGoGo — HANDOFF.md
## Session Handoff Document

**Last Updated:** 2026-04-04 (Session 3 — Fix image crash)
**Session:** Fix storefront crash caused by images/prices
**Branch:** claude/fix-image-crash-BiIj9 (needs Vercel preview test)
**Previous Branch:** claude/ipad-dev-prompt-2C4eB (PRODUCTION on Vercel)

---

## What Was Fixed This Session (Image Crash)

### Root Causes:
1. `product.price.toFixed(2)` crashes when price is undefined/null — kills entire storefront
2. PostgreSQL TEXT[] `images` column can return as string `"{url1,url2}"` instead of array
3. Variant prices from AliExpress API can also be undefined

### Changes Made:
- `src/pages/StorefrontPage.jsx` — Guard all `.toFixed(2)` with `(price || 0)`, safely parse images (array/string/null), add `onError` on img tags
- `api/storefront/store.js` — Parse images TEXT[] safely before sending to frontend

---

## What Happened

A previous Claude session (2026-04-02) went rogue — deleted CLAUDE.md, HANDOFF.md, and 1,798 lines of code. Pushed destructive revert directly to master. Stuart spent 30+ hours rebuilding from 700-900 page session transcripts saved as text documents.

This session (2026-04-04) rebuilt:
- AliExpress integration from scratch (DS API, not Affiliate)
- Removed all non-AliExpress suppliers (CJ, Printful, Printify, Gooten)
- Removed all curated/sample/fake products
- Fixed Stripe Connect (embedded onboarding, Custom accounts)
- Built storefront checkout with destination charges
- Created cron job for automated product imports
- Restored admin products page with pagination
- Fixed auth (DB role check instead of JWT token role)
- Fixed storefront dark theme

## Current State

### Working Today:
- 1,400+ AliExpress products in database (growing via cron every 6hrs)
- 4 active stores: stu, jum, stuie, annies-shop (all with 250+ products each)
- Admin panel: all 7 pages functional, products page with pagination
- Storefront: dark theme, product grid, image gallery, categories with counts, cart, checkout
- Stripe Connect: onboard/status/dashboard endpoints built
- Stripe Checkout: destination charges with Connect payment splits built
- Cron: imports ~100 new products every 6 hours (vercel.json configured)
- CLAUDE.md + HANDOFF.md restored with MasterHQ safety header
- AliExpress OAuth callback endpoint ready at /api/platforms/callback/aliexpress

### Known Issues:
1. Admin products "Import from AliExpress" button fails auth (use URL with ?secret= instead)
2. Storefront theme hardcoded to midnight (theme_id column exists but UI not built)
3. No infinite scroll on storefronts yet
4. No email notifications
5. No order tracking/fulfillment
6. Store owner can't manage their own products yet

### Database:
- 200 products imported (50 per store × 4 stores) — cron adding more
- sfrench71@gmail.com set to admin role
- user_stores has stripe_connect_id + stripe_connect_status columns
- user_orders has stripe_checkout_session + stripe_payment_intent columns

### Environment:
- All API keys confirmed working in Vercel
- AliExpress DS APIs: feedname.get ✅, recommend.feed.get ✅
- AliExpress Affiliate APIs: ALL DENIED (app lacks permission)
- Stripe Connect: Custom accounts, embedded onboarding

## AliExpress OAuth Status

- App: ToGoGo, AppKey: 529066, Category: Drop Shipping, Status: Online
- DS APIs working: feedname.get ✅, recommend.feed.get ✅
- OAuth authorization FAILED: `appkey不存在` (appkey does not exist) error
- Tried: `https://oauth.aliexpress.com/authorize?response_type=code&client_id=529066&redirect_uri=...`
- Possible issue: DS apps may use a different OAuth flow or need activation
- Callback endpoint READY at: /api/platforms/callback/aliexpress
- **NEXT STEP:** Contact AliExpress support or check DropShippers API Developer docs
  for the correct OAuth URL format for Drop Shipping category apps
- Once OAuth works: ds.order.create, ds.order.get, ds.product.get all unlock
- Stuart has valid ABN for business verification

## Next Session Priorities

1. **AliExpress OAuth** — resolve the appkey error, get access_token for order APIs
2. **Test Stripe Connect** — have a store owner complete onboarding
3. **Test checkout** — place a test order, verify payment split
4. **Manual order management** — admin can update order status, add tracking numbers
5. **Infinite scroll** — Temu-style product feed on storefronts
6. **Store owner product management** — let owners curate their catalog
7. **Email notifications** — order confirmations, welcome emails
8. **Dev branch workflow** — stop pushing directly to production

## Important URLs

- Main site: https://togogo.me
- Admin: https://togogo.me/admin
- Test AliExpress: https://togogo.me/api/test-aliexpress
- Manual cron: https://togogo.me/api/cron/import-products?secret=JWT_SECRET
- Fix admin role: https://togogo.me/api/admin/fix-role?secret=JWT_SECRET
- Check products: https://togogo.me/api/admin/check-products?secret=JWT_SECRET

## Files Changed This Session

- `api/_lib/suppliers.js` — Complete rewrite for AliExpress DS API
- `api/_lib/db.js` — Added stripe_connect, theme_id, checkout columns
- `api/storefront/store.js` — AliExpress fallback + theme from DB
- `api/storefront/checkout.js` — NEW: Stripe Checkout with Connect splits
- `api/connect/onboard.js` — NEW: Stripe Connect embedded onboarding
- `api/connect/status.js` — NEW: Connect account status
- `api/connect/dashboard.js` — NEW: Embedded payments dashboard
- `api/cron/import-products.js` — NEW: Automated product imports
- `api/admin/import-products.js` — NEW: Manual product import
- `api/admin/fix-role.js` — NEW: Admin role fix + import trigger
- `api/webhooks/stripe.js` — Added account.updated + storefront checkout
- `src/pages/StorefrontPage.jsx` — Dark theme, image gallery, sign-in
- `src/pages/SetupPaymentsPage.jsx` — NEW: Stripe Connect onboarding page
- `src/pages/admin/ProductsPage.jsx` — Pagination, DB auth, import button
- `vercel.json` — Added cron schedule
