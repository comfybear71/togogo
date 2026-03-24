# HANDOFF.md — ToGoGo Platform Status & Next Steps

Last updated: 2026-03-24

## What Is ToGoGo?

ToGoGo is a multi-tenant dropshipping platform where sellers can:
1. Create a one-click hosted store at `{name}.togogo.me` ($19.99 AUD/month)
2. Source products from 5+ suppliers (CJ, AliExpress, Printful, Printify, Gooten)
3. Sell across marketplaces (eBay, Etsy, Amazon, TikTok Shop, WooCommerce)
4. ToGoGo earns a configurable commission (default 5%) on every sale

**Live at:** https://togogo.vercel.app

---

## Current State (What Works)

### Core Platform
- Full React 19 SPA with 20+ pages, dark mode, responsive/mobile-friendly
- PWA-enabled (installable, offline caching via Workbox)
- Landing page with hero section, pricing cards, quick-start guides

### Authentication
- Email/password registration and login (bcrypt + JWT, 30-day tokens)
- Google OAuth (full flow: redirect → callback → find/create user → JWT)
- Admin auth with role check + setup-secret fallback for initial bootstrapping
- Protected routes (auth guard + admin guard)

### Store Creation & Multi-Tenancy
- One-click store provisioning with 10-step progress UI
- Automatic subdomain registration via Vercel API (`*.togogo.me` wildcard)
- Subdomain detection in `App.jsx` routes to public `StorefrontPage`
- 5 storefront themes (Sunset, Midnight, Forest, Lavender, Coral)
- Starter product import from suppliers during provisioning
- Stripe subscription checkout triggers store activation via webhook

### Storefront (Customer-Facing)
- Public storefront at `{store}.togogo.me` — no auth required
- Product catalog with categories, search, cart, checkout
- Store branding (name, logo, theme)
- Order placement via `/api/storefront/order`

### Payments & Billing
- Stripe checkout for store subscriptions ($19.99 AUD/month)
- 13 webhook event handlers (checkout, subscriptions, invoices, disputes, refunds)
- Customer billing portal (manage payment methods, cancel, etc.)
- Domain purchases via Stripe → Namecheap registration
- Dispute and refund tracking in database

### Product & Supplier System
- Unified supplier abstraction (`api/_lib/suppliers.js`, ~1000 lines)
- Product search across all suppliers with NSFW filtering
- Categories, trending products, supplier directory
- Commission auto-calculated on every product (supplier_cost × commission_rate)
- Watchlist with price alerts

### Admin Panel (`/admin/*`)
- Dashboard with stats, recent orders, top products, revenue/signup charts
- User management (search, filter, role/status changes)
- Product management with commission breakdown
- Order management with disputes and financials tabs
- Store and domain management
- Marketing metrics
- Settings page (commission rate, API keys, platform secrets)

### Platform Integrations
- OAuth flows implemented for: eBay, Etsy, Amazon, TikTok Shop, WooCommerce
- Platform connection management (connect, disconnect, status)
- WooCommerce order sync webhook

### Database
- 10 tables, auto-created via `ensureSchema()` on first request
- No manual migrations — all handled inline with `CREATE TABLE IF NOT EXISTS`
- Vercel Postgres (Neon) via `@vercel/postgres`

---

## Recent Changes (Commit History, Most Recent First)

1. **Comprehensive context prompt** — Added `docs/claude-context-prompt.md` for clean conversation handoffs
2. **My Shop + Dashboard nav links** — Added to Header for desktop users
3. **Control Panel loading fix** — Fixed admin products with commission breakdown display
4. **Dynamic commission system** — Centralized to admin_settings, all backend reads dynamic rate
5. **Remove dummy data** — Everything from database, no localStorage fallbacks
6. **Auth fixes** — StoresPage falls back to setup secret when no JWT
7. **Store activation fix** — Fixed Stripe payment → store activation flow, removed legacy `server/` directory
8. **Security audit** — Removed Supabase remnants, hardened security, fixed bugs
9. **Commission tracking** — Track ToGoGo commission per order (what was sold, to whom, who gets what)
10. **Payment reliability** — Subscription fallback, store upsert, delete endpoint
11. **Order reliability** — Duplicate detection, error logging, partial order warnings
12. **Disputes/refunds tables** — Added to schema, seeded test data
13. **Auto-init database** — Schema auto-creates on first use, no manual setup
14. **Admin store provisioning** — Admin can trigger store creation for users
15. **7 complete pages** — Replaced placeholder redirects with full page implementations
16. **Subdomain creation fix** — Fixed automatic subdomain registration
17. **Stripe billing improvements** — past_due handling, customer portal, sync, tax support

---

## Known Issues & Limitations

### Platform Integrations
- **Product push only implemented for WooCommerce** — eBay, Etsy, Amazon, TikTok push endpoints are stubs
- **eBay developer account recently created** — OAuth flow complete but product push and order sync still needed
- **No order sync from external platforms** — Only WooCommerce has a webhook for order import; others need polling or webhook setup
- **Token refresh not automated** — Platform OAuth tokens expire; no background job to refresh them

### Supplier APIs
- **Most supplier integrations return curated/sample data** — Full API integration depends on approved API keys from each supplier
- **CJ Dropshipping access token** — Cached in admin_settings; may need manual refresh
- **AliExpress API** — Requires approved app; currently uses sample product data

