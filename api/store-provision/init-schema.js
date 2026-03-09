import { sql } from '../_lib/db.js'

// Initialize the user_stores table for store provisioning
// Call this once: GET /api/store-provision/init-schema
export default async function handler(req, res) {
  try {
    // User stores — one store per user (their togogo.me subdomain)
    await sql`
      CREATE TABLE IF NOT EXISTS user_stores (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
        subdomain TEXT NOT NULL,
        full_domain TEXT NOT NULL,
        store_name TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'provisioning', 'active', 'suspended', 'deleted')),
        tier TEXT DEFAULT 'pro' CHECK (tier IN ('pro', 'enterprise')),
        vercel_domain_id TEXT,
        wc_consumer_key TEXT,
        wc_consumer_secret TEXT,
        provision_data JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_user_stores_subdomain ON user_stores(subdomain)`
    await sql`CREATE INDEX IF NOT EXISTS idx_user_stores_user ON user_stores(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_user_stores_status ON user_stores(status)`

    // Store provisions — detailed provisioning job tracking
    await sql`
      CREATE TABLE IF NOT EXISTS store_provisions (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        store_name TEXT NOT NULL,
        subdomain TEXT NOT NULL,
        full_domain TEXT NOT NULL,
        tier TEXT DEFAULT 'pro',
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
        current_step INTEGER DEFAULT 0,
        steps_total INTEGER DEFAULT 0,
        steps_data JSONB DEFAULT '[]',
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_store_provisions_user ON store_provisions(user_id)`

    return res.json({ success: true, message: 'Store provisioning schema initialized' })
  } catch (err) {
    console.error('Schema init error:', err)
    res.status(500).json({ error: err.message })
  }
}
