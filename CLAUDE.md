# CLAUDE.md — ToGoGo Platform

## Project Overview

ToGoGo is a multi-tenant dropshipping platform with one-click store creation. Sellers get a hosted storefront at `{store}.togogo.me`, can source products from multiple suppliers, and sell across marketplaces (eBay, Etsy, Amazon, TikTok Shop, WooCommerce).

**Live deployment:** https://togogo.vercel.app

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7.3, Tailwind CSS 4.2 |
| State | Zustand 5, TanStack React Query 5 |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Vercel Postgres (Neon) via `@vercel/postgres` |
| Auth | Custom JWT (jsonwebtoken) + Google OAuth (google-auth-library) + bcryptjs |
| Payments | Stripe (subscriptions, checkout, webhooks, customer portal) |
| Domains | Vercel API (subdomains), Namecheap API (custom domains) |
| Icons | Lucide React |
| Charts | Recharts |
| PWA | vite-plugin-pwa + Workbox |

## Project Structure

```
togogo/
├── api/                    # Vercel serverless functions (backend)
│   ├── _lib/               # Shared backend libraries
│   │   ├── auth.js          # JWT sign/verify, password hash/compare, Google OAuth helpers
│   │   ├── db.js            # Postgres pool, ensureSchema() auto-creates all 10 tables
│   │   ├── suppliers.js     # Unified supplier API abstraction (CJ, AliExpress, Printful, Printify, Gooten)
│   │   └── commission.js    # getCommissionRate(), getCommissionPercent() from admin_settings
│   ├── admin/               # Admin panel APIs (JWT or setup-secret protected)
│   │   ├── dashboard.js     # Stats, recent orders, top products, charts
│   │   ├── users.js         # GET/PATCH: user list, search, role/status updates
│   │   ├── products.js      # Product management with commission breakdown
│   │   ├── orders.js        # Orders + disputes + financials
│   │   ├── stores.js        # Store and domain management
│   │   ├── marketing.js     # Marketing metrics
│   │   ├── stats.js         # User statistics
│   │   ├── provision-store.js # Admin-triggered store provisioning
│   │   └── settings/        # Admin settings (key-value config)
│   │       ├── index.js     # GET all settings
│   │       └── bulk.js      # POST bulk update
│   ├── auth/                # Authentication endpoints
│   │   ├── signin.js        # POST: email/password → JWT
│   │   ├── signup.js        # POST: register with bcrypt(12)
│   │   ├── me.js            # GET: current user + subscription + has_store
│   │   ├── profile.js       # PUT: update user profile
│   │   ├── google.js        # GET: initiate Google OAuth redirect
│   │   └── google/callback.js # GET: OAuth callback → find/create user → JWT
│   ├── store-provision/     # One-click store creation (10-step process)
│   │   ├── provision.js     # POST: full provisioning flow
│   │   ├── status.js        # GET: provisioning progress polling
│   │   ├── activate.js      # POST: activate store
│   │   ├── check-subdomain.js # GET: availability check
│   │   ├── create-subdomain.js # POST: register with Vercel
│   │   ├── delete-subdomain.js # DELETE: remove subdomain
│   │   ├── domain-health.js # GET: domain status
│   │   ├── init-schema.js   # POST: DB schema init
│   │   └── delete.js        # DELETE: remove store
│   ├── storefront/          # Public storefront (no auth required)
│   │   ├── store.js         # GET: store info + products by subdomain
│   │   └── order.js         # POST: customer places order
│   ├── subscriptions/       # Stripe billing
│   │   ├── checkout.js      # POST: create Stripe checkout ($19.99 AUD/mo)
│   │   ├── current.js       # GET: active subscription
│   │   ├── billing-config.js # GET: plan pricing
│   │   ├── portal.js        # POST: Stripe customer portal
│   │   └── sync.js          # POST: sync Stripe state to DB
│   ├── webhooks/
│   │   └── stripe.js        # POST: handles 13 Stripe events (370 lines)
│   ├── platforms/           # Marketplace integrations (eBay, Etsy, Amazon, TikTok, WooCommerce)
│   │   ├── connect.js       # POST: initiate OAuth
│   │   ├── connections.js   # GET: list connected platforms
│   │   ├── disconnect.js    # DELETE: remove connection
│   │   ├── push-product.js  # POST: push to marketplace (WooCommerce implemented)
│   │   ├── callback/        # OAuth callbacks per platform
│   │   └── webhook/
│   │       └── woocommerce.js # POST: order sync webhook
│   ├── dropship/            # Supplier product search
│   │   ├── search.js        # GET: search all suppliers with filters
│   │   ├── categories.js    # GET: categories
│   │   ├── trending.js      # GET: trending products
│   │   ├── suppliers.js     # GET: active supplier list
│   │   └── counts.js        # GET: product count per supplier
│   ├── products/            # Product management
│   │   ├── search.js        # GET: search user_products
│   │   ├── deals.js         # GET: daily deals, trending
│   │   ├── price-history.js # GET: watchlist price tracking
│   │   └── [id].js          # GET: single product detail
│   ├── domains/             # Custom domain management
│   │   ├── search.js        # GET: availability check (Namecheap)
│   │   ├── register.js      # POST: register domain
│   │   └── purchase.js      # POST: purchase via Stripe
│   ├── my-shop/             # Seller's own shop
│   │   ├── products.js      # GET: seller's products
│   │   └── store.js         # GET: seller's store info
│   ├── dashboard/stats.js   # GET: user dashboard stats
│   ├── watchlist/           # Price tracking
│   ├── config/commission.js # GET: current commission rate
│   ├── chat.js              # AI assistant endpoint
│   ├── db/init.js           # GET: initialize schema
│   ├── db/seed-client.js    # POST: seed test user
│   └── retailers/index.js   # GET: retailer list
├── src/                     # React frontend
│   ├── App.jsx              # Router with subdomain detection for multi-tenancy
│   ├── main.jsx             # React 19 entry point
│   ├── index.css            # Global styles, dark mode, animations
│   ├── pages/               # ~20 pages
│   │   ├── HomePage.jsx     # Landing with hero, pricing cards
│   │   ├── AuthPage.jsx     # Sign in/up (email + Google OAuth)
│   │   ├── AuthCallbackPage.jsx # Google OAuth token receiver
│   │   ├── BrowsePage.jsx   # Product catalog with filters
│   │   ├── ProductDetailPage.jsx # Product detail with supplier comparison
│   │   ├── LaunchStorePage.jsx   # Store wizard (905 lines)
│   │   ├── OneClickStorePage.jsx # Store provisioning with live progress
│   │   ├── MyShopPage.jsx   # Manage products, settings
│   │   ├── DashboardPage.jsx # Orders, revenue, charts (540 lines)
│   │   ├── StorefrontPage.jsx # Customer-facing store on subdomains (700+ lines)
│   │   ├── SubscriptionPage.jsx # Billing management
│   │   ├── CheckoutPage.jsx # Payment flow
│   │   └── admin/           # 7 admin pages
│   │       ├── DashboardPage.jsx # Stats, charts, recent activity
│   │       ├── UsersPage.jsx     # User management
│   │       ├── ProductsPage.jsx  # Products with commission breakdown
│   │       ├── OrdersPage.jsx    # Orders, disputes, financials
│   │       ├── StoresPage.jsx    # Store/domain management
│   │       ├── MarketingPage.jsx # Marketing analytics
│   │       └── SettingsPage.jsx  # Admin config (commission rate, API keys)
│   ├── components/
│   │   ├── admin/AdminLayout.jsx  # Dark admin wrapper
│   │   ├── admin/AdminRoute.jsx   # Admin role guard
│   │   ├── auth/ProtectedRoute.jsx # Auth guard
│   │   ├── layout/               # Header, Sidebar, BottomNav, Logo, AppLayout
│   │   ├── products/             # ProductGrid, ProfitCalculator, ImageUpload
│   │   ├── messaging/ChatBubble.jsx
│   │   └── ui/                   # Avatar, Card, Badge, Button, Input, Modal, etc.
│   ├── stores/              # Zustand state stores
│   │   ├── authStore.js     # User auth, JWT, Google OAuth, authFetch helper
│   │   ├── cartStore.js     # Shopping cart (localStorage)
│   │   ├── orderStore.js    # Order state
│   │   └── themeStore.js    # Dark mode toggle (persisted)
│   ├── hooks/               # React Query hooks
│   │   ├── useProducts.js   # Deals, search, price history
│   │   ├── usePlatforms.js  # Platform connections
│   │   ├── useSubscription.js # Active subscription
│   │   ├── useSuppliers.js  # Supplier directory
│   │   └── useWatchlist.js  # Watchlist alerts
│   └── lib/
│       ├── constants.js     # Categories, plans, themes, currencies
│       └── storefrontThemes.js # 5 themes: Sunset, Midnight, Forest, Lavender, Coral
├── scripts/
│   └── seed-test-user.js    # Create test user (test@togogo.com / test1234)
├── docs/
│   └── claude-context-prompt.md # Detailed project context (20KB)
├── public/
│   ├── favicon.svg
│   └── tiktok*.txt          # TikTok verification files
├── vercel.json              # Rewrites + security headers
├── vite.config.js           # React, Tailwind, PWA config
├── eslint.config.js         # ESLint with React hooks
├── index.html               # SPA entry point
└── package.json             # Dependencies and scripts
```

