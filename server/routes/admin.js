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

export default router
