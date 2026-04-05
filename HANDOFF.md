# ToGoGo — HANDOFF.md
## Session Handoff Document

**Last Updated:** 2026-04-05 (Session 4 — Pricing SOLVED + admin improvements)
**Session:** USD→AUD conversion fix, accurate pricing, admin product breakdown, duplicate fix
**Branch:** claude/fix-image-crash-BiIj9 (PRODUCTION on Vercel)
**Previous Session:** Session 3 (April 4) — Full e2e dropshipping automated

---

## What Was Done This Session (Session 4 — April 5)

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

## Current State (April 5, 2026)

### Fully Working:
- ✅ Full e2e: customer pays → AliExpress order auto-created
- ✅ **Accurate AUD pricing** with USD→AUD conversion
- ✅ Real shipping costs (minimum A$3, no more fake FREE)
- ✅ Configurable exchange rate from admin settings
- ✅ Admin product breakdown: API Price, Ship, Tax, Wholesale, Sale, Profit, ToGoGo
- ✅ Store filter on admin products (deduplicated unique view)
- ✅ Price range filters on storefronts
- ✅ 3 email notifications per order
- ✅ Store customer tracking with phone
- ✅ Duplicate order prevention
- ✅ Product import cron (30/run, real shipping, AUD conversion)
- ✅ Order sync cron (tracking, auto-refund on cancellation)
- ✅ 4 active stores: stu, jum, stuie, annies-shop
- ✅ ~350 products with accurate pricing
- ✅ Mobile-friendly storefronts

### Pricing Config:
- **Exchange rate:** `usd_to_aud_rate` in admin_settings (default 1.45)
- **Commission:** 30% of profit in `platform_fee_percent` (admin_settings)
- **Shipping fee:** A$6 flat per order (hardcoded in checkout.js)
- **Markup:** 1.5x on wholesale (hardcoded in import cron)
- **Min shipping:** A$3 per product (hardcoded in import cron)

### Important URLs:

| URL | Purpose |
|-----|---------|
| togogo.me/admin | Admin panel |
| togogo.me/admin/products | Products with pricing breakdown |
| togogo.me/api/admin/fix-prices?secret=JWT_SECRET | Convert USD→AUD (one-time, safe to repeat) |
| togogo.me/api/admin/price-check?id=ID&secret=JWT_SECRET | Price breakdown for any product |
| togogo.me/api/cron/import-products?secret=JWT_SECRET | Import 30 products with accurate pricing |
| togogo.me/auth?logout=true | Force logout |
| aliexpress.com/p/order/index.html | Pay AliExpress orders |

---

## Next Session — UI Design + Features (THE FUN STUFF!)

### Store Features:
1. Similar products below item
2. Store themes (theme library for owners)
3. Consistent branding (homepage logo style on stores)
4. Store owner controls (name, products, style, AI images via Grok)
5. Promotional codes & referral system
6. Client profit percentage control (owners set their own markup)
7. Purchase feedback animations (animated ToGoGo logo)
8. Custom logos for stores (upload/generate)
9. Custom domain purchases (buy URL through ToGoGo)

### Admin Features:
10. Admin profit dashboard (all stores + subscriptions combined)
11. Better product search (sortable columns, advanced filters)
12. AI assistant for store owners (branding, products, pricing help)
13. "Awaiting AE Payment" page with direct links
14. Customers page (all customer data across stores)

### Existing:
15. Checkout dark theme
16. Dynamic shipping (if AE shipping > $6, charge more)
17. Flexible subscriptions (promos, half-price trials)
18. Infinite scroll on storefronts
19. Order tracking page for customers

---

## Comprehensive Platform Docs

Full documentation at: `docs/TOGOGO-HOW-IT-WORKS.md`
