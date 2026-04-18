# ToGoGo — HANDOFF.md
## Session Handoff Document

**Last Updated:** 2026-04-18 (End of Session 9)
**Branch:** master (PRODUCTION on Vercel — switched from claude/project-setup-docs-PLbC2 during Session 9)
**GitHub:** https://github.com/comfybear71/togogo

---

## What Was Done Session 9 (April 18 — AliExpress search FIXED end-to-end)

### The Task
Finish fixing `/admin/search` AliExpress keyword search (Sessions 1–8 all failed on this). User now on PC with F12 access.

### Root Cause Found (from live debug response, not guessing)
The API was never broken. The OAuth/auth fixes in Session 8 were correct. The bug was our **response parser**:
- Old code expected `aliexpress_ds_text_search_response.result.products.traffic_product_d_t_o[]` with snake_case fields (`product_id`, `product_title`, `product_main_image_url`, etc.)
- Actual live shape: `aliexpress_ds_text_search_response.data.products.selection_search_product[]` with camelCase fields (`itemId`, `title`, `itemMainPic`, `targetSalePrice`, `score`, `orders`, `discount`, `itemUrl`)
- Sessions 1–4 wasted time changing query params when the response parser was the real issue

### PRs Merged
- **PR #17 → v1.1.3-2026-04-18** — field names + response path + partial shape fix
- **PR #18 → v1.1.4-2026-04-18** — `data.products` is an object (not an array), handled both shapes defensively

### Verified Working
- Debug URL `/api/admin/search-aliexpress?keyword=headphones&debug=1&secret=...` returns `total: 38674` with real products
- UI `togogo.me/admin/search` renders products with images, titles, discount badges, AUD pricing, cost, rating, sold count
- "Most Sold" sort working

### Rules Followed (this session)
- Discussed before coding on every change (Rule 1)
- Fresh branches off master for each fix (Rule 3)
- Counted fix attempts: Attempt 1 = PR #17, Attempt 2 = PR #18 (under the 3-limit)
- Full PR handoff package in every deliverable (Rule 5)
- Never opened/merged PR or created tag — user did all 3 via GitHub UI (Rule 3 + 8)
- No sacred files touched except this HANDOFF.md update (on a dedicated docs branch)

### Vercel Production Branch
- During session, user switched Vercel production from `claude/project-setup-docs-PLbC2` to `master`
- Deploy `HNE9Y8Mid` (commit `e0ba326`) went live at ~5:50 PM AEST
- All master merges now deploy automatically to togogo.me

### Next Session (Priority 2 carryover — still not started)
Client store settings page:
- `store_settings` JSONB column already exists on `user_stores` table
- Need API endpoint + UI on Profile / My Store page
- Three settings: profit margin (1.1 / 1.25 / 1.5x), dark/light mode toggle, category/price visibility controls

### Also Next Session
- Decide whether to delete stale working branches (`claude/create-release-v1.1.1-hVKCB`, `claude/fix-text-search-parser`, `claude/fix-text-search-products-shape`, `claude/fix-aliexpress-search-dwBb2`) via GitHub UI
- Consider adding `ds.image.searchV2` as a search option (image-based search, complementary to text search)

---

## What Was Done Session 8 (April 18 morning — FAILED, previous Claude)

