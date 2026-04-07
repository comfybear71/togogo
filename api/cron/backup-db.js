// Daily database backup — exports critical tables to Upstash Redis
// Runs daily via Vercel Cron at 2am UTC
// Keeps last 7 days of backups
// GET /api/cron/backup-db?secret=JWT_SECRET
import { sql, ensureSchema } from '../_lib/db.js'
import { Redis } from '@upstash/redis'

export default async function handler(req, res) {
  // Auth: cron secret, JWT_SECRET, or admin JWT token
  const secret = req.headers['authorization']?.replace('Bearer ', '') || req.query.secret
  const validSecret = process.env.CRON_SECRET || process.env.JWT_SECRET
  let authorized = secret && secret === validSecret
  if (!authorized && secret) {
    try {
      const { verifyToken } = await import('../_lib/auth.js')
      const payload = verifyToken(secret)
      if (payload && payload.role === 'admin') authorized = true
    } catch {}
  }
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Connect to Redis
  const restUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (!restUrl || !restToken) {
    return res.status(500).json({ error: 'Redis not configured — need KV_REST_API_URL and KV_REST_API_TOKEN' })
  }
  const redis = new Redis({ url: restUrl, token: restToken })

  await ensureSchema()

  const timestamp = new Date().toISOString()
  const dateKey = timestamp.split('T')[0] // e.g. "2026-04-06"

  console.log(`[Backup] Starting daily backup — ${dateKey}`)

  try {
    // Export critical tables
    const tables = {}
    const counts = {}

    // 1. Users (without password hashes for safety)
    const { rows: users } = await sql`
      SELECT id, email, name, role, avatar_url, bio, phone, stripe_account_id,
             wallet_balance, location_suburb, location_country, google_id,
             verification_level, created_at, updated_at
      FROM users ORDER BY created_at DESC
    `
    tables.users = users
    counts.users = users.length

    // 2. Products
    const { rows: products } = await sql`
      SELECT id, user_id, title, image, supplier, supplier_product_id, supplier_cost,
             sale_price, api_price, shipping_cost, tax_amount, price_currency,
             category, is_active, total_sold, total_revenue, product_rating,
             orders_count, original_price, discount_percent, created_at
      FROM user_products ORDER BY created_at DESC
    `
    tables.products = products
    counts.products = products.length

    // 3. Orders
    const { rows: orders } = await sql`
      SELECT id, user_id, product_title, sale_price, supplier_cost, profit,
             quantity, commission, commission_rate, status,
             customer_name, customer_email, shipping_address,
             supplier_order_id, tracking_number, tracking_url,
             stripe_payment_intent, stripe_checkout_session, notes,
             created_at, updated_at
      FROM user_orders ORDER BY created_at DESC
    `
    tables.orders = orders
    counts.orders = orders.length

    // 4. Stores
    const { rows: stores } = await sql`
      SELECT id, user_id, subdomain, full_domain, store_name, status, theme_id,
             stripe_connect_id, stripe_connect_status, created_at
      FROM user_stores ORDER BY created_at DESC
    `
    tables.stores = stores
    counts.stores = stores.length

    // 5. Subscriptions
    const { rows: subscriptions } = await sql`
      SELECT id, user_id, plan, status, stripe_subscription_id, price_per_month,
             started_at, created_at
      FROM subscriptions ORDER BY created_at DESC
    `
    tables.subscriptions = subscriptions
    counts.subscriptions = subscriptions.length

    // 6. Store customers
    let storeCustomers = []
    try {
      const { rows } = await sql`
        SELECT id, store_id, email, name, phone, total_orders, total_spent,
               last_order_at, created_at
        FROM store_customers ORDER BY created_at DESC
      `
      storeCustomers = rows
    } catch { /* table might not exist */ }
    tables.store_customers = storeCustomers
    counts.store_customers = storeCustomers.length

    // 7. Admin settings
    const { rows: settings } = await sql`
      SELECT key, value, category, label, updated_at FROM admin_settings
    `
    tables.admin_settings = settings
    counts.admin_settings = settings.length

    // Build backup object
    const backup = {
      timestamp,
      date: dateKey,
      version: '1.0',
      counts,
      tables,
    }

    // Store in Redis with 7-day TTL (604800 seconds)
    const backupKey = `backup:${dateKey}`
    const backupJson = JSON.stringify(backup)
    const sizeMB = (backupJson.length / 1024 / 1024).toFixed(2)

    await redis.set(backupKey, backupJson, { ex: 604800 })

    // Also store a "latest" pointer
    await redis.set('backup:latest', backupKey, { ex: 604800 })

    // Store backup index (list of available backups)
    let backupIndex = []
    try {
      const existing = await redis.get('backup:index')
      if (existing) backupIndex = typeof existing === 'string' ? JSON.parse(existing) : existing
    } catch {}
    if (!Array.isArray(backupIndex)) backupIndex = []
    backupIndex = backupIndex.filter(b => b.date !== dateKey)
    backupIndex.unshift({ date: dateKey, key: backupKey, sizeMB, counts, timestamp })
    backupIndex = backupIndex.slice(0, 7) // Keep last 7
    await redis.set('backup:index', JSON.stringify(backupIndex), { ex: 604800 })

    console.log(`[Backup] Done! ${sizeMB}MB — users:${counts.users}, products:${counts.products}, orders:${counts.orders}, stores:${counts.stores}`)

    return res.json({
      success: true,
      date: dateKey,
      sizeMB,
      counts,
      backupsAvailable: backupIndex.length,
    })

  } catch (err) {
    console.error('[Backup] Failed:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
