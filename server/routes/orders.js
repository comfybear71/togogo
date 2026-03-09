import { Router } from 'express'
import { sql } from '@vercel/postgres'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Get user's orders
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const { type = 'bought' } = req.query
    const field = type === 'bought' ? 'buyer_id' : 'seller_id'

    const { data, error } = await supabase
      .from('orders')
      .select('*, product:products(id, title, images, price), buyer:users!buyer_id(id, name, avatar_url), seller:users!seller_id(id, name, avatar_url)')
      .eq(field, req.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// Update order status (seller marks shipped, buyer confirms delivery)
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, tracking_number } = req.body

    const { data: order } = await supabase
      .from('orders')
      .select('buyer_id, seller_id, status')
      .eq('id', id)
      .single()

    if (!order) return res.status(404).json({ error: 'Order not found' })

    // Verify user is buyer or seller
    const isBuyer = order.buyer_id === req.user.id
    const isSeller = order.seller_id === req.user.id
    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    // Validate state transitions
    const validTransitions = {
      paid: ['shipped'],
      shipped: ['delivered'],
      delivered: ['disputed'],
    }
    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({ error: `Cannot transition from ${order.status} to ${status}` })
    }

    const updates = { status }
    if (tracking_number) updates.tracking_number = tracking_number

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Create notification for the other party
    const notifyUserId = isSeller ? order.buyer_id : order.seller_id
    await supabase.from('notifications').insert({
      user_id: notifyUserId,
      type: 'order_update',
      title: `Order ${status}`,
      body: `Your order has been ${status}.`,
      link: `/orders`,
    })

    res.json(data)
  } catch (err) {
    next(err)
  }
})

// Open dispute
router.post('/:id/dispute', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const { data, error } = await supabase
      .from('disputes')
      .insert({
        order_id: id,
        opened_by: req.user.id,
        reason,
      })
      .select()
      .single()

    if (error) throw error

    // Update order status
    await supabase.from('orders').update({ status: 'disputed' }).eq('id', id)

    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router