## Commands

```bash
npm run dev           # Start Vite dev server (port 5173)
npm run build         # Build production bundle
npm run lint          # ESLint check
npm run preview       # Preview production build
npm run seed:test-user # Seed test user (test@togogo.com / test1234)
```

## Database

**10 tables, auto-created on first request via `ensureSchema()` in `api/_lib/db.js`:**

| Table | Purpose |
|-------|---------|
| `users` | Accounts (email, password_hash, google_id, role, wallet_balance, trust_score) |
| `user_orders` | Orders with supplier_cost, sale_price, profit, commission, tracking |
| `user_products` | Products listed by sellers (supplier_cost, sale_price, platforms_listed) |
| `subscriptions` | Stripe subscriptions (plan, status, stripe_subscription_id) |
| `platform_connections` | OAuth tokens for eBay/Etsy/Amazon/TikTok/WooCommerce |
| `user_domains` | Purchased custom domains (Namecheap registration) |
| `user_stores` | One-click stores (subdomain, status, provision_data JSONB) |
| `disputes` | Stripe chargebacks (stripe_dispute_id, evidence_due_by) |
| `refunds` | Refund records (stripe_charge_id, amount, reason) |
| `admin_settings` | Key-value config (commission rate, API keys, secrets) |

No manual migrations needed — schema uses `CREATE TABLE IF NOT EXISTS` and inline `ALTER TABLE` for column additions.

