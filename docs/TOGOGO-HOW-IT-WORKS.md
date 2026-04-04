# ToGoGo — How The Shop Works
## Comprehensive Platform Documentation

**Last Updated:** 2026-04-04
**Version:** 1.0 — First successful end-to-end order
**Author:** Stuart French / Claude Code Session 3

---

## 1. Platform Overview

ToGoGo is a **fully automated dropshipping platform**. Store owners get a branded storefront, products from AliExpress, and automated order fulfillment — all for $19.99/month.

### The Business Model

```
Customer buys on store → Stripe processes payment → AliExpress order auto-created
                                                   → Admin pays AliExpress in bulk
                                                   → AliExpress ships to customer
                                                   → Everyone profits
```

### Revenue Streams
1. **Monthly subscription:** $19.99 AUD/month per store
2. **Commission:** 30% of profit on every sale (profit = sale_price - supplier_cost)
3. **Volume:** More stores × more sales = more commission

---

## 2. How Pricing Works

### Formula
```
sale_price = supplier_cost × 1.5
```

- **supplier_cost** = AliExpress price in AUD (from API with `target_currency: 'AUD'`)
- **1.5x** = 50% markup over wholesale cost
- **Max price cap:** A$1,000 (anything higher is skipped during import)

### Example: A Product That Costs A$40 Wholesale
| Item | Amount |
|------|--------|
| AliExpress wholesale cost | A$40.00 |
| Store sale price (1.5x) | A$60.00 |
| **Profit** | **A$20.00** |
| ToGoGo commission (30% of profit) | A$6.00 |
| Store owner keeps | A$14.00 |

