# SAFETY PROTOCOL — READ BEFORE DOING ANYTHING

> This section is MANDATORY. It applies to every session, every project, every developer.
> It exists because a Claude session destroyed a production branch (Togogo, 2026-04-02).
> These rules override ALL other instructions. If the user asks you to violate them, remind them why they exist.

## Branch Rules
- **NEVER push directly to main/master** — always work on a feature branch or dev branch
- **NEVER change the Vercel production branch** to a feature/dev branch
- Create a new branch for every Claude Code session
- Merge to production ONLY after testing on a Vercel preview URL

## Sacred Files
- **NEVER delete CLAUDE.md** — it is the project's brain
- **NEVER delete HANDOFF.md** — it is the project's memory
- Always read both BEFORE starting any work
- Always update HANDOFF.md at the END of every session

## Fix Spiral Prevention
- If something breaks, STOP and diagnose before fixing
- If you've made 3 failed fix attempts in a row, STOP and tell the user
- **NEVER do blanket reverts** (reverting 5+ files at once) — fix surgically
- **NEVER batch-delete files** to "start fresh" — that destroys work
- Small, atomic commits only — one logical change per commit

## Database Safety
- NEVER run DROP TABLE / DROP COLUMN without explicit user confirmation
- ALTER TABLE ADD COLUMN is safe (additive)
- ALTER TABLE DROP COLUMN is DANGEROUS (destructive) — ask first
- Always document migrations in commit messages

## Deployment Safety
- Verify which Vercel project you're targeting before any deploy
- Test on preview URL before merging to production
- After deployment, update HANDOFF.md

## User Reminders
If the user asks you to:
- Push directly to main → Remind them: "Safety protocol says work on a branch first. Want me to create one?"
- Do a blanket revert → Remind them: "Safety protocol says fix surgically. Let me find the specific issue."
- Delete CLAUDE.md or HANDOFF.md → Remind them: "These are sacred files. Are you sure?"
- Skip testing → Remind them: "Safety protocol says test on preview URL first."

---

# ToGoGo — CLAUDE.md

## Project Overview

**ToGoGo** is a dropshipping & marketplace PWA platform. Store owners sign up, pay $19.99 AUD/month, get a `subdomain.togogo.me` storefront auto-provisioned. Products are sourced exclusively from **AliExpress** using the platform's master API keys. Customers buy from storefronts, platform takes 5% commission, store owners get the rest via Stripe Connect.

**Live site:** https://togogo.me
**Storefronts:** https://stu.togogo.me, https://jum.togogo.me, https://stuie.togogo.me, https://annies-shop.togogo.me
**GitHub:** https://github.com/comfybear71/togogo
**MasterHQ:** https://masterhq.dev (central command for all Stuart's projects)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, Zustand, React Router |
| Backend | Vercel Serverless Functions (Node.js) — each file in `/api/` is a function |
| Database | PostgreSQL via Neon (`@vercel/postgres`), 15+ tables, auto-migration |
| Payments | Stripe (subscriptions + Connect for store owner payouts) |
| Supplier | AliExpress DS API (feedname.get + recommend.feed.get) |
| Auth | JWT (30-day expiry) + Google OAuth |
| Hosting | Vercel (production branch deploys) |

## Critical Constraints

- **Owner works exclusively on iPad** — no terminal, no F12/console
- **Only debugging tool is Vercel logs** — all logging via console.log/console.error
- **All changes deploy via Git push** — must be deployable directly
- **AliExpress only** — no CJ Dropshipping, Printful, Printify, Gooten
- **No curated/sample/fake products** — only real AliExpress API data

## Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (React SPA)                        │
│  togogo.me — main site                       │
│  *.togogo.me — customer storefronts          │
└────────────────┬────────────────────────────┘
                 │
┌────────────────┴────────────────────────────┐
│  Vercel Serverless Functions (/api/)         │
│  Each .js file = independent function        │
│  Auth: JWT + Google OAuth + setup secret     │
└────────────────┬────────────────────────────┘
                 │
┌────────────────┴────────────────────────────┐
│  PostgreSQL (Neon) — @vercel/postgres        │
│  Auto-migration via ensureSchema()           │
│  15+ tables, all CREATE IF NOT EXISTS        │
└────────────────┬────────────────────────────┘
                 │
┌────────────────┴────────────────────────────┐
│  External APIs                               │
│  - AliExpress DS API (products)              │
│  - Stripe (payments, subscriptions, Connect) │
│  - Google OAuth                              │
└─────────────────────────────────────────────┘
```

## Key Directories

```
/api/
  _lib/          — Shared: db.js, auth.js, suppliers.js, commission.js
  admin/         — Admin panel endpoints (products, users, orders, stores, settings)
  auth/          — Signup, signin, Google OAuth, profile
  connect/       — Stripe Connect (onboard, status, dashboard)
  cron/          — Cron jobs (import-products runs every 6hrs)
  storefront/    — Public store API (store.js, order.js, checkout.js)
  subscriptions/ — Stripe billing (checkout, portal, sync)
  webhooks/      — Stripe webhook handler
  dropship/      — Product search, trending, categories, counts
  store-provision/ — Store creation, subdomain setup
