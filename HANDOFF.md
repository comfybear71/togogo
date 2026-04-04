# ToGoGo — HANDOFF.md
## Session Handoff Document

**Last Updated:** 2026-04-04 (Session 3 — Full e2e dropshipping automated!)
**Session:** Fix crashed session + UI fixes + AliExpress auto-ordering + pricing
**Branch:** claude/fix-image-crash-BiIj9 (PRODUCTION on Vercel)
**Previous Branch:** claude/ipad-dev-prompt-2C4eB

---

## What Was Done This Session

### AliExpress Auto-Ordering — FULLY WORKING
- **First successful order:** 8210482925469621 (tablet holder stand x2, shipped to Gray NT, paid on AliExpress)
- **Correct API:** `aliexpress.trade.buy.placeorder` — creates real orders on AliExpress
- **Wrong API (don't use):** `aliexpress.ds.member.orderdata.submit` — this is only data backflow/reporting
- Wrapper param: `param_place_order_request4_open_api_d_t_o` with `logistics_address` + `product_items`
- SKU auto-resolved from product details API (`skuAttr` format)
- Australian states mapped to full names (NT → Northern Territory, NSW → New South Wales, etc.)
- Country names mapped to ISO codes (Australia → AU)
- Shipping address pulled from Stripe checkout session for completeness
- Customer phone collected via Stripe `phone_number_collection`
- Orders appear in AliExpress "Awaiting Payment" — admin pays in bulk (up to 20 days)
- Payment on AliExpress is manual (security restriction) — this is how DSers/AutoDS work too

### Full Order Flow (End-to-End Working)
1. Customer browses store (e.g. stu.togogo.me)
2. Adds product to cart, enters details, pays via Stripe
3. Stripe webhook fires → order confirmed in DB
4. 3 emails sent (customer confirmation, store owner alert, admin alert)
5. Store customer saved for repeat recognition
6. AliExpress order auto-created with customer's shipping address
7. Admin logs into AliExpress and pays pending orders in bulk
8. AliExpress ships directly to customer
9. Sync-orders cron polls AliExpress every 4hrs for tracking updates
10. Auto-refund if AliExpress cancels an order

### Pricing Model (Current)
- **Formula:** `sale_price = supplier_cost × 1.5` (50% markup on AUD cost from API)
- **Commission:** 30% of profit (sale_price - supplier_cost), NOT 30% of sale price
- **API prices:** Requested in AUD via `target_currency: 'AUD'`
- **Max price cap:** A$1,000 (products over this skipped during import)
- **Subscription:** $19.99 AUD/month per store
- **Commission configurable** via `admin_settings` table key `platform_fee_percent`

### UI Fixes
1. **SKU variant labels** — Human-readable names (Pink / Large), grouped by property type (Color, Size)
2. **Variant selection** — Color and Size tracked independently (selecting Size doesn't reset Color)
3. **Mobile overflow** — overflow-x-hidden on all containers, no pinch-to-zoom
4. **Search zoom fix** — All inputs 16px font (prevents iOS auto-zoom), viewport maximum-scale=1
5. **Product description** — AliExpress lazy-loaded images fixed (data-src → src), protocol URLs fixed
6. **Description text** — Forced light colors on dark background (was invisible)
7. **Description images** — Added spacing (my-4) between images
8. **Product images** — Constrained to container width on mobile
9. **Currency labels** — All prices show A$ prefix
10. **Products shuffled** — ORDER BY RANDOM() so every visit shows different products

### Backend Restored (Lost in Previous Crash)
1. **store_customers table** — Tracks per-store customers with UPSERT (total orders, total spent)
2. **Store customer save** — Webhook saves customer on purchase
3. **sync-orders.js cron** — Polls AliExpress every 4hrs for shipping/delivery/cancellation updates
4. **Auto-refund** — When AliExpress cancels, Stripe refund issued automatically
5. **Admin tab** — Shield icon on profile page for admin users (checks role via API)
6. **Sign In button** — Added to homepage (togogo.me) top-right
7. **Logout URL** — togogo.me/auth?logout=true clears stale sessions
8. **Cold start fix** — /my-shop waits for auth initialization before loading

### Admin Panel Fixes
- All 7 pages working: Dashboard, Users, Products, Orders, Stores, Marketing, Settings
- Orders/Marketing/Stores pages fixed: read token from `localStorage.getItem('togogo-token')` not Zustand
- Admin tab on profile: checks admin role via API call to `/api/admin/stats`
- Cleanup endpoint: `/api/admin/cleanup-orders?secret=JWT_SECRET` (delete after use)

---

## Current State (April 2026)

### All Working:
- ✅ Full e2e dropshipping: customer pays → AliExpress order auto-created
- ✅ 3 email notifications per order (customer, store owner, admin)
- ✅ Store customer tracking (repeat customer recognition)
- ✅ AliExpress OAuth (access_token active, 30-day expiry from ~April 3)
- ✅ Product import cron (every 6hrs, target_currency: AUD)
- ✅ Order sync cron (every 4hrs, checks AliExpress for updates)
- ✅ 4 active stores: stu, jum, stuie, annies-shop
- ✅ Stripe Connect (destination charges, payment splits)
- ✅ Stripe subscriptions ($19.99/mo)
- ✅ Admin panel (7 pages, all functional)
- ✅ Dark theme storefronts with product details, variants, gallery
- ✅ Mobile-friendly (no zoom issues)
- ✅ Sign In on homepage, logout URL, cold start fix

### Known Issues / Next Steps:
1. ⚠️ Pricing needs real-world testing — API prices may differ from actual AE checkout cost
2. ⚠️ Product variety limited — run import cron multiple times for more categories
3. ⚠️ No infinite scroll on storefronts (paginated)
4. ⚠️ No store owner product management UI
5. ⚠️ No order tracking page for customers
6. ⚠️ No admin customers page (data is collected, UI not built)
7. ⚠️ Admin Products page needs sortable columns + better filtering
8. ⚠️ Store sort function (high → low price) not built
9. ⚠️ Storefront theme selection UI not built (hardcoded to midnight)
10. ⚠️ Flexible subscription pricing (promos, half-price trials) not built
11. ⚠️ Service worker caching requires Ctrl+Shift+R on cold start

### Database:
- ~100 unique products (×4 stores = ~400 total) — growing via cron
- 0 orders (cleaned up test orders)
- 6 users (1 admin, 3 subscribers, 2 buyers)
- store_customers table active (tracks per-store customers)
- admin_settings: platform_fee_percent = 30, aliexpress_access_token saved

### Environment:
- Production branch: claude/fix-image-crash-BiIj9
- AliExpress: OAuth active, DS APIs working, trade.buy.placeorder confirmed
- Stripe: Live mode, Connect active (4 accounts)
- Resend: Email sending confirmed working
- All API keys in Vercel

---

## Important URLs

| URL | Purpose |
|-----|---------|
| https://togogo.me | Main site (Sign In top-right) |
| https://togogo.me/auth | Sign in page |
| https://togogo.me/auth?logout=true | Force logout + fresh sign in |
| https://togogo.me/profile | Store owner dashboard (Admin tab for admins) |
| https://togogo.me/admin | Admin panel |
| https://togogo.me/my-shop | Store owner product management |
| https://stu.togogo.me | Stu's store |
| https://jum.togogo.me | Jum's store |
| https://stuie.togogo.me | Stuie's store |
| https://annies-shop.togogo.me | Annie's store |
| togogo.me/api/cron/import-products?secret=JWT_SECRET | Manual product import |
| togogo.me/api/cron/import-products?secret=JWT_SECRET&reset=true | Reset + re-import all products |
| togogo.me/api/admin/cleanup-orders?secret=JWT_SECRET | Delete all orders (cleanup) |
| togogo.me/api/admin/fix-role?secret=JWT_SECRET | Fix admin role |
| https://www.aliexpress.com/p/order/index.html | AliExpress orders (pay pending) |

---

## Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/storefront/store?subdomain=X` | GET | Public store products + info |
| `/api/storefront/checkout` | POST | Stripe Checkout with Connect splits |
| `/api/products/details?id=X` | GET | Full product details from AliExpress |
| `/api/webhooks/stripe` | POST | Stripe webhook (orders, emails, AE auto-order) |
| `/api/connect/onboard` | POST | Stripe Connect onboarding |
| `/api/connect/status` | GET | Connect account status |
| `/api/cron/import-products` | GET | Import products from AliExpress |
| `/api/cron/sync-orders` | GET | Sync order status from AliExpress |
| `/api/admin/stats` | GET | Admin dashboard stats |
| `/api/admin/orders` | GET | Admin orders list |
| `/api/admin/stores` | GET | Admin stores list |