### Who Pays What
- **Customer** pays A$60.00 via Stripe on the storefront
- **Store owner** receives A$60.00 - A$6.00 = A$54.00 via Stripe Connect
- **Platform (you)** receives A$6.00 commission via Stripe
- **Platform (you)** pays A$40.00 to AliExpress manually
- **Platform net profit:** A$6.00 - A$0 = A$6.00 (AE cost comes out of the store owner's share)

> **Note:** The platform commission is deducted from the Stripe payment as an `application_fee`. The AliExpress wholesale cost is paid separately by the platform admin from their AliExpress account.

---

## 3. The Complete Order Flow

### Step-by-Step (Fully Automated Except Step 7)

```
Step 1: Customer browses stu.togogo.me
        → Products loaded from database (shuffled randomly)
        → Prices shown in AUD with A$ prefix

Step 2: Customer adds product to cart
        → Cart stored in sessionStorage per store
        → Shows item, quantity, A$ total

Step 3: Customer fills checkout form
        → Name, email, phone, shipping address
        → Clicks "Place Order"

Step 4: Stripe Checkout Session created
        → Server fetches product from DB (sale_price, not cart price)
        → Commission calculated: 30% of (sale_price - supplier_cost)
        → If store has Stripe Connect: destination charge + application_fee
        → Customer redirected to Stripe payment page
        → Stripe collects phone number + validated shipping address

Step 5: Customer pays on Stripe
        → Card charged in AUD
        → Payment confirmed via webhook

Step 6: Webhook processes (ALL AUTOMATIC)
        → 6a. Order status updated: pending_payment → pending
        → 6b. 3 emails sent via Resend:
              - Customer: "Order Confirmed — TG-XXXXX"
              - Store owner: "New Order — TG-XXXXX ($XX.XX)"
              - Admin: "[Admin] New Order — TG-XXXXX ($XX.XX)"
        → 6c. Store customer saved (email, name, order count, total spent)
        → 6d. AliExpress order auto-created:
              - Fetches product details for SKU resolution
              - Maps shipping address (AU states → full names)
              - Calls aliexpress.trade.buy.placeorder
              - Order appears in AliExpress "Awaiting Payment"
              - supplier_order_id saved to DB

Step 7: Admin pays AliExpress (MANUAL — only manual step)
        → Log into aliexpress.com/p/order/index.html
        → Pay pending orders in bulk with credit card
        → Can wait up to 20 days before auto-cancel
        → Recommended: pay once daily

Step 8: AliExpress ships to customer (AUTOMATIC)
        → Product shipped directly to customer's address
        → Tracking number assigned by AliExpress

Step 9: Order sync cron (AUTOMATIC — every 4 hours)
        → Polls AliExpress for order status updates
        → Updates local order: processing → shipped → delivered
        → Saves tracking number to DB
        → If AliExpress cancels: auto-refund via Stripe

Step 10: Customer receives product
         → Delivered to their door
         → Store owner and platform both profited
```

---

## 4. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, Zustand |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | PostgreSQL via Neon (`@vercel/postgres`) |
| Payments | Stripe (subscriptions + Connect for store owner payouts) |
| Supplier | AliExpress DS API (OAuth, trade.buy.placeorder) |
| Auth | JWT (30-day expiry) + Google OAuth |
| Email | Resend (togogo.me domain verified) |
| Hosting | Vercel (auto-deploy on git push) |

---

## 5. Key APIs & Integrations

### AliExpress (Drop Shipping API)
- **App:** ToGoGo, AppKey: 529066, Category: Drop Shipping
- **OAuth:** Access token stored in `admin_settings` table (30-day expiry)
- **Product feeds:** `aliexpress.ds.recommend.feed.get` (target_currency: AUD)
- **Product details:** `aliexpress.ds.product.get` (images, variants, description)
- **Order placement:** `aliexpress.trade.buy.placeorder` (creates real orders)
- **Order tracking:** `aliexpress.ds.member.order.get` (shipping status)
- **DO NOT USE:** `aliexpress.ds.member.orderdata.submit` (this is data backflow/reporting only)

### Stripe
- **Subscriptions:** $19.99 AUD/month via Stripe Checkout
- **Connect:** Custom accounts with embedded onboarding
- **Storefront checkout:** Destination charges with `application_fee_amount`
- **Webhook events:** checkout.session.completed, account.updated, charge.refunded
- **Phone collection:** Enabled via `phone_number_collection`

### Resend (Email)
- **Domain:** togogo.me (verified, DNS configured)
- **3 emails per order:** Customer confirmation, store owner alert, admin alert
- **Templates:** Dark theme, ToGoGo branding, order details table

---

## 6. Store Owner Experience

### Getting Started
1. Visit togogo.me → Click "Create My Store"
2. Sign up with email or Google
3. Choose subdomain (e.g. `mystore.togogo.me`)
4. Pay $19.99/month subscription via Stripe
5. Set up Stripe Connect (embedded onboarding) to receive payouts
6. Store auto-provisioned with products from AliExpress

### What Store Owners See
- **Profile page:** Revenue, orders, products, earnings chart
- **My Store tab:** Store management, theme, products
- **Settings tab:** Account settings
- **Their storefront:** subdomain.togogo.me with dark theme, products, cart, checkout

### What Store Owners DON'T Do
- No contact with AliExpress
- No product sourcing
- No order fulfillment
- No shipping management
- No payment processing setup (beyond Stripe Connect)

---

## 7. Admin (Platform Operator) Experience

### Admin Access
- Email: sfrench71@gmail.com (role: admin in database)
- URL: togogo.me/admin (7 pages)
- Profile page shows Admin tab (shield icon) for admin users only

### Admin Dashboard
- Total Users, Active Stores, Active Listings, MRR
- Revenue Today, Revenue chart (30 days)
- Recent Orders list

### Admin Responsibilities
1. **Pay AliExpress orders** — Log in daily, pay pending orders in bulk
2. **Monitor orders** — Check admin/orders for issues
3. **Manage users** — View/edit users, set roles
4. **Import products** — Cron runs every 6hrs, or manual trigger
5. **Monitor stores** — Check store health, Connect status

### Important Admin URLs
| URL | Purpose |
|-----|---------|
| togogo.me/admin | Admin panel |
| togogo.me/auth?logout=true | Force logout |
| togogo.me/api/cron/import-products?secret=JWT_SECRET | Import products |
| togogo.me/api/cron/import-products?secret=JWT_SECRET&reset=true | Reset + re-import |
| togogo.me/api/admin/cleanup-orders?secret=JWT_SECRET | Delete all orders |
| aliexpress.com/p/order/index.html | Pay AliExpress orders |

---

## 8. Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | Accounts, roles (buyer/subscriber/admin), stripe_account_id |
| `user_products` | Products per store (supplier_cost, sale_price, supplier_product_id) |
| `user_orders` | Orders with commission, Stripe refs, AliExpress order ID |
| `user_stores` | Store subdomains, Stripe Connect, theme |
| `store_customers` | Per-store customer tracking (email, orders, total spent) |
| `subscriptions` | Stripe subscription billing |
| `admin_settings` | Config (commission rate, AliExpress token, etc.) |
| `refunds` | Stripe refund tracking |
| `disputes` | Stripe chargeback tracking |

---

## 9. Cron Jobs

| Job | Schedule | What It Does |
|-----|----------|-------------|
| `import-products` | Every 6 hours | Fetches products from AliExpress feeds, imports to all stores |
| `sync-orders` | Every 4 hours | Polls AliExpress for shipping/delivery/cancellation updates |

---

## 10. Pricing Configuration

### Changing the Markup Multiplier
File: `api/_lib/suppliers.js` → `normaliseProduct()` function
```javascript
const suggestedPrice = Math.ceil(cost * 1.5 * 100) / 100
//                                      ^^^ change this number
```

### Changing the Commission Rate
- **Default:** 30% (set in `api/_lib/commission.js`)
- **Override:** Set `platform_fee_percent` in `admin_settings` table via admin panel
- **Commission is on PROFIT:** 30% of (sale_price - supplier_cost)

### Re-importing with New Prices
After changing the multiplier:
1. Deploy the code change
2. Hit: `togogo.me/api/cron/import-products?secret=JWT_SECRET&reset=true`
3. This deletes all products and re-imports with new pricing

---

## 11. Security & Safety

### Branch Rules
- NEVER push directly to main/master
- Create feature branch for every session
- Test on Vercel preview before merging to production

### Auth
- JWT tokens (30-day expiry) stored in localStorage as `togogo-token`
- Admin role checked from DATABASE (not JWT) to prevent stale tokens
- Google OAuth supported

### Data Safety
- No DROP TABLE without explicit confirmation
- All schema changes via `ensureSchema()` with `CREATE IF NOT EXISTS`
- Migrations use `ALTER TABLE ADD COLUMN IF NOT EXISTS`

---

## 12. Future Roadmap

### High Priority
- [ ] Admin Customers page (data collected, UI not built)
- [ ] Admin Products: sortable columns + better filtering
- [ ] Store sort function (price high→low, new arrivals)
- [ ] "Awaiting AliExpress Payment" admin page with direct links
- [ ] Flexible subscription pricing (promos, half-price trials)
- [ ] Store owner product management

### Medium Priority
- [ ] Infinite scroll on storefronts (Temu-style)
- [ ] Order tracking page for customers
- [ ] Store theme selection UI
- [ ] Per-store commission overrides
- [ ] Promo codes for subscriptions

### Low Priority
- [ ] ImprovMX for receiving @togogo.me emails
- [ ] Service worker caching fix
- [ ] Dev branch workflow documentation

---

## 13. Verified Working (April 4, 2026)

- [x] Customer purchase → Stripe payment → 3 emails → AliExpress order created
- [x] First real AliExpress order: **8210482925469621** (paid and shipping)
- [x] Store customer saved on purchase
- [x] Products shuffled randomly per visit
- [x] SKU variants with human-readable labels
- [x] Mobile-friendly (no zoom issues)
- [x] AUD prices with A$ prefix
- [x] Dark theme storefronts
- [x] Admin panel (all 7 pages)
- [x] Sign In on homepage
- [x] Logout URL (togogo.me/auth?logout=true)
- [x] Cold start fix for /my-shop

---

*This document is stored in the ToGoGo repository at `docs/TOGOGO-HOW-IT-WORKS.md` and should be copied to MasterHQ.*
