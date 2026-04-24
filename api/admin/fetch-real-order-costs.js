// Fetch real AliExpress costs for orders with ae_actual_cost_usd = NULL
// Queries trade.ds.order.get using the supplier_order_id (AE order number)
// GET /api/admin/fetch-real-order-costs?secret=JWT&limit=50
import { sql, ensureSchema } from '../_lib/db.js'
import { callAPI } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  const limit = parseInt(req.query.limit) || 50

  try {
    // Get orders with missing ae_actual_cost_usd that have supplier_order_id
    const { rows: orders } = await sql`
      SELECT
        id,
        platform_order_id,
        product_title,
        supplier_order_id,
        sale_price,
        created_at
      FROM user_orders
      WHERE ae_actual_cost_usd IS NULL
        AND supplier_order_id IS NOT NULL
        AND supplier_order_id != ''
        AND status NOT IN ('cancelled', 'refunded')
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    if (orders.length === 0) {
      return res.json({
        message: 'No orders found with missing ae_actual_cost_usd',
        orders: [],
      })
    }

    const results = []
    const errors = []

    for (const order of orders) {
      try {
        // Query AliExpress for the real order cost
        const orderData = await callAPI('aliexpress.trade.ds.order.get', {
          single_order_query: JSON.stringify({ order_id: Number(order.supplier_order_id) }),
        })

        const orderResult = orderData?.aliexpress_trade_ds_order_get_response?.result
          || orderData?.result

        if (!orderResult) {
          errors.push({
            orderRef: order.platform_order_id,
            error: 'No result from AliExpress',
            aeOrderId: order.supplier_order_id,
          })
          continue
        }

        // Extract the actual cost
        const payAmount = parseFloat(orderResult.pay_amount || '0')
        const productAmount = parseFloat(orderResult.total_product_amount || orderResult.product_amount || '0')
        const shippingAmount = parseFloat(orderResult.logistics_amount || orderResult.shipping_amount || '0')
        const taxAmount = parseFloat(orderResult.tax_amount || '0')

        let realCostUSD = null
        let costBreakdown = ''

        if (payAmount > 0) {
          realCostUSD = payAmount
          costBreakdown = `pay_amount (total charged)`
        } else if (productAmount > 0 || shippingAmount > 0 || taxAmount > 0) {
          realCostUSD = productAmount + shippingAmount + taxAmount
          costBreakdown = `product: $${productAmount.toFixed(2)} + shipping: $${shippingAmount.toFixed(2)} + tax: $${taxAmount.toFixed(2)}`
        }

        if (realCostUSD && realCostUSD > 0) {
          const marginUSD = order.sale_price - realCostUSD
          results.push({
            orderRef: order.platform_order_id,
            product: order.product_title?.slice(0, 50),
            aeOrderId: order.supplier_order_id,
            customerPaidUSD: order.sale_price,
            aeBilledUSD: realCostUSD,
            marginUSD: marginUSD,
            costBreakdown,
            createdAt: order.created_at,
          })
          console.log(`[Fetch] ${order.platform_order_id}: Customer paid US$${order.sale_price.toFixed(2)}, AE billed US$${realCostUSD.toFixed(2)}, margin US$${marginUSD.toFixed(2)}`)
        } else {
          errors.push({
            orderRef: order.platform_order_id,
            error: 'No cost data found',
            aeOrderId: order.supplier_order_id,
          })
        }
      } catch (err) {
        errors.push({
          orderRef: order.platform_order_id,
          error: err.message,
          aeOrderId: order.supplier_order_id,
        })
        console.error(`[Fetch] Error for ${order.platform_order_id}:`, err.message)
      }
    }

    return res.json({
      success: true,
      totalOrders: orders.length,
      fetched: results.length,
      errors: errors.length,
      results,
      errors,
      nextStep: results.length > 0 ? `Use /api/admin/batch-update-order-costs?secret=JWT to apply these values` : 'No valid costs to update',
    })
  } catch (err) {
    console.error('[Fetch Real Costs] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}