## Authentication

- **JWT:** 30-day expiry, payload `{ id, email, role }`, stored in localStorage as `togogo-token`
- **Password:** bcryptjs with 12 rounds
- **Google OAuth:** Full flow via `google-auth-library` (redirect → callback → find/create user → JWT)
- **Admin auth:** role === 'admin' OR `x-setup-secret` header matching `JWT_SECRET` (for initial setup)
- **authFetch:** Helper in `authStore.js` that auto-attaches Bearer token to all API requests

## Multi-Tenant Architecture

1. Wildcard DNS `*.togogo.me` routes all subdomains to the same Vercel deployment
2. `App.jsx` detects subdomain from `window.location.hostname`
3. Subdomain requests render `StorefrontPage` (public, no auth)
4. StorefrontPage fetches `/api/storefront/store?subdomain=X` for store data and products
5. Data isolation via `user_stores.user_id` and `user_products.user_id`

## Commission System

- Default: **5%** of sale_price (configurable in admin_settings `platform_fee_percent`)
- Centralized via `api/_lib/commission.js` — all backend reads dynamic admin setting
- Tracked per-order: `user_orders.commission` and `user_orders.commission_rate`
- `sale_price = supplier_cost + (supplier_cost × commission_rate) + seller_markup`
- Admin dashboard shows total_fees, total_payouts, platform_balance

## Stripe Integration

- **Subscription:** $19.99 AUD/month for store creation
- **Checkout:** Creates Stripe session → redirects to Stripe → webhook activates store
- **Webhook** (`/api/webhooks/stripe`): Handles 13 events — checkout.session.completed, subscription lifecycle, invoice success/failure, disputes, refunds
- **Customer Portal:** `/api/subscriptions/portal` returns Stripe-hosted billing management URL
- **Domain purchase:** Stripe checkout → webhook → Namecheap registration
- **Webhook security:** Signature verification via `stripe.webhooks.constructEvent()`, raw body required (`config.api.bodyParser = false`)

## Store Provisioning (10 Steps)

`/api/store-provision/provision.js` runs a 10-step process:
1. validate — verify store name & subdomain format
2. subdomain — register with Vercel API
3. dns — configure DNS (automatic via Vercel wildcard)
4. ssl — provision SSL certificate
5. storefront — deploy (already live via Vercel)
6. theme — apply store theme
7. products — import starter products from suppliers via `importStarterProducts()`
8. payments — setup payment processing
9. suppliers — link supplier connections
10. finalize — mark store active

Frontend polls `/api/store-provision/status` every ~2s for progress. Progress stored in `user_stores.provision_data` (JSONB).

## Supplier Integrations

Unified interface in `api/_lib/suppliers.js` (~1000 lines):
- **CJ Dropshipping** — API key auth, product search, order placement
- **AliExpress** — App key/secret, product search
- **Printful** — API key, print-on-demand
- **Printify** — API key, print-on-demand
- **Gooten** — Recipe ID + partner billing key, print-on-demand

All normalized to common product format with NSFW filtering and margin calculation.

## Platform Integrations

OAuth-based connections for selling on external marketplaces:
- **eBay** — Standard OAuth2 flow
- **Etsy** — PKCE OAuth flow
- **Amazon** — SP-API OAuth
- **TikTok Shop** — Standard OAuth
- **WooCommerce** — WC-Auth flow + order sync webhook

Product push currently implemented only for WooCommerce (`api/platforms/push-product.js`).

## Environment Variables

See `.env.example` for all required variables. Key ones:
- `JWT_SECRET` — required for auth
- `POSTGRES_URL` — Vercel Postgres / Neon connection string
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — Stripe billing
- `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` — store provisioning
- Platform and supplier API keys (see `.env.example` for full list)

## Key Patterns

- **No Express server** — pure Vercel Functions, each route is a standalone `.js` file
- **Auto-init schema** — `ensureSchema()` runs on every DB connection, creates tables if missing
- **Webhook-driven activation** — Stripe webhook triggers store activation after payment
- **No dummy data** — all data comes from database, no localStorage fallbacks
- **Currency:** AUD (Australian Dollars) throughout
