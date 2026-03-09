# ToGoGo — Full Project Context Prompt

Copy everything below this line into a new Claude conversation:

---

## Project Overview

I'm building **ToGoGo** — a multi-tenant e-commerce dropshipping platform where users can create their own online store with one click. Each store gets a subdomain (e.g., `mystore.togogo.me`). The platform is live at [togogo.vercel.app](https://togogo.vercel.app).

The business model: users pay $19.99/month for a store subscription. They source products from dropshipping suppliers, list them on their ToGoGo store and/or external marketplaces (eBay, Etsy, Amazon, TikTok Shop, WooCommerce), and ToGoGo takes a configurable commission (default 5%) on every sale.

## Tech Stack

- **Frontend:** React 19 + Vite 7 + Tailwind CSS 4 + Zustand (state) + React Query (data fetching)
- **Backend:** Vercel Serverless Functions (Node.js) — no Express, no traditional server
- **Database:** Vercel Postgres (Neon) — schema auto-initializes on first request via `ensureSchema()` in `api/_lib/db.js`
- **Auth:** Custom JWT (30-day expiry) + Google OAuth + bcryptjs (12 rounds)
- **Payments:** Stripe (subscriptions, checkout sessions, billing portal, webhooks, dispute/refund tracking)
- **Hosting:** Vercel with `*.togogo.me` wildcard domain
- **PWA:** Enabled via vite-plugin-pwa + workbox

## Project Structure

