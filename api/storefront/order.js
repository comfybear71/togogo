// Storefront order API — handles customer purchases on ToGoGo-hosted stores
// Creates an order record and triggers supplier fulfillment
import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await ensureSchema()
    const { subdomain, items, customer } = req.body

    if (!subdomain || !items?.length || !customer?.name || !customer?.email) {
      return res.status(400).json({ error: 'subdomain, items, and customer (name, email) are required' })
    }

    // Validate store
    const { rows: stores } = await sql`
      SELECT s.id, s.user_id, s.store_name
      FROM user_stores s
      WHERE s.subdomain = ${subdomain} AND s.status = 'active'
    `
    if (!stores[0]) return res.status(404).json({ error: 'Store not found' })

    const store = stores[0]
    const orderRef = `TG-${Date.now().toString(36).toUpperCase()}`
    const orders = []

    // Create an order for each item
    for (const item of items) {
      // Look up the product to get supplier cost
      const { rows: products } = await sql`
        SELECT id, title, image, supplier, supplier_cost, sale_price, supplier_product_id
        FROM user_products
        WHERE id = ${item.productId} AND user_id = ${store.user_id} AND is_active = true
      `
      if (!products[0]) continue

      const product = products[0]
      const qty = item.quantity || 1
      const salePrice = parseFloat(product.sale_price) * qty
      const supplierCost = parseFloat(product.supplier_cost) * qty
      const commission = salePrice * 0.05 // 5% ToGoGo commission
      const profit = salePrice - supplierCost - commission

      const { rows: orderRows } = await sql`
        INSERT INTO user_orders (
          user_id, supplier, product_title, product_image,
          supplier_cost, sale_price, profit, platform, platform_order_id,
          customer_name, customer_email, shipping_address, status, notes
        ) VALUES (
          ${store.user_id}, ${product.supplier || 'togogo'}, ${product.title}, ${product.image},
          ${supplierCost}, ${salePrice}, ${profit}, 'togogo-store', ${orderRef},
          ${customer.name}, ${customer.email},
          ${JSON.stringify(customer.address || {})},
          'pending',
          ${`Order from ${store.store_name} storefront (qty: ${qty})`}
        ) RETURNING id
      `

      // Update product sold count
      await sql`
        UPDATE user_products
        SET total_sold = total_sold + ${qty},
            total_revenue = total_revenue + ${salePrice},
            updated_at = NOW()
        WHERE id = ${product.id}
      `.catch(() => {})

      orders.push({
        id: orderRows[0]?.id,
        product: product.title,
        quantity: qty,
        total: salePrice,
      })
    }

    if (orders.length === 0) {
      return res.status(400).json({ error: 'No valid products found' })
    }

    return res.json({
      success: true,
      orderRef,
      orders,
      total: orders.reduce((sum, o) => sum + o.total, 0),
      message: 'Order placed successfully! The store owner will process your order shortly.',
    })
  } catch (err) {
    console.error('Storefront order error:', err)
    return res.status(500).json({ error: 'Failed to place order' })
  }
}
