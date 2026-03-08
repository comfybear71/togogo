import { Router } from 'express'
import { requireAdmin, supabase } from '../middleware/auth.js'

const router = Router()

// Dashboard stats
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const [users, products, ordersToday, disputes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('orders').select('id, total_price, platform_fee', { count: 'exact' }).gte('created_at', today),
      supabase.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ])

    const revenueToday = ordersToday.data?.reduce((sum, o) => sum + (o.platform_fee || 0), 0) || 0

    res.json({
      totalUsers: users.count || 0,
      activeListings: products.count || 0,
      ordersToday: ordersToday.count || 0,
      revenueToday,
      openDisputes: disputes.count || 0,
    })
  } catch (err) {
    next(err)
  }
})

// User management
router.get('/users', requireAdmin, async (req, res, next) => {
  try {
    const { search, role, page = 1, limit = 50 } = req.query
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    if (role) query = query.eq('role', role)

    const { data, count, error } = await query
    if (error) throw error
    res.json({ users: data, total: count })
  } catch (err) {
    next(err)
  }
})

// User actions
router.patch('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { action, ...updates } = req.body

    if (action === 'suspend' || action === 'ban') {
      updates.role = action === 'ban' ? 'banned' : 'suspended'
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// Product management
router.get('/products', requireAdmin, async (req, res, next) => {
  try {
    const { search, category, status, page = 1, limit = 50 } = req.query
    let query = supabase
      .from('products')
      .select('*, seller:users(id, name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (search) query = query.ilike('title', `%${search}%`)
    if (category) query = query.eq('category', category)
    if (status) query = query.eq('status', status)

    const { data, count, error } = await query
    if (error) throw error
    res.json({ products: data, total: count })
  } catch (err) {
    next(err)
  }
})

// Remove/feature product
router.patch('/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const updates = req.body

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// Dispute management
router.get('/disputes', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select('*, order:orders(*, buyer:users!buyer_id(name), seller:users!seller_id(name), product:products(title))')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// Resolve dispute
router.patch('/disputes/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { resolution, admin_note, status } = req.body

    const { data, error } = await supabase
      .from('disputes')
      .update({ resolution, admin_note, status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// Financial summary
router.get('/finances', requireAdmin, async (req, res, next) => {
  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('total_price, platform_fee, seller_payout, status, created_at')
      .in('status', ['paid', 'shipped', 'delivered'])

    const totalRevenue = orders?.reduce((s, o) => s + (o.total_price || 0), 0) || 0
    const totalFees = orders?.reduce((s, o) => s + (o.platform_fee || 0), 0) || 0
    const totalPayouts = orders?.reduce((s, o) => s + (o.seller_payout || 0), 0) || 0

    res.json({
      totalRevenue,
      totalFees,
      totalPayouts,
      balance: totalFees - totalPayouts,
      orderCount: orders?.length || 0,
    })
  } catch (err) {
    next(err)
  }
})

// Promo codes
router.post('/promos', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .insert(req.body)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

router.get('/promos', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// ============================================
// ADMIN SETTINGS — key/value config store
// For referral links, API keys, platform config, etc.
// ============================================

// Get all settings (admin only)
router.get('/settings', requireAdmin, async (req, res, next) => {
  try {
    const { category } = req.query
    let query = supabase
      .from('admin_settings')
      .select('*')
      .order('category')
      .order('key')

    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

// Upsert a setting
router.put('/settings', requireAdmin, async (req, res, next) => {
  try {
    const { key, value, category, label, is_secret } = req.body

    if (!key || !category) {
      return res.status(400).json({ error: 'Key and category are required' })
    }

    const { data, error } = await supabase
      .from('admin_settings')
      .upsert(
        {
          key,
          value: value || '',
          category,
          label: label || key,
          is_secret: is_secret || false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// Bulk upsert settings
router.put('/settings/bulk', requireAdmin, async (req, res, next) => {
  try {
    const { settings } = req.body

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({ error: 'Settings array is required' })
    }

    const rows = settings.map((s) => ({
      key: s.key,
      value: s.value || '',
      category: s.category,
      label: s.label || s.key,
      is_secret: s.is_secret || false,
      updated_at: new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from('admin_settings')
      .upsert(rows, { onConflict: 'key' })
      .select()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// Delete a setting
router.delete('/settings/:key', requireAdmin, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('admin_settings')
      .delete()
      .eq('key', req.params.key)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// PUBLIC: Get referral links (no auth required — used by PlatformsPage)
router.get('/public/referral-links', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('key, value')
      .eq('category', 'referral_links')

    if (error) throw error

    // Convert to { platform: url } map
    const links = {}
    for (const row of data || []) {
      // Keys are like "referral_shopify", "referral_ebay"
      const platform = row.key.replace('referral_', '')
      links[platform] = row.value
    }

    res.json(links)
  } catch (err) {
    next(err)
  }
})

export default router
