import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  await ensureSchema()

  try {
    // Restore the two April 8 orders that weren't in the backup
    const orders = [
      {
        supplier_order_id: '8210560128429621',
        product_title: 'Mini LED Flashlight Magnetic COB Outdoor Camping Pocket Work Light 800 Lumens USB Rechargeable 7 Modes Spotlights',
        sale_price: 14.59,
        supplier_cost: 8.08,
        status: 'processing',
        platform_order_id: 'TG-MNOZ9Z6D',
        customer_name: 'Stuart French',
        customer_email: 'sfrench71@me.com',
      },
      {
        supplier_order_id: '8210677106719621',
        product_title: 'Wireless Bluetooth Earphones HIFI Bass With HD MIC Ear-Hook Earbuds Noise Cancelling Life Waterproof Game Sport Headset',
        sale_price: 14.62,
        supplier_cost: 8.08,
        status: 'processing',
        platform_order_id: 'TG-MNOXNDIO',
        customer_name: 'Stuart French',
        customer_email: 'sfrench71@me.com',
      },
    ]

    // Get store user_id
    const { rows: stores } = await sql`SELECT user_id FROM user_stores WHERE subdomain = 'stu' LIMIT 1`
    const userId = stores[0]?.user_id
    if (!userId) return res.status(404).json({ error: 'Store not found' })

    let restored = 0
    for (const o of orders) {
      const { rows: exists } = await sql`SELECT id FROM user_orders WHERE supplier_order_id = ${o.supplier_order_id} LIMIT 1`
      if (exists.length > 0) continue

      const profit = Math.round((o.sale_price - o.supplier_cost) * 0.90 * 100) / 100
      const commission = Math.round((o.sale_price - o.supplier_cost) * 0.10 * 100) / 100

      await sql`
        INSERT INTO user_orders (
          user_id, supplier, supplier_order_id, product_title,
          supplier_cost, sale_price, profit, commission, commission_rate, quantity,
          platform, platform_order_id, customer_name, customer_email,
          status, created_at
        ) VALUES (
          ${userId}, 'AliExpress', ${o.supplier_order_id}, ${o.product_title},
          ${o.supplier_cost}, ${o.sale_price}, ${profit}, ${commission}, 0.10, 1,
          'togogo-store', ${o.platform_order_id}, ${o.customer_name}, ${o.customer_email},
          ${o.status}, '2026-04-08'
        )
      `
      restored++
    }

    return res.json({ success: true, restored })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
