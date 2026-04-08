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
    let notFound = 0

    for (const order of backupOrders) {
      if (!order.platform_order_id) continue

      // Update existing orders with data from backup (supplier_order_id, status, tracking)
      const { rowCount } = await sql`
        UPDATE user_orders
        SET
          supplier_order_id = COALESCE(${order.supplier_order_id || null}, supplier_order_id),
          status = COALESCE(${order.status || null}, status),
          tracking_number = COALESCE(${order.tracking_number || null}, tracking_number),
          tracking_url = COALESCE(${order.tracking_url || null}, tracking_url),
          supplier_cost = CASE WHEN ${order.supplier_cost || 0} > 0 THEN ${order.supplier_cost} ELSE supplier_cost END,
          profit = CASE WHEN ${order.profit || 0} != 0 THEN ${order.profit} ELSE profit END,
          commission = CASE WHEN ${order.commission || 0} != 0 THEN ${order.commission} ELSE commission END,
          notes = COALESCE(${order.notes || null}, notes),
          updated_at = NOW()
        WHERE platform_order_id = ${order.platform_order_id}
      `

      if (rowCount > 0) updated++
      else notFound++
    }

    return res.json({
      success: true,
      backupKey: latestKey,
      backupDate: data.date,
      ordersInBackup: backupOrders.length,
      updated,
      notFound,
      samples: backupOrders.slice(0, 5).map(o => ({
        ref: o.platform_order_id,
        aeOrderId: o.supplier_order_id,
        status: o.status,
        tracking: o.tracking_number || 'none',
      })),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
