import { Router } from 'express'
import { requireAuth, supabase } from '../middleware/auth.js'

const router = Router()

// Get daily deals
router.get('/daily', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('deals')
      .select('*, product:products(*), retailer:retailers(*)')
      .eq('is_daily_deal', true)
      .eq('in_stock', true)
      .order('deal_score', { ascending: false })
      .limit(20)

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

// Search deals by product name/category
router.get('/search', async (req, res, next) => {
  try {
    const { q, category, sort = 'deal_score', limit = 50 } = req.query

    let query = supabase
      .from('deals')
      .select('*, product:products(*), retailer:retailers(*)')
      .eq('in_stock', true)

    if (category) {
      query = query.eq('product.category', category)
    }

    const sortMap = {
      deal_score: ['deal_score', { ascending: false }],
      price_low: ['price', { ascending: true }],
      price_high: ['price', { ascending: false }],
      newest: ['created_at', { ascending: false }],
    }

    const [field, opts] = sortMap[sort] || sortMap.deal_score
    query = query.order(field, opts).limit(Math.min(parseInt(limit), 100))

    const { data, error } = await query
    if (error) throw error

    // Filter by search query in JS (Supabase doesn't support cross-table ilike easily)
    let results = data || []
    if (q) {
      const lower = q.toLowerCase()
      results = results.filter(d =>
        d.product?.name?.toLowerCase().includes(lower) ||
        d.product?.brand?.toLowerCase().includes(lower) ||
        d.product?.category?.toLowerCase().includes(lower)
      )
    }

    res.json(results)
  } catch (err) {
    next(err)
  }
})

// Get price comparison for a product (all deals across retailers)
router.get('/compare/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params

    const [productRes, dealsRes] = await Promise.all([
      supabase.from('products').select('*').eq('id', productId).single(),
      supabase
        .from('deals')
        .select('*, retailer:retailers(*)')
        .eq('product_id', productId)
        .order('price', { ascending: true }),
    ])

    if (productRes.error) throw productRes.error

    res.json({
      product: productRes.data,
      deals: dealsRes.data || [],
      best_price: dealsRes.data?.[0] || null,
    })
  } catch (err) {
    next(err)
  }
})

// Get price history for a deal
router.get('/history/:dealId', async (req, res, next) => {
  try {
    const { dealId } = req.params
    const { days = 30 } = req.query

    const since = new Date()
    since.setDate(since.getDate() - parseInt(days))

    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('deal_id', dealId)
      .gte('checked_at', since.toISOString())
      .order('checked_at', { ascending: true })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

// Watchlist endpoints
router.get('/watchlist', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('watchlist')
      .select('*, product:products(*)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

router.post('/watchlist', requireAuth, async (req, res, next) => {
  try {
    const { product_id, target_price } = req.body

    const { data, error } = await supabase
      .from('watchlist')
      .insert({
        user_id: req.user.id,
        product_id,
        target_price: target_price || null,
      })
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

router.delete('/watchlist/:id', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// Price alerts
router.get('/alerts', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('price_alerts')
      .select('*, deal:deals(*, product:products(*), retailer:retailers(*))')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

router.patch('/alerts/:id/read', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('price_alerts')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
