import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)
    const { platform, product, all } = req.body

    if (!product) {
      return res.status(400).json({ error: 'Product is required' })
    }

    // Push to all connected platforms
    if (all) {
      const { rows: connections } = await sql`
        SELECT * FROM platform_connections
        WHERE user_id = ${user.id} AND status = 'active'
      `
      if (!connections.length) {
        return res.status(400).json({ error: 'No platforms connected' })
      }

      const results = await Promise.allSettled(
        connections.map(conn => pushToWooCommerce(conn, product))
      )

      const succeeded = results.filter(r => r.status === 'fulfilled').map(r => r.value)
      const failed = results.filter(r => r.status === 'rejected').map((r, i) => ({
        platform: connections[i].platform,
        error: r.reason?.message,
      }))

      return res.json({
        success: true,
        message: `Product listed on ${succeeded.length} platform(s)`,
        listed: succeeded,
        failed,
      })
    }

    // Push to single platform
    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' })
    }

    const { rows } = await sql`
      SELECT * FROM platform_connections
      WHERE user_id = ${user.id} AND platform = ${platform} AND status = 'active'
      LIMIT 1
    `

    const conn = rows[0]
    if (!conn) {
      return res.status(400).json({ error: `Not connected to ${platform}` })
    }

    const result = await pushToWooCommerce(conn, product)

    res.json({
      success: true,
      message: `Product listed on ${platform}!`,
      listing_url: result.url,
      listing_id: result.id,
    })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Push product error:', err)
    res.status(500).json({ error: 'Failed to push product' })
  }
}

async function pushToWooCommerce(conn, product) {
  if (conn.platform !== 'woocommerce') {
    throw new Error(`Push not yet supported for ${conn.platform}`)
  }

  const credentials = Buffer.from(`${conn.access_token}:${conn.refresh_token}`).toString('base64')
  const wcRes = await fetch(`${conn.shop_url}/wp-json/wc/v3/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({
      name: product.title,
      type: 'simple',
      regular_price: String(product.suggestedPrice || product.price),
      description: product.description || '',
      images: (product.images || []).map((src) => ({ src })),
      stock_quantity: product.stock || 999,
      manage_stock: true,
    }),
  })

  if (!wcRes.ok) {
    const err = await wcRes.text()
    throw new Error(`WooCommerce API error: ${err}`)
  }

  const data = await wcRes.json()

  // Update sync count
  await sql`
    UPDATE platform_connections
    SET products_synced = products_synced + 1,
        last_sync_at = NOW(),
        updated_at = NOW()
    WHERE id = ${conn.id}
  `

  return { id: data.id, url: data.permalink || conn.shop_url, platform: conn.platform }
}
