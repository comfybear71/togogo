// One-time fix: convert all USD prices to AUD in user_products
// GET /api/admin/fix-prices?secret=JWT_SECRET
import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  try {
    // Read rate from admin_settings or use default
    let rate = 1.45
    try {
      const { rows } = await sql`SELECT value FROM admin_settings WHERE key = 'usd_to_aud_rate'`
      if (rows[0]) rate = parseFloat(rows[0].value) || 1.45
    } catch { /* use default */ }
    const minShip = 3.00 // minimum A$3 shipping

    // Convert all prices from USD to AUD and recalculate
    const { rowCount } = await sql`
      UPDATE user_products
      SET
        api_price = ROUND((api_price * ${rate})::numeric, 2),
        shipping_cost = GREATEST(ROUND((shipping_cost * ${rate})::numeric, 2), ${minShip}),
        tax_amount = ROUND((api_price * ${rate} * 0.18)::numeric, 2),
        supplier_cost = ROUND((api_price * ${rate})::numeric, 2) + GREATEST(ROUND((shipping_cost * ${rate})::numeric, 2), ${minShip}) + ROUND((api_price * ${rate} * 0.18)::numeric, 2),
        sale_price = ROUND(((ROUND((api_price * ${rate})::numeric, 2) + GREATEST(ROUND((shipping_cost * ${rate})::numeric, 2), ${minShip}) + ROUND((api_price * ${rate} * 0.18)::numeric, 2)) * 1.5)::numeric, 2),
        price_currency = 'AUD',
        updated_at = NOW()
      WHERE api_price > 0 AND api_price < 500
        AND (price_currency = 'USD' OR price_currency IS NULL)
    `

    // Save current rate + coupon code to admin_settings if not exists
    await sql`
      INSERT INTO admin_settings (key, value, category, label)
      VALUES ('usd_to_aud_rate', ${String(rate)}, 'pricing', 'USD to AUD Exchange Rate')
      ON CONFLICT (key) DO NOTHING
    `.catch(() => {})
    await sql`
      INSERT INTO admin_settings (key, value, category, label)
      VALUES ('default_coupon_code', 'AUAP03', 'pricing', 'AliExpress Coupon Code (applied to all orders)')
      ON CONFLICT (key) DO NOTHING
    `.catch(() => {})

    return res.json({
      success: true,
      updated: rowCount,
      rate: `1 USD = ${rate} AUD`,
      formula: '(api_price_AUD + shipping_AUD + tax_AUD) × 1.5 = sale_price'
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
