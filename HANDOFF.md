# ToGoGo — HANDOFF.md
## Session Handoff Document

**Last Updated:** 2026-04-05 (Session 3 — Full e2e dropshipping automated!)
**Session:** Fix crashed session + UI fixes + AliExpress auto-ordering + pricing
**Branch:** claude/fix-image-crash-BiIj9 (PRODUCTION on Vercel)
**Previous Branch:** claude/ipad-dev-prompt-2C4eB

---

## What Was Done This Session

### AliExpress Auto-Ordering — FULLY WORKING
- **Successful orders placed:** 9+ orders auto-created on AliExpress via API
- **Latest test:** TG-MNKGDFFM — 4 items, A$33.31, all 4 AliExpress orders created successfully
- **Correct API:** `aliexpress.trade.buy.placeorder` — creates real orders on AliExpress
- **Wrong API (don't use):** `aliexpress.ds.member.orderdata.submit` — this is only data backflow/reporting
- Wrapper param: `param_place_order_request4_open_api_d_t_o` with `logistics_address` + `product_items`
- SKU auto-resolved from product details API (`skuAttr` format)
- Australian states mapped to full names (NT → Northern Territory, NSW → New South Wales, etc.)
- Country names mapped to ISO codes (Australia → AU)
- Customer phone collected via Stripe `phone_number_collection`
- Customer name prioritized from order form (not Stripe account name)
- Shipping address pulled from Stripe checkout session for completeness
- Order memo: "ToGoGo dropship order" on every AliExpress order
- Orders appear in AliExpress "Awaiting Payment" — admin pays in bulk (up to 20 days)
- **"Pay after Delivery"** option available on AliExpress — investigate for cash flow

### Pricing Model — NEEDS REFINEMENT (Next Session Priority)
**Current formula:** `store_price = (API_cost × 1.15 tax) × 1.5 markup` + A$6 shipping at checkout

**The Problem:** AliExpress API prices don't include shipping or tax. Real checkout cost is higher:
- Shipping: ~US$2 per item (some items free)
- Tax: ~17-18% of product price
- Real cost ≈ API price × 1.6-2.0 (depending on shipping)

**Real data from test orders (April 5):**

| Item | API Price | AE Shipping | AE Tax | AE Total (USD) |
|------|-----------|-------------|--------|---------------|
| Bag Toolkit | $1.89 | $1.99 | $0.39 | $4.27 |
| Flashlight | $2.77 | $1.99 | $0.48 | $5.24 |
| Glasses | $3.31 | $1.99 | $0.53 | $5.83 |
| Hat Light | $2.70 | FREE | $0.47 | $3.17 |

**Correct pricing formula (to implement next session):**
```
real_cost = API_price + shipping_per_item + (API_price × 0.18 tax)
store_price = real_cost × 1.5 markup
checkout adds: A$6 flat shipping (goes 100% to ToGoGo)
```

**Two approaches for next session:**
1. **Quick:** Add flat US$2 shipping + 18% tax to cost, then 1.5x markup
2. **Accurate (preferred):** Use enrich-prices endpoint to fetch real shipping per product from `ds.product.get` API, then calculate exact cost

**Enrich endpoint ready:** `/api/admin/enrich-prices?secret=JWT_SECRET` (20 products per run)

### Revenue Model
- **Commission:** 30% of profit (sale_price - supplier_cost)
- **Shipping fee:** A$6 flat per order → 100% to ToGoGo platform
- **Subscription:** $19.99 AUD/month per store
- **Commission configurable** via `admin_settings` table key `platform_fee_percent`
- **A$6 shipping** goes entirely to platform via `application_fee` in Stripe Connect

### Full Order Flow (End-to-End Working)
1. Customer browses store (e.g. stu.togogo.me)
2. Products shown with A$ prices (API cost + 15% tax × 1.5 markup)
3. Customer adds to cart, sees subtotal + A$6 shipping
4. Fills checkout form (name, email, phone, address)
5. Redirected to Stripe (collects phone, validates address)
6. Payment confirmed → webhook fires:
   - Order confirmed in DB
   - 3 emails sent (customer, store owner, admin)
   - Store customer saved (repeat recognition)
   - AliExpress order auto-created per item
7. Admin pays AliExpress orders in bulk (AE account → Pay all)
8. AliExpress ships directly to customer
9. Sync-orders cron polls for tracking updates every 4hrs

### UI Fixes
1. SKU variant labels — human-readable (Pink / Large), grouped by type
2. Variant selection — Color/Size tracked independently
3. Mobile overflow — no pinch-to-zoom
4. Search input zoom — 16px font prevents iOS auto-zoom
5. Product description — lazy-loaded images fixed, text forced light on dark bg
6. Description images — spacing between images
7. Product images — constrained to container on mobile
8. Currency — A$ prefix on all prices
9. Products shuffled — ORDER BY RANDOM()
10. Checkout — product images, shipping line (green), subtotal + total
11. Homepage — Sign In button (top right)
12. Profile — Admin tab (shield icon) for admin users
13. Logout URL — togogo.me/auth?logout=true
14. Cold start fix — /my-shop waits for auth initialization

### Admin Fixes
- All 7 pages working (token read from localStorage, not Zustand)
- Admin tab on profile checks role via API
- Cleanup endpoint for deleting test orders
- Product import with reset option

---

## Current State (April 5, 2026)

### All Working:
- ✅ Full e2e: customer pays → AliExpress order auto-created
- ✅ 3 email notifications per order
- ✅ Store customer tracking
- ✅ AliExpress OAuth active (30-day token from ~April 3)
- ✅ Product import cron (every 6hrs)
- ✅ Order sync cron (every 4hrs)
- ✅ 4 active stores: stu, jum, stuie, annies-shop
- ✅ Stripe Connect with payment splits
- ✅ Admin panel (all 7 pages)
- ✅ Mobile-friendly storefronts
- ✅ A$6 shipping fee per order (100% to platform)

### Known Issues / Next Session:
1. **PRIORITY: Pricing accuracy** — use enrich endpoint with real shipping data
2. **Duplicate AliExpress orders** — webhook retries create doubles, need idempotency check
3. **Checkout dark theme** — still white/light background, needs fixing
4. **Admin Products** — sortable columns, store dropdown filter
5. **Store sort function** — price high→low, new arrivals
6. **Dynamic shipping** — if AE shipping > $6, charge more
7. **"Awaiting AE Payment" admin page** — show pending AE orders with links
8. **Flexible subscriptions** — promos, half-price trials
9. **Infinite scroll** on storefronts
10. **Store owner product management**
11. **"Pay after Delivery"** — investigate AliExpress option for cash flow

### Database:
- ~200 unique products (×4 stores = ~800 total)
- Test orders cleaned up (clean slate)
- 6 users (1 admin, 3 subscribers, 2 buyers)
- store_customers table active
- admin_settings: platform_fee_percent = 30

### Environment:
- Production branch: claude/fix-image-crash-BiIj9
- AliExpress: OAuth active, trade.buy.placeorder confirmed working
- Stripe: Live mode, Connect active (4 accounts)
- Resend: Email sending confirmed
- All API keys in Vercel

---

## Important URLs

| URL | Purpose |
|-----|---------|
| https://togogo.me | Main site (Sign In top-right) |
| https://togogo.me/auth?logout=true | Force logout |
| https://togogo.me/profile | Store owner dashboard + Admin tab |
| https://togogo.me/admin | Admin panel (7 pages) |
| https://stu.togogo.me | Stu's store |
| https://jum.togogo.me | Jum's store |
| togogo.me/api/cron/import-products?secret=JWT_SECRET | Import products |
| togogo.me/api/cron/import-products?secret=JWT_SECRET&reset=true | Reset + re-import |
| togogo.me/api/admin/enrich-prices?secret=JWT_SECRET | Enrich prices with real shipping (20/run) |
| togogo.me/api/admin/cleanup-orders?secret=JWT_SECRET | Delete all orders |
| aliexpress.com/p/order/index.html | Pay AliExpress orders in bulk |

---

## Comprehensive Platform Docs

Full documentation at: `docs/TOGOGO-HOW-IT-WORKS.md` (copy to MasterHQ)