### Payments
- **No real Stripe Tax configuration** — GST/tax support is conditional on `STRIPE_TAX_ENABLED` env var but not fully configured
- **Domain purchase flow** — Namecheap registration is coded but untested in production
- **No payout system** — Seller earnings tracked but no automated payout (Stripe Connect not integrated)

### Store Provisioning
- **Vercel wildcard DNS assumption** — If `*.togogo.me` wildcard is not configured, individual subdomains are registered one by one
- **No store deletion cleanup** — `/api/store-provision/delete` exists but doesn't clean up Vercel domain registration

### Frontend
- **No real-time updates** — Uses polling (React Query refetch intervals), no WebSocket/SSE
- **Cart uses localStorage** — Not synced to database; lost on device switch
- **No email notifications** — SendGrid key in `.env.example` but no email sending implemented
- **No image upload to cloud storage** — `ImageUpload` component exists but no S3/Cloudinary integration

### Security
- **JWT in localStorage** — Vulnerable to XSS; httpOnly cookies would be more secure
- **No rate limiting** — API endpoints have no throttling
- **No CSRF protection** — Relies on Bearer token auth only
- **Setup secret = JWT_SECRET** — Admin fallback auth uses same secret as JWT signing

### Database
- **No indexes on some foreign keys** — Could affect query performance at scale
- **No connection pooling config** — Uses default `@vercel/postgres` pool settings
- **No soft deletes** — Records are hard-deleted (except stores which have status field)

---

## Next Steps / Roadmap

### High Priority
1. **Complete platform product push** — Implement eBay, Etsy, Amazon, TikTok product listing APIs
2. **Order sync from platforms** — Poll or webhook-based order import from all connected marketplaces
3. **Seller payouts** — Integrate Stripe Connect for automated commission split and seller payouts
4. **Token refresh automation** — Background job or on-demand refresh for expired OAuth tokens
5. **Email notifications** — Integrate SendGrid for order confirmations, shipping updates, welcome emails

### Medium Priority
6. **Real supplier API integration** — Get approved API keys, replace sample data with live product feeds
7. **Image upload** — S3 or Cloudinary for product images
8. **Cart sync to database** — Persist cart across devices
9. **Rate limiting** — Add API rate limiting (Upstash Redis is already in `.env.example`)
10. **Improved security** — Move JWT to httpOnly cookies, add CSRF tokens, separate admin secret

### Lower Priority
11. **Real-time updates** — WebSocket or SSE for order status, provisioning progress
12. **Analytics & reporting** — More detailed seller analytics, export functionality
13. **Multi-currency support** — Currently AUD only; add USD, EUR, GBP
14. **Shipping integration** — AusPost and EasyPost keys in `.env.example` but not implemented
15. **AI assistant** — `api/chat.js` exists but needs full implementation with Anthropic API
16. **Translation** — DeepL key in `.env.example` but not integrated

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Vercel Serverless (no Express) | Zero infrastructure management, auto-scaling, each route is a standalone function |
| Auto-init schema | No migration tooling needed; `ensureSchema()` creates tables on first request |
| Wildcard subdomain tenancy | Single deployment serves all stores; subdomain detected in frontend router |
| Stripe webhooks for activation | Decouples payment from provisioning; store activates only after confirmed payment |
| Zustand over Redux | Simpler API, less boilerplate, perfect for this scale |
| React Query for data | Automatic caching, refetching, loading states; reduces custom state management |
| No ORM | Direct SQL via `@vercel/postgres` keeps it simple and transparent |
| Commission in admin_settings | Configurable at runtime without code changes or redeployment |

---

## How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# Fill in: JWT_SECRET, POSTGRES_URL (minimum required)

# 3. Start dev server
npm run dev
# Frontend: http://localhost:5173
# API routes served by Vercel CLI or proxied in dev

# 4. Seed test user (optional)
npm run seed:test-user
# Creates: test@togogo.com / test1234 (role: both)
```

For full Vercel Functions locally, use `vercel dev` instead of `npm run dev`.

---

## Key Files to Understand First

| File | Why |
|------|-----|
| `src/App.jsx` | Main router, subdomain detection, lazy loading |
| `api/_lib/db.js` | Database schema (all 10 tables), `ensureSchema()` |
| `api/_lib/auth.js` | JWT, password hashing, Google OAuth helpers |
| `api/_lib/suppliers.js` | Supplier abstraction layer (~1000 lines) |
| `api/_lib/commission.js` | Commission rate logic |
| `api/webhooks/stripe.js` | 13 Stripe event handlers (370 lines) |
| `api/store-provision/provision.js` | 10-step store creation |
| `src/pages/StorefrontPage.jsx` | Customer-facing store (700+ lines) |
| `src/stores/authStore.js` | Auth state, authFetch, Google OAuth callback |
| `docs/claude-context-prompt.md` | Detailed project context (20KB) |

---

## Test User

```
Email: test@togogo.com
Password: test1234
Role: both (buyer + seller)
```

Create via: `npm run seed:test-user` or `node scripts/seed-test-user.js`

## Admin Access

Set a user's role to `admin` in the database, or use `x-setup-secret` header with the value of `JWT_SECRET` for initial admin API access.
