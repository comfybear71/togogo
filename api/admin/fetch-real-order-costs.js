// Fetch real AliExpress costs for orders with ae_actual_cost_usd = NULL
// Queries trade.ds.order.get using the supplier_order_id (AE order number)
// GET /api/admin/fetch-real-order-costs?secret=JWT&limit=50
// Add &apply=1 to also write ae_actual_cost_usd back to the DB in the same call
import { sql, ensureSchema } from '../_lib/db.js'
import { callAuthenticatedAPI } from '../_lib/suppliers.js'
import { getAudRate, usdToAud, DEFAULT_USD_TO_AUD } from '../_lib/pricing.js'

export default async function handler(req, res) {
  const secret = req.query.secret
  if (secret !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await ensureSchema()

  const limit = parseInt(req.query.limit) || 50
  const apply = req.query.apply === '1'
  let applied = 0

  try {
    // Get orders with missing ae_actual_cost_usd that have supplier_order_id
    const fallbackRate = await getAudRate().catch(() => DEFAULT_USD_TO_AUD)
    const { rows: orders } = await sql`
      SELECT
        id,
        platform_order_id,
        product_title,
        supplier_order_id,
        sale_price,
        supplier_cost,
        order_data,
        pricing_currency,
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
      // sale_price comes back from PostgreSQL NUMERIC as a string via @vercel/postgres;
      // parseFloat once here so `.toFixed()` and arithmetic work everywhere below.
      const salePrice = parseFloat(order.sale_price) || 0

      try {
        // Query AliExpress for the real order cost
        const orderData = await callAuthenticatedAPI('aliexpress.trade.ds.order.get', {
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

        // Extract the actual cost from AE's trade.ds.order.get response shape:
        //   order_amount.amount = total AE billed (primary source — what we pay)
        //   child_order_list.aeop_child_order_info[] = per-line breakdown
        //     (product_price × product_count + shipping_fee + actual_tax_fee)
        const orderAmountTotal = parseFloat(orderResult.order_amount?.amount || '0')

        const childOrders = orderResult.child_order_list?.aeop_child_order_info || []
        let productAmount = 0
        let shippingAmount = 0
        let taxAmount = 0
        for (const child of childOrders) {
          const unitPrice = parseFloat(child.product_price?.amount || '0')
          const count = parseInt(child.product_count) || 1
          productAmount += unitPrice * count
          shippingAmount += parseFloat(child.shipping_fee?.amount || '0')
          taxAmount += parseFloat(child.actual_tax_fee?.amount || '0')
        }

        let realCostUSD = null
        let costBreakdown = ''

        if (orderAmountTotal > 0) {
          realCostUSD = orderAmountTotal
          costBreakdown = `order_amount (product: $${productAmount.toFixed(2)} + shipping: $${shippingAmount.toFixed(2)} + tax: $${taxAmount.toFixed(2)})`
        } else if (productAmount > 0 || shippingAmount > 0 || taxAmount > 0) {
          realCostUSD = productAmount + shippingAmount + taxAmount
          costBreakdown = `summed children: product: $${productAmount.toFixed(2)} + shipping: $${shippingAmount.toFixed(2)} + tax: $${taxAmount.toFixed(2)}`
        }

        if (realCostUSD && realCostUSD > 0) {
          const marginUSD = salePrice - realCostUSD
          results.push({
            orderRef: order.platform_order_id,
            product: order.product_title?.slice(0, 50),
            aeOrderId: order.supplier_order_id,
            customerPaidUSD: salePrice,
            aeBilledUSD: realCostUSD,
            marginUSD: marginUSD,
            costBreakdown,
            createdAt: order.created_at,
          })
          console.log(`[Fetch] ${order.platform_order_id}: Customer paid US$${salePrice.toFixed(2)}, AE billed US$${realCostUSD.toFixed(2)}, margin US$${marginUSD.toFixed(2)}`)

          if (apply) {
            try {
              // AE discount captured = supplier_cost (USD) − AE's real bill
              // (USD). Convert to the order's pricing currency before
              // writing ae_bonus so the column matches sale_price /
              // commission / profit. AUD orders use the rate snapshotted
              // on the order at checkout (so post-charge math reproduces
              // pre-charge math even after the admin tweaks the rate);
              // legacy USD orders skip the conversion. Clamp negatives
              // to 0 so an AE overcharge never eats the owner's profit.
              const supplierCostStored = parseFloat(order.supplier_cost) || 0
              const bonusUsd = Math.max(0, Math.round((supplierCostStored - realCostUSD) * 100) / 100)
              let orderRate = null
              try {
                const od = typeof order.order_data === 'string' ? JSON.parse(order.order_data) : order.order_data
                orderRate = parseFloat(od?.audRate) || null
              } catch { /* */ }
              const isUsdOrder = order.pricing_currency === 'USD'
              const rate = isUsdOrder ? 1 : (orderRate || fallbackRate)
              const bonusStored = isUsdOrder ? bonusUsd : usdToAud(bonusUsd, rate)
              await sql`
                UPDATE user_orders
                SET ae_actual_cost_usd = ${realCostUSD},
                    ae_actual_fetched_at = NOW(),
                    ae_bonus = ${bonusStored},
                    notes = ${'Real AE cost: US$' + realCostUSD.toFixed(2) + '. AE bonus ' + (isUsdOrder ? '$' : 'A$') + bonusStored.toFixed(2) + (isUsdOrder ? '' : ' @ rate ' + rate) + '.'},
                    updated_at = NOW()
                WHERE id = ${order.id}
              `
              applied++
            } catch (dbErr) {
              console.error(`[Fetch] DB update failed for ${order.platform_order_id || order.supplier_order_id}:`, dbErr.message)
              // Don't fail the whole order — the results array still has the cost data
            }
          }
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
      errorsCount: errors.length,
      applied: apply ? applied : null,
      results,
      errors,
      nextStep: apply
        ? (applied === results.length
            ? `Applied ${applied} of ${results.length} cost values to user_orders. Check /admin/orders.`
            : `Applied ${applied} of ${results.length}. Some DB updates may have failed — check logs.`)
        : (results.length > 0
            ? `Re-run with &apply=1 to write these values to user_orders, or POST to /api/admin/batch-update-order-costs`
            : 'No valid costs to update'),
    })
  } catch (err) {
    console.error('[Fetch Real Costs] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}