```
/togogo
├── api/                          # Vercel serverless functions
│   ├── _lib/
│   │   ├── auth.js              # JWT verification, bcrypt, OAuth helpers
│   │   ├── db.js                # Postgres connection pool, ensureSchema() with ALL table definitions
│   │   ├── commission.js        # Reads commission rate from admin_settings
│   │   └── suppliers.js         # Massive file (~64KB) — CJ Dropshipping, AliExpress, Printful, Printify, Gooten integrations, NSFW filtering, product grouping
│   ├── auth/
│   │   ├── signin.js            # POST — email/password login, returns JWT
│   │   ├── signup.js            # POST — registration with bcrypt
│   │   ├── me.js                # GET — current user + has_store flag
│   │   ├── profile.js           # PUT — update user profile
│   │   ├── google.js            # GET — initiate Google OAuth redirect
│   │   └── google/callback.js   # GET — Google OAuth callback, creates/finds user, returns JWT
│   ├── store-provision/
│   │   ├── provision.js         # POST — 10-step one-click store creation (validate→subdomain→dns→ssl→storefront→theme→products→payments→suppliers→finalize)
│   │   └── status.js            # GET — provisioning progress polling
│   ├── storefront/
│   │   ├── store.js             # GET — public store info + products by subdomain (no auth)
│   │   └── order.js             # GET — create order on storefront
│   ├── subscriptions/
│   │   ├── checkout.js          # POST — create Stripe checkout session ($19.99/mo), auto-creates store record
│   │   ├── current.js           # GET — active subscription details
│   │   └── portal.js            # POST — Stripe billing portal session
│   ├── webhooks/
│   │   └── stripe.js            # POST — handles checkout.session.completed, subscription lifecycle, invoice events, disputes, refunds (~370 lines)
│   ├── admin/
│   │   ├── dashboard.js         # GET — stats, recent orders, top products, revenue/signup charts
│   │   ├── users.js             # GET/PATCH — user management with search/filter
│   │   ├── stores.js            # GET — store and domain management
│   │   ├── orders.js            # GET — orders + disputes + financials
│   │   ├── products.js          # GET — product management with commission breakdown
│   │   ├── marketing.js         # GET — marketing analytics
│   │   ├── stats.js             # GET — user statistics
│   │   └── settings/
│   │       ├── index.js         # GET — all admin settings
│   │       └── bulk.js          # POST — bulk update settings
│   ├── platforms/
│   │   ├── connect.js           # POST — initiate OAuth for eBay/Etsy/Amazon/TikTok/WooCommerce
│   │   ├── connections.js       # GET — list user's connected platforms
│   │   ├── disconnect.js        # DELETE — remove platform connection
│   │   ├── push-product.js      # POST — push product to platform (only WooCommerce implemented so far)
│   │   └── callback/
│   │       └── ebay.js          # GET — eBay OAuth callback, token exchange, stores in platform_connections
│   ├── dropship/
│   │   ├── search.js            # GET — search all suppliers with filtering, sorting, NSFW filtering
│   │   ├── categories.js        # GET — product categories
│   │   ├── trending.js          # GET — trending products
│   │   ├── suppliers.js         # GET — active supplier list
│   │   └── counts.js            # GET — products per supplier
│   ├── products/
│   │   ├── search.js            # GET — search user_products
│   │   ├── deals.js             # GET — daily/trending/category deals
│   │   ├── price-history.js     # GET — price tracking
│   │   └── [id].js              # GET — single product
│   ├── domains/
│   │   ├── search.js            # GET — domain availability (Namecheap)
│   │   ├── register.js          # POST — register domain
│   │   └── purchase.js          # POST — domain purchase via Stripe
│   ├── config/
│   │   └── commission.js        # GET — current commission rate
│   └── db/
│       ├── init.js              # GET — initialize database schema
│       └── seed-client.js       # POST — seed test user
├── src/
│   ├── App.jsx                  # Main router — detects subdomain → renders StorefrontPage or main app
│   ├── main.jsx                 # React entry point
│   ├── index.css                # Global styles, theme animations, dark mode
│   ├── pages/
│   │   ├── HomePage.jsx         # Landing page with hero, quick-start cards, pricing
│   │   ├── AuthPage.jsx         # Sign in/up with email or Google
│   │   ├── AuthCallbackPage.jsx # Handles Google OAuth redirect
│   │   ├── BrowsePage.jsx       # Product catalog with supplier/category filters
│   │   ├── ProductDetailPage.jsx# Single product with deal comparisons
│   │   ├── WatchlistPage.jsx    # Saved products with price alerts
│   │   ├── SetupPage.jsx        # Onboarding guide
│   │   ├── SuppliersPage.jsx    # Supplier directory
│   │   ├── PlatformsPage.jsx    # Platform integration overview
│   │   ├── PlatformGuidePage.jsx# Step-by-step platform setup guides
│   │   ├── LaunchStorePage.jsx  # Store launch wizard (~905 lines) — marketplace options + custom domain
│   │   ├── OneClickStorePage.jsx# One-click store provisioning with live progress
│   │   ├── MyShopPage.jsx       # Manage products and store settings
│   │   ├── DashboardPage.jsx    # Orders, platforms, revenue, earnings chart (~540 lines)
│   │   ├── OrdersPage.jsx       # Order history
│   │   ├── CartPage.jsx         # Shopping cart
│   │   ├── CheckoutPage.jsx     # Payment flow
│   │   ├── InboxPage.jsx        # Notifications
│   │   ├── ProfilePage.jsx      # User profile settings
│   │   ├── MarketingPage.jsx    # Marketing tools
│   │   ├── SubscriptionPage.jsx # Subscription management
│   │   ├── SellPage.jsx         # Selling overview
│   │   ├── ShippingPage.jsx     # Shipping options
│   │   ├── PromotionsPage.jsx   # Marketing tips
│   │   ├── AssistantPage.jsx    # AI step-by-step guides
│   │   ├── TermsPage.jsx        # Terms of service
│   │   ├── PrivacyPage.jsx      # Privacy policy
│   │   ├── StorefrontPage.jsx   # Customer-facing store (rendered on subdomains)
│   │   └── admin/
│   │       ├── AdminDashboard.jsx  # Admin stats overview
│   │       ├── UsersPage.jsx       # User management
│   │       ├── ProductsPage.jsx    # Product management with commission breakdown
│   │       ├── OrdersPage.jsx      # Orders + disputes + financials
│   │       ├── StoresPage.jsx      # Store + domain management
│   │       ├── MarketingPage.jsx   # Marketing metrics
│   │       └── SettingsPage.jsx    # Admin config (API keys, commission rate, etc.)
│   ├── components/
│   │   ├── admin/               # AdminLayout, AdminSidebar, AdminRoute
│   │   ├── auth/                # ProtectedRoute
│   │   ├── layout/              # Header, Sidebar, BottomNav, Footer
│   │   ├── messaging/           # Chat/inbox components
│   │   ├── products/            # ProductGrid, ProfitCalculator
│   │   └── ui/                  # Reusable UI (LoadingSpinner, etc.)
│   ├── stores/
│   │   ├── authStore.js         # User auth state + authFetch helper for JWT requests
│   │   ├── cartStore.js         # Shopping cart (localStorage)
│   │   ├── orderStore.js        # Order history (localStorage)
│   │   ├── useWatchlistStore.js # Watchlist with price alerts (localStorage)
│   │   ├── useInboxStore.js     # Notifications (localStorage)
│   │   └── themeStore.js        # Dark mode toggle (persisted)
│   ├── hooks/
│   │   ├── useProducts.js       # React Query hooks for deals, search, price history, trending
│   │   ├── usePlatforms.js      # Platform connections and OAuth
│   │   ├── useSubscription.js   # Active subscription
│   │   ├── useSuppliers.js      # Supplier directory
│   │   └── useWatchlist.js      # Watchlist price alerts
│   └── lib/
│       └── constants.js         # Categories, plans, themes, sort options, currencies, retailers
├── public/                      # Static assets, PWA icons
├── scripts/
│   └── seed-test-user.js        # Test user creation script
├── vercel.json                  # Vercel rewrites (SPA fallback + API routing) & security headers
├── vite.config.js               # Vite config with PWA plugin, proxy for /api in dev
├── package.json                 # Dependencies
├── .env.example                 # All environment variables documented
└── .gitignore
```

