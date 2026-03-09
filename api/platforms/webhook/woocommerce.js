import crypto from 'crypto'
import { sql } from '../../_lib/db.js'
import { getCommissionRate } from '../../_lib/commission.js'

// WooCommerce sends order webhooks here when a customer places an order
// on a user's connected WooCommerce store.
// Webhook payload: https://woocommerce.github.io/woocommerce-rest-api-docs/#order-properties
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body

    // WooCommerce sends a ping on webhook creation — respond 200
    if (req.headers['x-wc-webhook-topic'] === 'action.woocommerce_webhook_delivery') {
      return res.json({ success: true, message: 'Webhook registered' })
    }

    // Extract store identifier from webhook source header
    const webhookSource = req.headers['x-wc-webhook-source'] || ''

    // Look up which ToGoGo user owns this store
    const { rows } = await sql`
      SELECT pc.id, pc.user_id, pc.shop_url, pc.access_token, pc.refresh_token
      FROM platform_connections pc
      WHERE pc.platform = 'woocommerce'
        AND pc.status = 'active'
        AND (pc.shop_url = ${webhookSource.replace(/\/+$/, '')}
             OR pc.shop_url = ${webhookSource})
      LIMIT 1
    `

    const conn = rows[0]
    if (!conn) {
      console.error('WooCommerce webhook: no matching store for source:', webhookSource)
      // Return 200 so WooCommerce doesn't keep retrying
      return res.json({ success: false, error: 'Store not connected' })
    }

    // Verify webhook signature if secret is available
    const webhookSecret = req.headers['x-wc-webhook-delivery-id']
    const signature = req.headers['x-wc-webhook-signature']
    if (signature && conn.access_token) {
      const expectedSig = crypto
        .createHmac('sha256', conn.access_token)
        .update(JSON.stringify(body))
        .digest('base64')
      if (signature !== expectedSig) {
        console.error('WooCommerce webhook: invalid signature')
        return res.status(401).json({ error: 'Invalid webhook signature' })
      }
    }

    const topic = req.headers['x-wc-webhook-topic']

    if (topic === 'order.created' || topic === 'order.updated') {
      await handleOrder(conn, body)
    }

    res.json({ success: true })
  } catch (err) {
    console.error('WooCommerce webhook error:', err)
    // Return 200 to prevent WooCommerce from retrying on our errors
    res.json({ success: false, error: err.message })
  }
}

async function handleOrder(conn, order) {
  if (!order.id) return

  // Extract order details
  const lineItems = order.line_items || []
  const shippingAddress = order.shipping || {}
  const customerName = `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim()
  const customerEmail = order.billing?.email || ''

  for (const item of lineItems) {
    // Check if this product was pushed from ToGoGo (by checking user_products table)
    const { rows: matchedProducts } = await sql`
      SELECT id, supplier, supplier_product_id, supplier_cost, sale_price
      FROM user_products
      WHERE user_id = ${conn.user_id}
        AND is_active = true
        AND (
          title = ${item.name}
          OR sale_price = ${item.price}
        )
      LIMIT 1
    `

    const product = matchedProducts[0]
    const supplierCost = product?.supplier_cost || 0
    const salePrice = parseFloat(item.price) || 0
    const commissionRate = await getCommissionRate()
    const togogoCommission = salePrice * commissionRate
    const profit = salePrice - supplierCost - togogoCommission

    // Upsert order (idempotent — safe for retries)
    await sql`
      INSERT INTO user_orders (
        user_id, supplier, product_title, product_image,
        supplier_cost, sale_price, profit,
        platform, platform_order_id,
        customer_name, customer_email,
        shipping_address, status, notes
      ) VALUES (
        ${conn.user_id},
        ${product?.supplier || 'unknown'},
        ${item.name},
        ${item.image?.src || null},
        ${supplierCost},
        ${salePrice},
        ${profit},
        'woocommerce',
        ${String(order.id) + '-' + String(item.id)},
        ${customerName},
        ${customerEmail},
        ${JSON.stringify({
          address_1: shippingAddress.address_1,
          address_2: shippingAddress.address_2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postcode: shippingAddress.postcode,
          country: shippingAddress.country,
        })},
        ${order.status === 'processing' || order.status === 'completed' ? 'processing' : 'pending'},
        ${`ToGoGo commission: $${togogoCommission.toFixed(2)} (${(commissionRate * 100).toFixed(0)}%)`}
      )
      ON CONFLICT DO NOTHING
    `
  }
}
