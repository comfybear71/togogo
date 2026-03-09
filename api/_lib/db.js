// Vercel Postgres (Neon) database connection
// @vercel/postgres auto-connects via POSTGRES_URL env var
// Fall back to DATABASE_URL if POSTGRES_URL is not set (common with Neon integrations)
if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL
}
import { sql } from '@vercel/postgres'

export { sql }

// Auto-initialize: ensure schema exists on first query
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

  // Migrations: add missing columns/constraints to user_stores if table already existed
  try { await sql`ALTER TABLE user_stores ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'pro'` } catch { /* already exists or not supported */ }
  try { await sql`ALTER TABLE user_stores ADD CONSTRAINT user_stores_user_id_key UNIQUE (user_id)` } catch { /* already exists */ }

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

  // Indexes
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
  await sql`CREATE INDEX IF NOT EXISTS idx_user_stores_subdomain ON user_stores(subdomain)`
  await sql`CREATE INDEX IF NOT EXISTS idx_disputes_stripe ON disputes(stripe_dispute_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_refunds_stripe ON refunds(stripe_charge_id)`
}