## Database Schema (10 tables, all auto-created)

1. **users** — id, email, password_hash, name, avatar_url, bio, location (suburb/country), phone, role (buyer/subscriber/both/admin), trust_score, verification_level (1-3), wallet_balance, stripe_account_id, google_id
2. **user_orders** — id, user_id, supplier, supplier_order_id, product_title, product_image, supplier_cost, sale_price, profit, quantity, commission, commission_rate (default 5%), platform (ebay/etsy/amazon/tiktok/woocommerce), platform_order_id, customer_name, customer_email, shipping_address (JSONB), status (pending/processing/shipped/delivered/cancelled/refunded), tracking_number, tracking_url, notes
3. **user_products** — id, user_id, title, description, image, images (TEXT[]), supplier, supplier_product_id, supplier_url, supplier_cost, sale_price, category, is_active, platforms_listed (JSONB), total_sold, total_revenue
4. **subscriptions** — id, user_id, plan (free/basic/premium), status (active/past_due/cancelled/expired), stripe_subscription_id, price_per_month, started_at, expires_at
5. **platform_connections** — id, user_id, platform, status (pending/active/expired/error), shop_name, shop_url, access_token, refresh_token, token_expires_at, token_data (JSONB), oauth_state, oauth_verifier, products_synced, last_sync_at, connected_at. UNIQUE(user_id, platform)
6. **user_domains** — id, user_id, domain, status (pending/active/expired/transferred), registrar, nameservers, registered_at, expires_at, auto_renew. UNIQUE(user_id, domain)
7. **user_stores** — id, user_id (UNIQUE), subdomain (UNIQUE), full_domain, store_name, status (pending/provisioning/active/suspended/deleted), tier, vercel_domain_id, provision_data (JSONB)
8. **disputes** — id, stripe_dispute_id, stripe_charge_id, order_id, user_id, amount, currency, reason, status (open/under_review/won/lost/closed), admin_note, evidence_due_by, resolved_at
9. **refunds** — id, stripe_charge_id, stripe_refund_id, order_id, user_id, amount, currency, reason, status (pending/completed/failed)
10. **admin_settings** — id, key, value, category, label, is_secret. Used for commission_rate, API keys, and platform configuration

## Multi-Tenant Architecture

1. Wildcard DNS: `*.togogo.me` → Vercel deployment
2. `App.jsx` detects subdomain from `window.location.hostname`
3. Subdomain requests render `StorefrontPage` instead of main app
4. `StorefrontPage` fetches store data + products via `/api/storefront/store?subdomain=X`
5. Store data isolated per user via `user_stores` + `user_products` tables
6. 5 storefront themes available: Sunset (orange), Midnight (blue), Forest (green), Lavender (purple), Coral (pink)

## Commission System

- Default 5% commission on all sales, configurable via admin_settings
- Product pricing: `sale_price = supplier_cost + (supplier_cost * commission_rate) + seller_markup`
- Commission tracked per order in `user_orders.commission` and `user_orders.commission_rate`
- Admin products page shows commission breakdown

## Payment Flow

- Store subscription: $19.99/mo via Stripe Checkout → webhook activates store
- Stripe billing portal for subscription management
- Optional GST via Stripe Tax
- Disputes and refunds tracked in dedicated tables
- Webhook handles: checkout.session.completed, subscription lifecycle, invoice events, disputes, refunds

## Supplier Integrations (Dropshipping)

- **CJ Dropshipping** — Token-based auth, product search, inventory sync
- **AliExpress** — API key auth, product search
- **Printful** — Print-on-demand products
- **Printify** — POD aggregator
- **Gooten** — POD provider
- All suppliers searched via `/api/dropship/search.js` with NSFW filtering, product grouping, and margin calculation

## Platform Integrations (Selling Channels)

OAuth connections to 5 marketplaces:
- **eBay** — Standard OAuth with sandbox/production support. Scopes: api_scope, sell.inventory, sell.fulfillment, sell.account. **OAuth flow is built. Product push NOT yet implemented.**
- **Etsy** — PKCE OAuth flow
- **Amazon** — SP-API OAuth
- **TikTok Shop** — Custom OAuth
- **WooCommerce** — WC-Auth flow. **Only platform with product push implemented so far.**

## eBay Developer Account (NEWLY CREATED)

