# ToGoGo — HANDOFF.md
## Session Handoff Document

**Last Updated:** 2026-04-05 (Session 4 — Accurate pricing + admin improvements)
**Session:** Accurate pricing with real shipping, admin product breakdown, duplicate fix
**Branch:** claude/fix-image-crash-BiIj9 (merged to master, PRODUCTION on Vercel)
**Previous Session:** Session 3 (April 4) — Full e2e dropshipping automated

---

## What Was Done This Session (Session 4 — April 5)

### Accurate Pricing — IMPLEMENTED
- **Import now fetches real shipping cost per product** from `getProductDetails()` API
- **Wholesale cost** = API product price + AE shipping to AU + 18% tax estimate
- **Store sale price** = wholesale × 1.5 (client markup)
- **A$6 flat shipping** added at checkout — goes 100% to ToGoGo platform
- **Commission:** 30% of profit (sale - wholesale) goes to ToGoGo
- **Price breakdown stored in DB:** `api_price`, `shipping_cost`, `tax_amount` columns added
- Products with FREE shipping show green "FREE" in admin
- Import processes 30 products per run with 8 search terms for variety
- `country: 'AU'` filter on feed API for Australia-relevant products

### Admin Products Page — ENHANCED
- **Full pricing breakdown columns:** API Price | Ship | Tax | Wholesale | Sale | Profit | ToGoGo
- **Store dropdown filter:** "All Products" (deduplicated) or filter by specific store
- **Unique product view:** Default shows each product once (not 4x per store)
- **Price-check API:** `/api/admin/price-check?id=PRODUCT_ID&secret=JWT_SECRET`

### Duplicate Orders Fix
- **Idempotency check** on Stripe webhook — prevents duplicate AliExpress orders on retries
- Checks if order already processed before running emails/AE submission

### Other Fixes
- Removed "Free Shipping" label — now shows "Shipping only $6"
- Branch cleanup: removed old branches, merged to master
- Repo health: MasterHQ showing all green

---

## Current State (April 5, 2026)

### Fully Working:
- ✅ Full e2e: customer pays → AliExpress order auto-created with accurate pricing
- ✅ Accurate pricing: real shipping + tax baked into wholesale cost
- ✅ Admin product breakdown: API Price, Ship, Tax, Wholesale, Sale, Profit, ToGoGo
- ✅ 3 email notifications per order (customer, store owner, admin)
- ✅ Store customer tracking (repeat recognition with phone)
- ✅ Stripe Connect with destination charges + payment splits
- ✅ A$6 shipping per order → 100% to ToGoGo platform
- ✅ 30% commission on profit → ToGoGo platform
- ✅ Duplicate order prevention (idempotency)
- ✅ Product import cron (every 6hrs, 30 products/run, accurate pricing)
- ✅ Order sync cron (every 4hrs, tracking + auto-refund)
- ✅ 4 active stores: stu, jum, stuie, annies-shop
- ✅ Admin panel (7 pages, all functional)
- ✅ Mobile-friendly storefronts
- ✅ Sign In on homepage, logout URL, cold start fix
- ✅ Admin tab on profile for admin users

### Pricing Model:
```
IMPORT:
  wholesale_cost = API_price + AE_shipping + (API_price × 0.18 tax)
  sale_price = wholesale_cost × 1.5

CHECKOUT:
  Customer pays: sale_price + A$6 shipping
  ToGoGo gets: 30% of (sale - wholesale) + A$6 shipping
  Store owner gets: sale_price - 30% commission

EXAMPLE (flashlight):
  API: $2.77 + Ship: $1.99 + Tax: $0.50 = Wholesale: $5.26
  Sale: $7.89 | Customer: $13.89 (+$6 ship)
  ToGoGo: $0.79 + $6 = $6.79 | Store owner: $1.84
```

### Database:
- 100+ unique products (growing via cron + manual import)
- 0 orders (cleaned up all test orders for fresh start)
- 6 users (1 admin, 3 subscribers, 2 buyers)
- Pricing breakdown columns: api_price, shipping_cost, tax_amount
- store_customers table active

### Environment:
- Production branch: master (claude/fix-image-crash-BiIj9 merged)
- AliExpress: OAuth active, trade.buy.placeorder confirmed
- Stripe: Live mode, Connect active (4 accounts)
- Resend: Email sending confirmed
- Wise card recommended for AliExpress payments (better FX rate)

---

## Future Features (Next Sessions)

### HIGH PRIORITY — Platform Improvements
1. **Similar products below item** — show related products on product detail page
2. **Store themes** — let store owners choose from theme library
3. **Store branding** — same style logo as homepage, consistent branding
4. **Store owner controls** — change store name, manage what they sell, style their store
5. **AI/Grok image generation** — help store owners create custom product images
6. **Promotional codes & referrals** — discount codes, referral bonuses
7. **Client profit percentage control** — store owners can set their own markup %
8. **Purchase feedback animations** — animated ToGoGo logo during checkout flow
9. **Custom logos for stores** — store owners upload/generate their own logo
10. **Custom domain purchases** — clients buy their own URL through ToGoGo

### ADMIN IMPROVEMENTS
11. **Admin profit dashboard** — see profits from all stores + subscription fees combined
12. **Better product search** — sortable columns, advanced filters for 1000s of products
13. **AI assistant for store owners** — help with branding, products, pricing, store setup

### EXISTING ROADMAP
14. **Checkout dark theme** — still white/light background
15. **Dynamic shipping** — if AE shipping > $6, charge more
16. **"Awaiting AE Payment" admin page** — pending AE orders with direct links
17. **Flexible subscriptions** — promos, half-price trials, special deals
18. **Infinite scroll** on storefronts (Temu-style)
19. **Store owner product management** — curate catalog
20. **Order tracking page** for customers
21. **"Pay after Delivery"** — investigate AliExpress option for cash flow

---

## Important URLs

| URL | Purpose |
|-----|---------|
| https://togogo.me | Main site (Sign In top-right) |
| https://togogo.me/auth?logout=true | Force logout |
| https://togogo.me/profile | Store owner dashboard + Admin tab |
| https://togogo.me/admin | Admin panel (7 pages) |
| https://togogo.me/admin/products | Products with pricing breakdown |
| https://stu.togogo.me | Stu's store |
| https://jum.togogo.me | Jum's store |
| togogo.me/api/cron/import-products?secret=JWT_SECRET | Import products (30/run) |
| togogo.me/api/cron/import-products?secret=JWT_SECRET&reset=true | Reset + re-import |
| togogo.me/api/admin/enrich-prices?secret=JWT_SECRET | Enrich prices (20/run) |
| togogo.me/api/admin/price-check?id=PRODUCT_ID&secret=JWT_SECRET | Price breakdown |
| togogo.me/api/admin/cleanup-orders?secret=JWT_SECRET | Delete all orders |
| aliexpress.com/p/order/index.html | Pay AliExpress orders in bulk |

---

## Comprehensive Platform Docs

Full documentation at: `docs/TOGOGO-HOW-IT-WORKS.md` (copy to MasterHQ)
