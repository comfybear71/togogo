import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  await ensureSchema()

  const { rows: products } = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN supplier_cost <= 0 THEN 1 END) as zero_cost,
      COUNT(CASE WHEN supplier_cost > sale_price THEN 1 END) as cost_exceeds_sale,
      COUNT(CASE WHEN sale_price <= 0 THEN 1 END) as zero_sale,
      ROUND(AVG(supplier_cost)::numeric, 2) as avg_cost,
      ROUND(AVG(sale_price)::numeric, 2) as avg_sale,
      ROUND(AVG(sale_price / NULLIF(supplier_cost, 0))::numeric, 2) as avg_markup
    FROM user_products WHERE is_active = true
  `

  const { rows: samples } = await sql`
    SELECT title, supplier_cost, sale_price, shipping_cost, api_price
    FROM user_products WHERE is_active = true AND sale_price > 0
    ORDER BY random() LIMIT 10
  `

  const { rows: broken } = await sql`
    SELECT COUNT(*) as count FROM user_products 
    WHERE is_active = true AND (supplier_cost > sale_price OR supplier_cost <= 0)
  `

  return res.json({
    products: products[0],
    brokenProducts: broken[0].count,
    randomSamples: samples.map(s => ({
      title: s.title?.slice(0, 40),
      cost: s.supplier_cost,
      sale: s.sale_price,
      shipping: s.shipping_cost,
      apiPrice: s.api_price,
      markup: s.sale_price > 0 && s.supplier_cost > 0 ? (s.sale_price / s.supplier_cost).toFixed(2) : 'N/A'
    }))
  })
}