I just created an eBay developer account. Environment variables needed:
```
EBAY_CLIENT_ID=your-client-id
EBAY_CLIENT_SECRET=your-client-secret
EBAY_ENVIRONMENT=SANDBOX   # start in sandbox, switch to PRODUCTION when ready
```

The eBay OAuth flow is fully built (connect.js → callback/ebay.js), tokens are stored in platform_connections, but the following still needs to be built:
- Product push to eBay (Inventory API)
- Order sync from eBay (Fulfillment API)
- Inventory quantity sync
- Token refresh logic (tokens expire every 2 hours, refresh tokens last 18 months)

## Auth System

- Email/password: bcrypt (12 rounds) + JWT (30-day expiry)
- Google OAuth: full flow with callback
- Admin auth: JWT with admin role OR `x-setup-secret` header matching JWT_SECRET
- `authFetch` helper in authStore.js attaches JWT to all authenticated requests
- Token stored in localStorage

## Admin Panel

Protected routes under `/admin` with admin role check:
- Dashboard — stats, recent orders, top products, revenue/signup charts
- Users — search, filter, role/status management
- Products — product list with commission breakdown
- Orders — orders + disputes + financials tabs
- Stores — store + domain management
- Marketing — marketing metrics
- Settings — API keys, commission rate, platform secrets (stored in admin_settings table)

## Key Architectural Decisions

1. **Vercel Serverless over Express** — migrated from legacy Express server to Vercel Functions for scalability
2. **Vercel Postgres (Neon) over Supabase** — all Supabase remnants removed
3. **Auto-initializing schema** — `ensureSchema()` runs `CREATE TABLE IF NOT EXISTS` on every DB connection, no manual migrations
4. **No dummy data** — all data comes from real database queries, no localStorage fake data
5. **JWT with setup secret fallback** — admin endpoints accept either JWT admin token or setup secret for initial configuration

## Environment Variables (Full List)

```
# Required
JWT_SECRET=
POSTGRES_URL=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://togogo.me/api/auth/google/callback

# Vercel (store provisioning)
VERCEL_TOKEN=
VERCEL_PROJECT_ID=

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# eBay
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
EBAY_ENVIRONMENT=SANDBOX

# Other platforms
ETSY_API_KEY=
AMAZON_SP_APP_ID=
AMAZON_SP_CLIENT_ID=
AMAZON_SP_CLIENT_SECRET=
TIKTOK_APP_KEY=
TIKTOK_APP_SECRET=

# Suppliers
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=
CJ_DROPSHIPPING_API_KEY=
PRINTFUL_API_KEY=
PRINTIFY_API_KEY=
GOOTEN_RECIPE_ID=
GOOTEN_PARTNER_BILLING_KEY=

# Other services
ANTHROPIC_API_KEY=
SENDGRID_API_KEY=
AUSPOST_API_KEY=
EASYPOST_API_KEY=
DEEPL_API_KEY=
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
```

## Development History (503 commits)

The project evolved through these phases:
1. **Foundation** — PWA marketplace & dropshipping platform
2. **UI Overhaul** — Dark premium aesthetic, Google-style minimal layout
3. **Supplier Integration** — CJ Dropshipping, AliExpress, Printful, Printify, Gooten
4. **Platform Connections** — OAuth flows for eBay, Etsy, Amazon, TikTok, WooCommerce
5. **Storefront System** — In-house customer storefronts with themes, replacing WordPress/Shopify dependency
6. **One-Click Store** — 10-step automated provisioning with live monitoring
7. **Payments** — Stripe subscriptions, checkout, billing portal, webhooks
8. **Admin Panel** — Full management dashboard with user/store/order/product controls
9. **Commission System** — Dynamic commission rate, per-order tracking
10. **Security Hardening** — Removed Supabase remnants, hardened auth, fixed audit issues

## Current Status & What's Next

The platform is functional with:
- ✅ User auth (email + Google)
- ✅ Product browsing from 5+ suppliers
- ✅ One-click store creation with subdomain
- ✅ Stripe subscription billing
- ✅ Admin panel with full management
- ✅ Commission tracking
- ✅ Platform OAuth connections
- ✅ Storefront themes
- ✅ PWA support

Still needs work:
- 🔧 eBay product push (Inventory API) — OAuth flow done, need actual listing creation
- 🔧 eBay order sync and inventory sync
- 🔧 eBay token refresh logic
- 🔧 Product push for Etsy, Amazon, TikTok (only WooCommerce done)
- 🔧 Real-time order sync from all platforms
- 🔧 Email notifications (SendGrid key in env but not wired up)
- 🔧 Domain registration flow completion

The codebase is on branch `claude/build-togogo-platform-fR2nJ` with the repo at `/home/user/togogo`.

---

Use this context to continue building the ToGoGo platform. The repo is already set up — you can read any file to get exact implementation details.