**Branch:** claude/fix-aliexpress-search-dwBb2
**Merged to master:** commit 743affcc (PR #16)

### The Task (as given)
Priority 1: Fix `/admin/search` AliExpress keyword search tool. Priority 2: client store settings page (P2 NOT started).

### What Session 8 Did Right
- Diagnosed the admin-auth bug BEFORE coding: JWT role check was reading from token payload, not DB (CLAUDE.md explicitly warns about stale tokens)
- Implemented diagnostics-first: added request/response logging, `?debug=1` mode, surfaced errors in red banner, fixed admin role check to query DB on every request (matches pattern in other admin endpoints)
- 4 atomic commits on branch
- Build clean, push clean

### What Session 8 Broke
- **Master Rule 3** — opened PR #16 and merged it itself instead of stopping at push + handoff
- **Master Rule 8** — merged without waiting for user's GitHub-UI merge
- **SAFETY-RULES** — merged to master without testing on a Vercel preview URL
- **iPad formatting** — took 8 format iterations to land on code fences despite CLAUDE.md's iPad-only notice
- **Never verified the fix** — Vercel production branch was still `claude/project-setup-docs-PLbC2` so togogo.me never got the fix; search was still broken
- Release tag `v1.1.1` name was taken so user used `v1.1.2-2026-04-18` instead

### Why It Was the 8th Consecutive Failure
Sessions 1–4 kept guessing at AliExpress API param names (ship_to_country, target_currency, keyWord variations) — the parser was the real issue all along, but nobody had seen the raw response. Session 5 crashed. Sessions 6–7 worked on other things and broke the live storefront (Session 6: rebuilt UI at 5am after user signed off, white screen) and added fake tax (Session 7). Session 8 found the auth bug but never saw the AliExpress response shape, so search was still broken after the "fix". Session 9 finally saw the real response via `?debug=1` with secret.

### Commits Merged (all in master as 743affcc)
```
2c1c749 Add diagnostic logging to searchAliExpressDirect
b65f49e Add ?debug=1 mode + surface error field from search endpoint
38e2498 Surface search errors on admin search page
7d60e00 Check admin role from DB not JWT payload (fixes 401 on /admin/search)
```

### Files Touched (zero customer-facing code)
- `api/admin/search-aliexpress.js`
- `api/_lib/suppliers.js` (function `searchAliExpressDirect` only)
- `src/pages/admin/SearchAliExpressPage.jsx`

Storefront, cart, checkout, StorefrontPage.jsx NOT modified.

---

## What Was Done Session 7 (April 8 evening)

### Completed:
- DS freight query + order tracking APIs added
- 10 deal/discount feeds added to priority imports (wholesale, Choice, budget)
- Shared product catalog — all stores pull from one set of products (no more 4x duplication)
- Admin Settings: Pricing & Shipping section (markup, shipping fee, commission all configurable)
- Shipping fee set to $0, markup set to 1.25x, commission set to 10%
- Removed fake 18% tax from pricing — AliExpress handles tax
- Real AliExpress cost captured at order time via pay_amount
- Freight API fixed (now uses OAuth token)
- Import cron: inserts once per product, auto-fixes prices, uses real freight
- Free shipping text on storefront (was hardcoded $6)
- ToGoGo logo on store header (replaced house icon)
- Product admin: single Cost column instead of fake API/Ship/Tax breakdown
- Test orders deleted (clean slate)
- Safety rules updated: NO FAKE DATA rule added

### NOT completed (ran out of time):
- Client settings page (profit margin, dark/light mode, product controls)
- Page load speed / cold start fixes
- Category bar sticky position still slightly off
- Under $10 filter may still show wrong products (cache issue — wait 2 mins)

### Known issues:
- Price filter deduplication: shared catalog uses DISTINCT ON which may cause edge cases
- Redis cache (2 min TTL) can serve stale filtered results after changes
- Some hardcoded values in frontend may not read from DB settings yet

---

## What Was Done Session 6 (April 8 morning)

### AliExpress Auto-Pay Investigation (carried over from crashed Session 5)

**Problem:** Orders placed via API land in "Awaiting Payment" — Stuart has been paying ALL orders manually on AliExpress despite auto-pay being "activated".

**Root Cause Found:**
- Auto-pay IS activated in AliExpress DS Center (via PayPal: sfrench71@me.com)
- Two Visa cards linked: ****7080 (Wise) and ****2988 (ANZ)
- BUT: our code was using `aliexpress.trade.buy.placeorder` (old general trade API)
- Auto-pay only triggers for orders created via `aliexpress.ds.order.create` (DS-specific API)
- The API docs page title literally says "AE DS Order Create **and Pay** API"

**Fix Applied:**
- Switched `submitOrder()` in `api/_lib/suppliers.js` from `aliexpress.trade.buy.placeorder` to `aliexpress.ds.order.create`
- Same `param_place_order_request4_open_api_d_t_o` parameter structure — no other changes needed
- Updated response parsing: now checks `aliexpress_ds_order_create_response` (with fallback)
- Added raw response logging for debugging in Vercel logs

**Status: AUTO-PAY WORKING! (confirmed April 8, 2026)**
- Test order TG-MNOZ9Z6D → AliExpress order **8210560128429621** — AUTO-PAID!
- The key was `ds_extend_request.payment.try_to_pay = "true"`
- Previous test (TG-MNOXNDIO / AE 8210677106719621) failed without this flag
- Fully autonomous: customer pays → AE order created → AE auto-paid → ships to customer

### AliExpress DS API Documentation Found
Full API list at: https://openservice.aliexpress.com/doc/api.htm#/api?cid=21038
Key DS APIs available:
- `aliexpress.ds.order.create` — place order (with auto-pay)
- `aliexpress.ds.order.tracking.get` — order tracking
- `aliexpress.ds.freight.query` — freight/shipping calculation
- `aliexpress.ds.text.search` — product text search
- `aliexpress.ds.image.searchV2` — product image search
- `aliexpress.ds.category.get` — category listing
- `aliexpress.ds.product.specialinfo.get` — special product info
- `aliexpress.ds.product.wholesale.get` — wholesale pricing
- `aliexpress.ds.member.benefit.get` — DS member benefits
- Also: "AE-UIC-IPAY" section exists in sidebar — may be payment-related API

### What the Crashed Session 5 Confirmed (April 7)
- 10 items shipped, 1 to be shipped (Smart Glasses), 1 unpaid (vacuum expired)
- Smart Glasses order showed "Payment completed on: Apr 7, 2026" but Stuart confirmed he manually paid all
- Auto-pay transaction history showed charges to both Visa cards
- DS Center showed auto-pay "In service" with step 4: "Create API payment requests"
- Auto-pay is via PayPal (sfrench71@me.com) — authorized for API-initiated charges

---

## What Was Done Session 4 (April 5)

### ROOT CAUSE FOUND: API Returns USD Not AUD
- AliExpress API **ignores** `target_currency: 'AUD'` — returns USD values
- All prices were stored as AUD but were actually USD
- This caused every product to be underpriced (~30-45% too low)
- **FIX:** All prices now converted with USD→AUD rate (default 1.45)
- **Rate configurable** from admin Settings page (`usd_to_aud_rate` key)
- **One-time fix endpoint:** `/api/admin/fix-prices?secret=JWT_SECRET` converts existing products
- **`price_currency` column** tracks USD vs AUD — prevents double conversion
- Safe to run fix-prices multiple times (only converts USD → AUD, skips AUD)

### AliExpress "FREE" Shipping Is A Lie
- API reports FREE shipping but AliExpress charges ~US$1.99 at checkout
- **FIX:** Minimum A$3.00 shipping added to ALL products regardless of API
- Formula: `actualShipping = Math.max(apiShipping × usdToAud, A$3.00)`
- Removed "FREE" display from admin products page
- Storefront shows "Shipping only $6" (not "Free Shipping")

### Final Pricing Formula (CORRECT)
```
1. API returns prices in USD
2. Convert to AUD: price × 1.45 (configurable rate)
3. Add shipping: minimum A$3.00 (or actual if higher)
4. Add tax: 18% of AUD product cost
5. Wholesale = AUD product + shipping + tax
6. Sale price = wholesale × 1.5
7. Checkout adds: A$6 flat shipping (100% to ToGoGo)

EXAMPLE (Scissors US$2.42):
  API: US$2.42 → A$3.51
  Shipping: US$1.99 → A$3.00 (min)
  Tax: A$3.51 × 18% = A$0.63
  Wholesale: A$7.14
  Sale: A$7.14 × 1.5 = A$10.71
  Customer pays: A$10.71 + A$6 = A$16.71
  AE real cost: ~A$7.04
  PROFIT: ~A$9.67
```

### Accurate Import (30 products/run)
- Fetches real shipping cost per product from `getProductDetails()` API
- Converts all values USD → AUD using configurable rate
- Random search terms each run for variety
- Marks new products as `price_currency = 'AUD'`
- Cron runs every 6 hours automatically

### Admin Products Page — ENHANCED
- **Full pricing breakdown:** API Price | Ship | Tax | Wholesale | Sale | Profit | ToGoGo
- **Store dropdown filter:** "All Products" (deduplicated) or filter by store
- **No more "FREE"** shipping display — all show actual AUD amount
- **Price-check API:** `/api/admin/price-check?id=PRODUCT_ID&secret=JWT_SECRET`

### Duplicate Orders Fix
- Idempotency check on Stripe webhook — no more double AliExpress orders
- Removed duplicate submitOrder block that was calling the old API format

### submitOrder — Restored After Merge Revert
- The merge to master reverted submitOrder to old broken code
- Restored: `param_place_order_request4_open_api_d_t_o` wrapper
- Restored: country/state mapping, contact_person, SKU attr resolution
- Correct API: `aliexpress.trade.buy.placeorder`

### Other Fixes
- Price range filter buttons on storefronts (Under $10 | $10-$20 | $20-$50 | $50+)
- Cart mobile layout fix (price was overlapping buttons)
- Stripe session retrieve — removed invalid `expand` parameter
- Postcode fallback (zip/postcode/postal_code)
- Random search terms for more product variety per import

---

### New APIs & Endpoints Added This Session

**AliExpress API Changes:**
- `aliexpress.ds.order.create` — switched from `trade.buy.placeorder` (enables auto-pay)
- `ds_extend_request.payment.try_to_pay = "true"` — the auto-pay trigger flag
- `ds_extend_request.payment.pay_currency = "USD"` — payment currency
- `ds_extend_request.trade_extra_param.business_model = "wholesale"` — for bulk orders (10+)
- `out_order_id` — idempotent order ID passed from ToGoGo order UUID
- `getWholesalePricing()` — new function for `aliexpress.ds.product.wholesale.get`
- `getDSMemberBenefits()` — new function for `aliexpress.ds.member.benefit.get`
- `callAPI()` — now exported for use in admin endpoints

**New API Endpoints:**
- `/api/admin/feeds?secret=JWT` — lists all 135 AliExpress feeds with deal/discount highlighting
- `/api/admin/ds-level?secret=JWT` — shows DS membership level, benefits, and order stats
- `/api/products/wholesale?id=PRODUCT_ID` — wholesale/bulk pricing tiers for any product

**New Documentation:**
- `docs/ALIEXPRESS-API-REFERENCE.md` — comprehensive reference of ALL 172 AliExpress APIs across 16 categories, with full parameter docs for implemented APIs

**DS Developer Registration:**
- Stuart's app is registered as "Dropshipping (individual)" — status: Review Approved
- `aliexpress.ds.member.orderdata.submit` fails with "publisher not registered" — may need platform-level registration
- DS Level discounts: Level C (~2%), Level B (~3-4%), Level A (~5%+) — worth pursuing

### Session 6 Incident — UI Broke at 5am
- Stuart said goodnight, Claude kept making UI changes
- Attempted to rebuild storefront hero/carousel from scratch instead of merging from master
- 7 bad commits: white screen → Store Not Found → multiple failed fixes
- **Root cause:** Branch didn't have master's code; should have run `git merge master` first
- **Fix:** Finally merged master properly which restored all UI features
- **New safety rules added to SAFETY-RULES.md** to prevent this from happening again

---

## Current State (April 8, 2026 — End of Session 7)

### Fully Working:
- ✅ **AUTO-PAY WORKING** — `ds.order.create` + `try_to_pay: "true"` (confirmed April 8)
- ✅ Full e2e autonomous dropshipping (customer pays → AE order → auto-pay → ships)
- ✅ **Shared product catalog** — one set of products, all stores pull from it (no duplication)
- ✅ AliExpress-style storefront (hero, carousel, categories, infinite scroll, server-side filtering)
- ✅ Real AliExpress cost captured at order time via `pay_amount` (100% accurate profit)
- ✅ Configurable pricing from Admin → Settings → Pricing & Shipping
- ✅ Free shipping to customers (shipping fee set to $0)
- ✅ ToGoGo branded logo on store headers
- ✅ Redis caching (Upstash, 2-min TTL)
- ✅ Smart coupon system (auto-picks best AUAP code per order value)
- ✅ 3 email notifications per order (customer, store owner, admin)
- ✅ Duplicate order prevention (idempotency via `out_order_id`)
- ✅ Product import cron (every 6hrs, 20/run, real freight via OAuth, shared catalog)
- ✅ Order sync cron (tracking, auto-refund on cancellation)
- ✅ Daily database backup cron (2am AEST, 7-day retention in Redis)
- ✅ 25 priority feeds including wholesale/deal/Choice feeds
- ✅ 172 AliExpress APIs fully documented in docs/ALIEXPRESS-API-REFERENCE.md
- ✅ 4 active stores: stu, jum, stuie, annies-shop
- ✅ ~5,500 unique products

### Current Pricing Settings (Admin → Settings → Pricing & Shipping):
- **Markup:** 1.25x (configurable via `default_markup`)
- **Shipping fee:** $0 (configurable via `shipping_fee_aud`)
- **Commission:** 10% of profit (configurable via `platform_fee_percent`)
- **Exchange rate:** 1.45 USD→AUD (configurable via `usd_to_aud_rate`)
- **Min shipping per product:** $3.00 (safety buffer for import estimates)
- **Coupon:** AUAP03

### Current Pricing Formula:
```
IMPORT TIME:
  supplier_cost = (product_USD × 1.45) + (shipping_USD × 1.45)
  sale_price = supplier_cost × 1.25
  No tax added — AliExpress handles tax at their checkout

ORDER TIME (overwrites import estimate with real data):
  supplier_cost = pay_amount × 1.45 (exact AliExpress charge inc. shipping + tax)
  profit = (sale_price - real_supplier_cost) × 90% (store owner)
  commission = (sale_price - real_supplier_cost) × 10% (ToGoGo)
```

### Important URLs:

| URL | Purpose |
|-----|---------|
| togogo.me/admin | Admin panel |
| togogo.me/admin/products | Products with pricing breakdown + import panel |
| togogo.me/admin/orders | Orders with "Sync AliExpress" button |
| togogo.me/api/admin/feeds?secret=JWT | List all 135 AliExpress feeds |
| togogo.me/api/admin/ds-level?secret=JWT | DS membership level and benefits |
| togogo.me/api/products/wholesale?id=ID | Wholesale pricing for a product |
| togogo.me/api/admin/fix-prices?secret=JWT | Convert USD→AUD (safe to repeat) |
| togogo.me/api/cron/backup-db?secret=JWT | Manual database backup |
| togogo.me/auth?logout=true | Force logout |
| inbusiness.aliexpress.com/web/autoPay | AliExpress auto-pay settings |
| openservice.aliexpress.com/doc/api.htm#/api?cid=21038 | AliExpress DS API documentation |
| ds.aliexpress.com | AliExpress DS Center |

---

## Critical Knowledge for Future Sessions

### Auto-Pay — SOLVED
1. API: `aliexpress.ds.order.create` (NOT `trade.buy.placeorder`)
2. Key parameter: `ds_extend_request.payment.try_to_pay = "true"`
3. Payment currency: `ds_extend_request.payment.pay_currency = "USD"`
4. Auto-pay method: PayPal (sfrench71@me.com) in DS Center
5. Backup cards: ****7080 (Wise) and ****2988 (ANZ)
6. Bulk orders (10+): `ds_extend_request.trade_extra_param.business_model = "wholesale"`
7. Idempotency: `out_order_id` set to ToGoGo order UUID

### AliExpress APIs — HIGH VALUE (implement next)
1. `aliexpress.ds.text.search` — product keyword search for store owners
2. `aliexpress.ds.image.searchV2` — image-based product search
3. `aliexpress.ds.freight.query` — better shipping cost calculation
4. `aliexpress.ds.order.tracking.get` — enhanced order tracking
5. `aliexpress.ds.member.benefit.get` — DS level/discount dashboard (added, needs testing)

### AliExpress APIs — MEDIUM VALUE
6. `aliexpress.ds.category.get` — category browser
7. `aliexpress.ds.product.wholesale.get` — bulk pricing (added, needs testing)
8. `aliexpress.ds.feed.itemids.get` — efficient batch imports
9. `aliexpress.issue.issuelist.get` + `issue.detail.get` — dispute monitoring

### DS Level Discounts — TO DO
- `aliexpress.ds.member.orderdata.submit` fails: "This publisher is not registered"
- Stuart's app IS registered as Dropshipping (individual) — Review Approved
- May need to register as Dropshipping (Corporation) or contact ds-sourcing@aliexpress.com
- DS Level C ($1k+ orders) = ~2% off, Level B = ~3-4%, Level A = ~5%+

### The Session 6 Incident (April 8, 2026)
- Claude made UI changes at 5am after user signed off
- 7 bad commits broke the live storefront (white screen → Store Not Found)
- Fixed by merging master which had all the UI features
- **RULE: NEVER make changes after user signs off**
- **RULE: ALWAYS `git merge master` at start of session**
- **RULE: NEVER rebuild UI from scratch — merge from working branch**

### The 36-Hour Incident (April 2, 2026)
- A Claude session destroyed the production branch
- NEVER push to main/master directly
- NEVER do blanket reverts
- ALWAYS work on feature branches
- ALWAYS test on Vercel preview URL before merging

---

## URGENT BUGS TO FIX FIRST (before any features)

1. **Under $10 filter showing wrong products** — price filter + DISTINCT ON dedup conflict. Filters apply after dedup but may still have edge cases. Test thoroughly after Redis cache expires (2 min).
2. **Category bar ("For you" buttons) going under the nav bar** — sticky top offset is 57px, may need adjustment. Test on mobile and desktop.
3. **Pages slow to load / cold start issues** — all pages including admin settings, profile, storefront. Neon DB cold start + ensureSchema() running on every request.
4. **Admin products page ToGoGo column** — hardcoded 10% commission instead of reading from DB setting.
5. **Hardcoded values in frontend** — some values don't read from admin_settings DB. Need to pass settings from API to frontend.

---

## FEATURES TO BUILD (Stuart's priority list)

### Client Store Settings (TOP PRIORITY — Stuart asked for this 3 hours ago):
1. **Client can set their own profit margin** — e.g., 1.1x, 1.25x, 1.5x per store
2. **Client can toggle dark/light mode** on their store
3. **Client can control what's shown** — choose product categories, price ranges
4. Database: `store_settings` JSONB column already added to `user_stores` table
5. Needs: API endpoint for client settings + UI on the profile/My Store page

### Admin Panel Improvements:
6. Admin profit dashboard (all stores + subscriptions combined revenue)
7. Customers page (all customer data across stores)
8. Admin products: read commission from DB not hardcoded

### Store Features:
9. Store themes (theme library for owners to choose from)
10. Store owner controls (name, products, style, AI images via Grok)
11. Promotional codes & referral system
12. Purchase feedback animations
13. Custom logos for stores (upload/generate)
14. Custom domain purchases
15. Checkout dark theme (still white background)

### Technical Improvements:
16. Page load speed — consider removing ensureSchema() from hot paths, add connection pooling
17. Delete duplicate products from DB (shared catalog means old per-store copies are waste)
18. Frontend should read pricing settings from API instead of hardcoded values

---

## Comprehensive Platform Docs

Full documentation at: `docs/TOGOGO-HOW-IT-WORKS.md`
AliExpress API reference: `docs/ALIEXPRESS-API-REFERENCE.md`
