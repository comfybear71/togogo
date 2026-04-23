// Vercel Postgres (Neon) database connection
// @vercel/postgres auto-connects via POSTGRES_URL env var
// Fall back to DATABASE_URL if POSTGRES_URL is not set (common with Neon integrations)
if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL
}
import { sql } from '@vercel/postgres'

export { sql }

// Schema management:
//   ensureSchema() is NO LONGER called from hot-path request handlers.
//   It was adding ~500ms–2s per cold start running 35 CREATE TABLE +
//   30 ALTER TABLE on every new serverless instance. Hot paths now
//   assume tables already exist.
//
//   After ANY change to initializeSchema() below (new table, new column),
//   or after the very first deploy against a fresh database, hit
//   POST /api/admin/init-schema to apply migrations. Safe to call repeatedly.
//
//   Low-frequency paths (cron, webhooks, admin fix-* tools, store
//   provisioning) still call ensureSchema() as a safety net — the cost
//   only hits on the first cold start for each of those functions.
let schemaReady = false
let schemaPromise = null

export async function ensureSchema() {
  if (schemaReady) return
  if (schemaPromise) return schemaPromise
  schemaPromise = initializeSchema()
    .then(() => { schemaReady = true })
    .catch((err) => {
      schemaPromise = null
      console.error('Auto-init schema failed:', err)
      throw err
    })
  return schemaPromise
}