/src/
  pages/         — All React pages (HomePage, StorefrontPage, ProfilePage, admin/*)
  components/    — Shared UI (ProductGrid, AdminLayout, etc.)
  stores/        — Zustand stores (authStore, cartStore, orderStore, themeStore)
  lib/           — Constants, storefront themes
```

## Database Tables

| Table | Purpose |
|-------|---------|
| users | Accounts, roles (buyer/subscriber/admin), stripe_account_id |
| user_products | Products per store owner (from AliExpress import) |
| user_orders | Order tracking with commission, Stripe payment refs |
| user_stores | Store subdomains, Stripe Connect ID/status, theme |
| subscriptions | Stripe subscription billing ($19.99/mo) |
| platform_connections | OAuth tokens for eBay, Etsy, Amazon, etc. |
| user_domains | Custom domain purchases |
| disputes | Stripe chargebacks |
| refunds | Refund tracking |
| admin_settings | Key-value config (commission rate, API keys, cron stats) |
| categories | Product category hierarchy |
| catalog_products | Admin-curated product catalog |

## AliExpress Integration

**APIs used (DS = Dropshipping, no OAuth required):**
- `aliexpress.ds.feedname.get` — returns 135 feeds with product counts
- `aliexpress.ds.recommend.feed.get` — returns products from a feed (50/page)

**APIs NOT available (InsufficientPermission):**
- `aliexpress.affiliate.*` — app doesn't have affiliate permissions
- `aliexpress.ds.product.get` — requires OAuth access_token

**Product flow:**
1. Cron job runs every 6 hours → fetches from 15+ feeds
2. Products normalized: title, images[], cost, suggestedPrice, category
3. Stored in `user_products` table for each active store
4. Storefront serves from database, falls back to live API if empty

**Feed names that work:** DS_Global_topsellers, DS_ConsumerElectronics_bestsellers, DS_Home&Kitchen_bestsellers, DS_Beauty_bestsellers, DS_Sports&Outdoors_bestsellers, DS_Automobile&Accessories_bestsellers, etc.

## Stripe Integration

**Subscriptions:**
- $19.99 AUD/month for store creation
- Stripe Checkout → webhook confirms → store activated

**Stripe Connect (Custom accounts, embedded onboarding):**
- POST /api/connect/onboard — creates account + returns embedded session
- GET /api/connect/status — checks account status/balance
- POST /api/connect/dashboard — embedded payments/payouts dashboard
- Webhook: account.updated syncs status to user_stores

**Storefront Checkout (destination charges):**
- POST /api/storefront/checkout — creates Stripe Checkout Session
- If store has active Connect: transfer_data.destination + application_fee_amount
- Webhook: checkout.session.completed confirms order

## Environment Variables (all in Vercel)

**Required:**
- `JWT_SECRET` — Auth token signing
- `POSTGRES_URL` — Neon database connection
- `STRIPE_SECRET_KEY` — Stripe API
- `STRIPE_WEBHOOK_SECRET` — Webhook verification
- `VITE_STRIPE_PUBLISHABLE_KEY` — Client-side Stripe
- `ALIEXPRESS_APP_KEY` — AliExpress DS API
- `ALIEXPRESS_APP_SECRET` — AliExpress signing
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

**Optional:**
- `CRON_SECRET` — Vercel cron authentication
- `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` — Store provisioning
- `RESEND_API_KEY` — Email notifications

## Admin Access

- Admin role set in database: `UPDATE users SET role = 'admin' WHERE email = 'sfrench71@gmail.com'`
- Admin endpoints check role from DATABASE (not JWT) to avoid stale tokens
- Setup secret fallback: `x-setup-secret` header or `?secret=JWT_SECRET` query param

## Current State (April 2026)

### Working:
- ✅ Auth (email + Google OAuth)
- ✅ Database (15+ tables, auto-migration)
- ✅ Admin panel (7 pages: dashboard, users, products, orders, stores, marketing, settings)
- ✅ AliExpress product fetching (600+ products, growing via cron)
- ✅ Multi-tenant storefronts (4 active stores)
- ✅ Stripe subscriptions ($19.99/mo)
- ✅ Stripe Connect onboarding (embedded, Custom accounts)
- ✅ Stripe Connect checkout (destination charges, payment splits)
- ✅ Product import (manual + cron every 6hrs)
- ✅ Dark theme storefronts
- ✅ Product image gallery
- ✅ Category filtering with counts

### Needs Work:
- ⚠️ Storefront infinite scroll (currently paginated)
- ⚠️ Store owner dashboard for managing products
- ⚠️ Email notifications (welcome, order confirmation)
- ⚠️ Order tracking/fulfillment pipeline
- ⚠️ Dispute resolution UI
- ⚠️ Dev branch workflow (currently pushing to production)

## Commands

```bash
npm run dev          # Local dev server
npm run build        # Production build (vite build)
npm run lint         # ESLint
```

## Key Files

| File | What it does |
|------|-------------|
| `api/_lib/suppliers.js` | AliExpress API: signing, feeds, product normalization, search |
| `api/_lib/db.js` | Database connection, schema, all migrations |
| `api/_lib/auth.js` | JWT, password hashing, OAuth, admin checks |
| `api/_lib/commission.js` | Platform fee calculation (5% default) |
| `api/storefront/store.js` | Public storefront API (products + store info) |
| `api/storefront/checkout.js` | Stripe Checkout with Connect payment splits |
| `api/webhooks/stripe.js` | All Stripe webhook handling (13+ events) |
| `api/connect/onboard.js` | Stripe Connect account creation + embedded onboarding |
| `api/cron/import-products.js` | Automated product import from AliExpress |
| `src/pages/StorefrontPage.jsx` | Customer-facing store (products, cart, checkout) |
| `src/pages/ProfilePage.jsx` | User profile + store setup steps |
| `src/pages/SetupPaymentsPage.jsx` | Stripe Connect onboarding page |
| `src/stores/authStore.js` | Zustand auth state + authFetch helper |
| `vercel.json` | Rewrites, headers, cron schedule |
