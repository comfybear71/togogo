// User's own products API — CRUD for store owner's products
import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'
import { getCommissionRate } from '../_lib/commission.js'
import { getAudRate } from '../_lib/pricing.js'

const DEFAULT_SALE_MARKUP = 1.40 // 40% above cost by default (ensures profit after commission)

function autoSalePrice(supplierCost, commissionRate) {
  // Cost to user = supplier_cost + commission
  const userCost = supplierCost * (1 + commissionRate)
  // Default sale price = cost * markup, rounded to .99
  const raw = userCost * DEFAULT_SALE_MARKUP
  return Math.ceil(raw) - 0.01
}

export default async function handler(req, res) {
  let user
  try {
    user = await requireAuth(req)
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication required' })
  }

  // GET — list user's own products
  if (req.method === 'GET') {
    try {
      const { rows: products } = await sql`
        SELECT id, title, description, image, images, supplier, supplier_product_id,
               supplier_url, supplier_cost, sale_price, category, is_active,
               platforms_listed, total_sold, total_revenue, visible_to_storefront,
               shipping_cost_usd, shipping_checked_at, created_at
        FROM user_products
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
      `
      // Send the live USD->AUD rate so the owner's product manager can show
      // wholesale cost, variants and shipping in AUD (AE bills us in USD).
      let audRate = 1.45
      try { audRate = await getAudRate() } catch { /* default applies */ }
      return res.json({ products, audRate })
    } catch (err) {
      console.error('My products error:', err)
      return res.json({ products: [] })
    }
  }

  // POST — add a product from supplier catalog
  if (req.method === 'POST') {
    const { title, description, image, images, supplier, supplierProductId, supplierUrl, supplierCost, salePrice, category } = req.body

    if (!title || !supplier) {
      return res.status(400).json({ error: 'Title and supplier are required' })
    }

    try {
      const cost = parseFloat(supplierCost) || 0
      let price = parseFloat(salePrice) || 0

      // Auto-set sale price if not provided — ensures user makes profit by default
      if (price <= 0 && cost > 0) {
        const commissionRate = await getCommissionRate()
        price = autoSalePrice(cost, commissionRate)
      }

      const { rows } = await sql`
        INSERT INTO user_products (user_id, title, description, image, images, supplier, supplier_product_id, supplier_url, supplier_cost, sale_price, category, is_active)
        VALUES (${user.id}, ${title}, ${description || ''}, ${image || null}, ${images || []}, ${supplier}, ${supplierProductId || null}, ${supplierUrl || null}, ${cost}, ${price}, ${category || 'General'}, true)
        RETURNING *
      `
      return res.json({ product: rows[0] })
    } catch (err) {
      console.error('Add product error:', err)
      return res.status(500).json({ error: 'Failed to add product' })
    }
  }

  // DELETE — remove a product
  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'Product ID required' })

    try {
      await sql`DELETE FROM user_products WHERE id = ${id} AND user_id = ${user.id}`
      return res.json({ success: true })
    } catch (err) {
      console.error('Delete product error:', err)
      return res.status(500).json({ error: 'Failed to delete product' })
    }
  }

  // PATCH — update product (price, active status, visibility, etc.)
  if (req.method === 'PATCH') {
    const { id, salePrice, isActive, category, visibleToStorefront } = req.body
    if (!id) return res.status(400).json({ error: 'Product ID required' })

    try {
      if (salePrice !== undefined) {
        await sql`UPDATE user_products SET sale_price = ${parseFloat(salePrice)}, updated_at = NOW() WHERE id = ${id} AND user_id = ${user.id}`
      }
      if (isActive !== undefined) {
        await sql`UPDATE user_products SET is_active = ${isActive}, updated_at = NOW() WHERE id = ${id} AND user_id = ${user.id}`
      }
      if (category !== undefined) {
        await sql`UPDATE user_products SET category = ${category}, updated_at = NOW() WHERE id = ${id} AND user_id = ${user.id}`
      }
      if (visibleToStorefront !== undefined) {
        await sql`UPDATE user_products SET visible_to_storefront = ${Boolean(visibleToStorefront)}, updated_at = NOW() WHERE id = ${id} AND user_id = ${user.id}`
      }
      return res.json({ success: true })
    } catch (err) {
      console.error('Update product error:', err)
      return res.status(500).json({ error: 'Failed to update product' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