// Initialize schema — run once on first deploy
export async function initializeSchema() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`

  // Users table — standalone, no dependency on Supabase auth
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL DEFAULT '',
      avatar_url TEXT,
      bio TEXT DEFAULT '',
      location_suburb TEXT DEFAULT '',
      location_country TEXT DEFAULT 'Australia',
      role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'subscriber', 'both', 'admin')),
      trust_score NUMERIC(5,2) DEFAULT 0,
      stripe_account_id TEXT,
      wallet_balance NUMERIC(10,2) DEFAULT 0,
      verification_level INTEGER DEFAULT 1 CHECK (verification_level BETWEEN 1 AND 3),
      phone TEXT,
      google_id TEXT UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // User orders — tracks items sold through the platform
  await sql`
    CREATE TABLE IF NOT EXISTS user_orders (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      supplier TEXT NOT NULL,
      supplier_order_id TEXT,
      product_title TEXT NOT NULL,
      product_image TEXT,
      supplier_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
      sale_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      profit NUMERIC(10,2) NOT NULL DEFAULT 0,
      platform TEXT,
      platform_order_id TEXT,
      customer_name TEXT,
      customer_email TEXT,
      shipping_address JSONB DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
      tracking_number TEXT,
      tracking_url TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // User products — products the user has listed for sale
  await sql`
    CREATE TABLE IF NOT EXISTS user_products (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      image TEXT,
      images TEXT[] DEFAULT '{}',
      supplier TEXT NOT NULL,
      supplier_product_id TEXT,
      supplier_url TEXT,
      supplier_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
      sale_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      category TEXT DEFAULT '',
      is_active BOOLEAN DEFAULT true,
      platforms_listed JSONB DEFAULT '[]',
      total_sold INTEGER DEFAULT 0,
      total_revenue NUMERIC(10,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // Subscriptions
  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'premium')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
      stripe_subscription_id TEXT,
      price_per_month NUMERIC(10,2) DEFAULT 0,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // Platform connections (selling platforms)
  await sql`
    CREATE TABLE IF NOT EXISTS platform_connections (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      platform TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'error')),
      shop_name TEXT,
      shop_url TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TIMESTAMPTZ,
      token_data JSONB DEFAULT '{}',
      oauth_state TEXT,
      oauth_verifier TEXT,
      products_synced INTEGER DEFAULT 0,
      last_sync_at TIMESTAMPTZ,
      connected_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, platform)
    )
  `

  // User domains — domains purchased through ToGoGo
  await sql`
    CREATE TABLE IF NOT EXISTS user_domains (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      domain TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'transferred')),
      registrar TEXT DEFAULT 'namecheap',
      nameservers TEXT[] DEFAULT '{}',
      registered_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      auto_renew BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, domain)
    )
  `

  // User stores — one-click stores with subdomains
  await sql`
    CREATE TABLE IF NOT EXISTS user_stores (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
      subdomain TEXT NOT NULL UNIQUE,
      full_domain TEXT NOT NULL UNIQUE,
      store_name TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'provisioning', 'active', 'suspended', 'deleted')),
      tier TEXT DEFAULT 'pro',
      vercel_domain_id TEXT,
      provision_data JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // Migrations: add commission tracking and quantity to user_orders
  try { await sql`ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1` } catch { /* */ }
  try { await sql`ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS commission NUMERIC(10,2) DEFAULT 0` } catch { /* */ }
  try { await sql`ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) DEFAULT 0.05` } catch { /* */ }
  try { await sql`ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS supplier_product_id TEXT` } catch { /* */ }
  try { await sql`ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS stripe_checkout_session TEXT` } catch { /* */ }
  try { await sql`ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT` } catch { /* */ }
  // Post-order reconciliation — what AE actually billed us in USD,
  // fetched via aliexpress.trade.ds.order.get after order.create succeeds.
  try { await sql`ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS ae_actual_cost_usd NUMERIC(10,2)` } catch { /* */ }
  try { await sql`ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS ae_actual_fetched_at TIMESTAMPTZ` } catch { /* */ }
  // Expand order status to include pending_payment
  try { await sql`ALTER TABLE user_orders DROP CONSTRAINT IF EXISTS user_orders_status_check` } catch { /* */ }
  try { await sql`ALTER TABLE user_orders ADD CONSTRAINT user_orders_status_check CHECK (status IN ('pending', 'pending_payment', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'))` } catch { /* */ }

  // Migrations: add missing columns/constraints to user_stores if table already existed
  try { await sql`ALTER TABLE user_stores ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'pro'` } catch { /* already exists or not supported */ }
  try { await sql`ALTER TABLE user_stores ADD COLUMN IF NOT EXISTS theme_id TEXT DEFAULT 'midnight'` } catch { /* already exists */ }
  try { await sql`ALTER TABLE user_stores ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT` } catch { /* */ }
  try { await sql`ALTER TABLE user_stores ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_connected'` } catch { /* */ }
  try { await sql`ALTER TABLE user_stores ADD COLUMN IF NOT EXISTS store_settings JSONB DEFAULT '{}'::jsonb` } catch { /* */ }
  try { await sql`ALTER TABLE user_stores ADD COLUMN IF NOT EXISTS niche TEXT` } catch { /* */ }
  try { await sql`ALTER TABLE user_stores ADD COLUMN IF NOT EXISTS niche_categories JSONB` } catch { /* */ }
  try { await sql`ALTER TABLE user_stores ADD COLUMN IF NOT EXISTS niche_built_at TIMESTAMPTZ` } catch { /* */ }
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS niches TEXT[] DEFAULT ARRAY[]::TEXT[]` } catch { /* */ }
  try { await sql`CREATE INDEX IF NOT EXISTS idx_user_products_niches ON user_products USING GIN (niches)` } catch { /* */ }
  // Per-SKU variants with real USD prices — the source of truth for pricing.
  // Each entry: { skuId, skuAttr, priceUsd, stock, properties{Color,Size,...}, colorImage }
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS variants JSONB` } catch { /* */ }
  // Cheapest variant's break-even USD cost (product + shipping + ~14% tax).
  // Used for the "From $X" card price on the storefront listing.
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS min_variant_price_usd NUMERIC(10,2)` } catch { /* */ }
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS max_variant_price_usd NUMERIC(10,2)` } catch { /* */ }
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS shipping_usd NUMERIC(10,2)` } catch { /* */ }
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS variants_updated_at TIMESTAMPTZ` } catch { /* */ }
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS price_verified BOOLEAN DEFAULT false` } catch { /* */ }
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT true` } catch { /* */ }
  try { await sql`ALTER TABLE user_stores ADD CONSTRAINT user_stores_user_id_key UNIQUE (user_id)` } catch { /* already exists */ }

  // Pricing breakdown columns on user_products
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS api_price NUMERIC(10,2) DEFAULT 0` } catch { /* */ }
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10,2) DEFAULT 0` } catch { /* */ }
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0` } catch { /* */ }
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS price_currency TEXT DEFAULT 'USD'` } catch { /* */ }
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS product_rating NUMERIC(3,2) DEFAULT 0` } catch { /* */ }
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS orders_count INTEGER DEFAULT 0` } catch { /* */ }
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2) DEFAULT 0` } catch { /* */ }
  try { await sql`ALTER TABLE user_products ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0` } catch { /* */ }

  // Fix store_customers table — previous session created it with wrong columns (had password_hash)
  try {
    const { rows } = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'store_customers' AND column_name = 'password_hash'`
    if (rows.length > 0) {
      await sql`DROP TABLE IF EXISTS store_customers CASCADE`
      console.log('[Schema] Dropped broken store_customers table (had password_hash column)')
    }
  } catch (e) { console.error('[Schema] store_customers migration check:', e.message) }

  // Migration: expand subscription status to include 'past_due'
  try { await sql`ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check` } catch { /* */ }
  try { await sql`ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'past_due', 'cancelled', 'expired'))` } catch { /* */ }

  // Disputes — tracks Stripe chargebacks and customer disputes
  await sql`
    CREATE TABLE IF NOT EXISTS disputes (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      stripe_dispute_id TEXT UNIQUE,
      stripe_charge_id TEXT,
      order_id UUID REFERENCES user_orders(id) ON DELETE SET NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      amount NUMERIC(10,2) DEFAULT 0,
      currency TEXT DEFAULT 'aud',
      reason TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'won', 'lost', 'closed')),
      admin_note TEXT,
      evidence_due_by TIMESTAMPTZ,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // Refunds — tracks refund transactions
  await sql`
    CREATE TABLE IF NOT EXISTS refunds (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      stripe_charge_id TEXT UNIQUE,
      stripe_refund_id TEXT,
      order_id UUID REFERENCES user_orders(id) ON DELETE SET NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      amount NUMERIC(10,2) DEFAULT 0,
      currency TEXT DEFAULT 'aud',
      reason TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // Admin settings (key-value config)
  await sql`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      label TEXT,
      is_secret BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // Store customers — tracks customers per store
  await sql`
    CREATE TABLE IF NOT EXISTS store_customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      store_id UUID REFERENCES user_stores(id) ON DELETE CASCADE NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      order_count INTEGER DEFAULT 0,
      total_spent NUMERIC(10,2) DEFAULT 0,
      last_order_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(store_id, email)
    )
  `

  // Marketing — promo codes + banners (admin-managed)
  await sql`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL DEFAULT 'percent' CHECK (type IN ('percent', 'fixed')),
      value NUMERIC(10,2) NOT NULL DEFAULT 0,
      max_uses INTEGER DEFAULT 100,
      used INTEGER DEFAULT 0,
      expiry DATE,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS banners (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      title TEXT NOT NULL,
      image_url TEXT DEFAULT '',
      link_url TEXT DEFAULT '',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // Shipping failure log — data-gathering only, NEVER used to auto-delete
  // or auto-deactivate products. Populated when AliExpress reports a product
  // cannot ship to a given address at cart or checkout time.
  await sql`
    CREATE TABLE IF NOT EXISTS shipping_failures (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      product_id UUID,
      supplier_product_id TEXT,
      country TEXT,
      state TEXT,
      postcode TEXT,
      reason TEXT,
      failure_source TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_shipping_failures_supplier ON shipping_failures(supplier_product_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_shipping_failures_created ON shipping_failures(created_at DESC)`

  // Niche-based store builder queue — one row per keyword to be searched
  // on AliExpress when a customer creates a niched store. Cron processes
  // this batch by batch so we don't blow Vercel's function timeout.
  await sql`
    CREATE TABLE IF NOT EXISTS store_build_queue (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      store_id UUID,
      user_id UUID,
      niche TEXT,
      category TEXT,
      keyword TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      products_found INTEGER DEFAULT 0,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      processed_at TIMESTAMPTZ
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_store_build_queue_status ON store_build_queue(status, created_at)`
  await sql`CREATE INDEX IF NOT EXISTS idx_store_build_queue_store ON store_build_queue(store_id)`

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_store_customers_store ON store_customers(store_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_store_customers_email ON store_customers(email)`
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
  await sql`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_user_orders_user ON user_orders(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_user_orders_status ON user_orders(status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_user_orders_created ON user_orders(created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_user_products_user ON user_products(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_user_products_active ON user_products(is_active) WHERE is_active = true`
  await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_platform_connections_user ON platform_connections(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key)`
  await sql`CREATE INDEX IF NOT EXISTS idx_user_domains_user ON user_domains(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_user_stores_user ON user_stores(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_store_customers_store ON store_customers(store_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_store_customers_email ON store_customers(email)`
  await sql`CREATE INDEX IF NOT EXISTS idx_user_stores_subdomain ON user_stores(subdomain)`
  await sql`CREATE INDEX IF NOT EXISTS idx_disputes_stripe ON disputes(stripe_dispute_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_refunds_stripe ON refunds(stripe_charge_id)`
}
