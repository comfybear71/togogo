// Restore orders from Redis backup — gets the supplier_order_id and statuses back
import { sql, ensureSchema } from '../_lib/db.js'
import { Redis } from '@upstash/redis'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  const restUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (!restUrl || !restToken) {
    return res.status(500).json({ error: 'Redis not configured' })
  }

  const redis = new Redis({ url: restUrl, token: restToken })

  try {
    // Get latest backup key
    const latestKey = await redis.get('backup:latest')
    if (!latestKey) {
      return res.status(404).json({ error: 'No backup found' })
    }

    const backup = await redis.get(latestKey)
    if (!backup) {
      return res.status(404).json({ error: 'Backup data not found at ' + latestKey })
    }

    const data = typeof backup === 'string' ? JSON.parse(backup) : backup
    const backupOrders = data.tables?.orders || []

    if (backupOrders.length === 0) {
      return res.status(404).json({ error: 'No orders in backup' })
    }

    let updated = 0
    let inserted = 0
    let skipped = 0

    for (const order of backupOrders) {
      if (!order.platform_order_id && !order.supplier_order_id) { skipped++; continue }

      // Try to match by platform_order_id first
      let { rowCount } = await sql`
        UPDATE user_orders
        SET
          supplier_order_id = COALESCE(${order.supplier_order_id || null}, supplier_order_id),
          status = COALESCE(${order.status || null}, status),
          tracking_number = COALESCE(${order.tracking_number || null}, tracking_number),
          tracking_url = COALESCE(${order.tracking_url || null}, tracking_url),
          supplier_cost = CASE WHEN ${parseFloat(order.supplier_cost || 0)} > 0 THEN ${parseFloat(order.supplier_cost)} ELSE supplier_cost END,
          profit = CASE WHEN ${parseFloat(order.profit || 0)} != 0 THEN ${parseFloat(order.profit)} ELSE profit END,
          commission = CASE WHEN ${parseFloat(order.commission || 0)} != 0 THEN ${parseFloat(order.commission)} ELSE commission END,
          product_title = COALESCE(${order.product_title || null}, product_title),
          product_image = COALESCE(${order.product_image || null}, product_image),
          supplier_product_id = COALESCE(${order.supplier_product_id || null}, supplier_product_id),
          notes = COALESCE(${order.notes || null}, notes),
          updated_at = NOW()
        WHERE platform_order_id = ${order.platform_order_id}
      `

      if (rowCount > 0) { updated++; continue }

      // Try to match by sale_price + customer_email + approximate date
      const result = await sql`
        UPDATE user_orders
        SET
          supplier_order_id = COALESCE(${order.supplier_order_id || null}, supplier_order_id),
          status = COALESCE(${order.status || null}, status),
          tracking_number = COALESCE(${order.tracking_number || null}, tracking_number),
          tracking_url = COALESCE(${order.tracking_url || null}, tracking_url),
          supplier_cost = CASE WHEN ${parseFloat(order.supplier_cost || 0)} > 0 THEN ${parseFloat(order.supplier_cost)} ELSE supplier_cost END,
          profit = CASE WHEN ${parseFloat(order.profit || 0)} != 0 THEN ${parseFloat(order.profit)} ELSE profit END,
          commission = CASE WHEN ${parseFloat(order.commission || 0)} != 0 THEN ${parseFloat(order.commission)} ELSE commission END,
          product_title = COALESCE(${order.product_title || null}, product_title),
          product_image = COALESCE(${order.product_image || null}, product_image),
          supplier_product_id = COALESCE(${order.supplier_product_id || null}, supplier_product_id),
          platform_order_id = COALESCE(${order.platform_order_id || null}, platform_order_id),
          notes = COALESCE(${order.notes || null}, notes),
          updated_at = NOW()
        WHERE customer_email = ${order.customer_email || ''}
          AND ABS(sale_price - ${parseFloat(order.sale_price || 0)}) < 0.10
          AND supplier_order_id IS NULL
          AND id = (SELECT id FROM user_orders WHERE customer_email = ${order.customer_email || ''} AND ABS(sale_price - ${parseFloat(order.sale_price || 0)}) < 0.10 AND supplier_order_id IS NULL LIMIT 1)
      `

      if ((result.rowCount || 0) > 0) { updated++; continue }

      // No match — insert the backup order directly
      try {
        await sql`
          INSERT INTO user_orders (
            user_id, supplier, supplier_product_id, supplier_order_id,
            product_title, product_image,
            supplier_cost, sale_price, profit, commission, commission_rate, quantity,
            platform, platform_order_id,
            customer_name, customer_email, shipping_address,
            status, tracking_number, tracking_url, notes,
            stripe_payment_intent, created_at
          ) VALUES (
            ${order.user_id}, ${order.supplier || 'AliExpress'}, ${order.supplier_product_id || ''},
            ${order.supplier_order_id || null},
            ${order.product_title || 'Product'}, ${order.product_image || ''},
            ${parseFloat(order.supplier_cost || 0)}, ${parseFloat(order.sale_price || 0)},
            ${parseFloat(order.profit || 0)}, ${parseFloat(order.commission || 0)},
            ${parseFloat(order.commission_rate || 0.10)}, ${Math.round(parseFloat(order.quantity || 1))},
            ${order.platform || 'togogo-store'}, ${order.platform_order_id || ''},
            ${order.customer_name || ''}, ${order.customer_email || ''},
            ${order.shipping_address || '{}'},
            ${order.status || 'processing'}, ${order.tracking_number || null}, ${order.tracking_url || null},
            ${order.notes || 'Restored from backup'},
            ${order.stripe_payment_intent || null},
            ${order.created_at || new Date().toISOString()}
          )
        `
        inserted++
      } catch { skipped++ }
    }

    return res.json({
      success: true,
      backupKey: latestKey,
      backupDate: data.date,
      ordersInBackup: backupOrders.length,
      updated,
      inserted,
      skipped,
      samples: backupOrders.slice(0, 5).map(o => ({
        ref: o.platform_order_id,
        aeOrderId: o.supplier_order_id,
        status: o.status,
        product: o.product_title?.slice(0, 40),
        tracking: o.tracking_number || 'none',
      })),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
