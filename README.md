# ToGoGo — Where Will You Go?

Multi-tenant e-commerce platform that lets users create their own online store with one click. Each store gets a subdomain (e.g. `mystore.togogo.me`) powered by a shared React frontend and Vercel serverless API.

**Live:** [togogo.vercel.app](https://togogo.vercel.app)

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS + Zustand + React Query
- **Backend:** Vercel Serverless Functions (Node.js)
- **Database:** Vercel Postgres (Neon)
- **Auth:** Custom JWT + Google OAuth + bcryptjs
- **Payments:** Stripe (subscriptions, checkout, webhooks)
- **Hosting:** Vercel with `*.togogo.me` wildcard domain

## Features

- One-click store creation with automatic subdomain provisioning
- Multi-tenant storefront (subdomain detection routes to customer stores)
- Dropshipping product sourcing from multiple suppliers
- Platform integrations (Etsy, eBay, Amazon, TikTok, WooCommerce)
- Stripe subscription billing with customer portal
- Admin panel with user/store/order management
- Shopping cart, checkout, and order tracking
- PWA support

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in JWT_SECRET and POSTGRES_URL at minimum

# Start dev server
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret for signing JWT auth tokens |
| `POSTGRES_URL` | Yes | Vercel Postgres / Neon connection string |
| `VITE_STRIPE_PUBLISHABLE_KEY` | For payments | Stripe publishable key |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For payments | Stripe webhook signing secret |
| `GOOGLE_CLIENT_ID` | For OAuth | Google OAuth client ID |
| `VERCEL_TOKEN` | For store provisioning | Vercel API token for domain management |
| `VERCEL_PROJECT_ID` | For store provisioning | Vercel project ID |

See `.env.example` for the full list of optional integrations.

## Project Structure

```
api/               Vercel serverless functions
  _lib/            Shared auth, DB, supplier helpers
  auth/            Sign in, sign up, Google OAuth
  store-provision/ One-click store creation
  storefront/      Public customer-facing store API
  subscriptions/   Stripe billing
  webhooks/        Stripe webhook handler
  admin/           Admin panel API
  platforms/       Marketplace integrations (Etsy, eBay, etc.)
  dropship/        Supplier product search
src/
  components/      React components (UI, layout, auth)
  pages/           Route pages
  stores/          Zustand state (auth, cart, orders, theme)
  hooks/           React Query data hooks
  lib/             Constants, theme configs
server/            Legacy Express.js backend (being migrated to api/)
```

## Multi-Tenant Architecture

1. Wildcard DNS: `*.togogo.me` points to the Vercel deployment
2. `App.jsx` detects subdomain from `window.location.hostname`
3. Subdomain requests render `StorefrontPage` instead of the main app
4. `StorefrontPage` fetches store data + products via `/api/storefront/store?subdomain=X`
5. Store data is isolated per user via `user_stores` + `user_products` tables

## Database

Schema auto-initializes on first request via `ensureSchema()` in `api/_lib/db.js`. No manual migrations needed — tables are created with `CREATE TABLE IF NOT EXISTS`.
