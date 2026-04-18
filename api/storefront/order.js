// Storefront order API — handles customer purchases on ToGoGo-hosted stores
// Creates an order record and triggers supplier fulfillment
import { sql } from '../_lib/db.js'
import { getCommissionRate } from '../_lib/commission.js'
import { placeSupplierOrder } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const allowedOrigin = origin.endsWith('.togogo.me') || origin.includes('togogo.vercel.app') || origin.includes('localhost')
    ? origin
    : 'https://togogo.me'
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
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

    // Check for duplicate order (same customer + same items within 60 seconds)
    const { rows: recentOrders } = await sql`
      SELECT id FROM user_orders
      WHERE user_id = ${store.user_id}
        AND customer_email = ${customer.email}
        AND platform = 'togogo-store'
        AND created_at > NOW() - INTERVAL '60 seconds'
      LIMIT 1
    `
    if (recentOrders.length > 0) {
      return res.status(409).json({ error: 'Duplicate order detected. Please wait before placing another order.' })
    }

    const orders = []
    const failedItems = []
    const commissionRate = await getCommissionRate()

    // Create an order for each item
    for (const item of items) {
      // Look up the product to get supplier cost
      const { rows: products } = await sql`
        SELECT id, title, image, supplier, supplier_cost, sale_price, supplier_product_id
        FROM user_products
        WHERE id = ${item.productId} AND user_id = ${store.user_id} AND is_active = true
      `
      if (!products[0]) {
        failedItems.push({ productId: item.productId, reason: 'Product not found or unavailable' })
        continue
      }

      const product = products[0]
      const qty = item.quantity || 1
      const salePrice = parseFloat(product.sale_price) * qty
      const supplierCost = parseFloat(product.supplier_cost) * qty
      const commission = Math.round(salePrice * commissionRate * 100) / 100
      const profit = Math.round((salePrice - supplierCost - commission) * 100) / 100

      const { rows: orderRows } = await sql`
        INSERT INTO user_orders (
          user_id, supplier, product_title, product_image,
          supplier_cost, sale_price, profit, commission, commission_rate, quantity,
          platform, platform_order_id,
          customer_name, customer_email, shipping_address, status, notes
        ) VALUES (
          ${store.user_id}, ${product.supplier || 'togogo'}, ${product.title}, ${product.image},
          ${supplierCost}, ${salePrice}, ${profit}, ${commission}, ${commissionRate}, ${qty},
          'togogo-store', ${orderRef},
          ${customer.name}, ${customer.email},
          ${JSON.stringify(customer.address || {})},
          'pending',
          ${`Order from ${store.store_name} storefront (qty: ${qty})`}
        ) RETURNING id
      `

      // Update product sold count — log errors instead of swallowing them
      try {
        await sql`
          UPDATE user_products
          SET total_sold = total_sold + ${qty},
              total_revenue = total_revenue + ${salePrice},
              updated_at = NOW()
          WHERE id = ${product.id}
        `
      } catch (updateErr) {
        console.error(`Failed to update product stats for ${product.id}:`, updateErr.message)
      }

      const createdOrderId = orderRows[0]?.id

      // Auto-forward to supplier (non-blocking — don't fail the customer order if supplier call fails)
      if (createdOrderId && product.supplier) {
        const shippingAddr = customer.address || {}
        shippingAddr.name = customer.name
        shippingAddr.email = customer.email
        placeSupplierOrder(product.supplier, {
          productId: product.supplier_product_id || product.id,
          quantity: qty,
          shippingAddress: shippingAddr,
        }).then(async (result) => {
          if (result.success) {
            await sql`
              UPDATE user_orders
              SET status = 'processing',
                  supplier_order_id = ${result.supplier_order_id},
                  notes = ${`Auto-forwarded to ${product.supplier} — supplier order: ${result.supplier_order_id}`},
                  updated_at = NOW()
              WHERE id = ${createdOrderId}
            `
          } else {
            await sql`
              UPDATE user_orders
              SET notes = ${`Auto-fulfillment attempted but failed: ${result.error}. Seller should retry from dashboard.`},
                  updated_at = NOW()
              WHERE id = ${createdOrderId}
            `
          }
        }).catch(err => {
          console.error(`Auto-fulfillment failed for order ${createdOrderId}:`, err.message)
        })
      }

      orders.push({
        id: createdOrderId,
        product: product.title,
        quantity: qty,
        total: salePrice,
      })
    }

    if (orders.length === 0) {
      return res.status(400).json({ error: 'No valid products found', failedItems })
    }

    const response = {
      success: true,
      orderRef,
      orders,
      total: orders.reduce((sum, o) => sum + o.total, 0),
      message: 'Order placed successfully! The store owner will process your order shortly.',
    }

    // Warn if some items failed
    if (failedItems.length > 0) {
      response.warnings = failedItems
      response.message = `Order placed for ${orders.length} item(s). ${failedItems.length} item(s) were unavailable.`
    }

    return res.json(response)
  } catch (err) {
    console.error('Storefront order error:', err)
    return res.status(500).json({ error: 'Failed to place order' })
  }
}
