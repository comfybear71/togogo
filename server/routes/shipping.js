import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Calculate shipping rate via Australia Post
router.post('/calculate/auspost', requireAuth, async (req, res, next) => {
  try {
    const { fromPostcode, toPostcode, weight, length, width, height } = req.body
    const apiKey = process.env.AUSPOST_API_KEY

    if (!apiKey) {
      // Return flat rate fallback
      return res.json({
        rates: [
          { service: 'Standard Post', price: 10.00, deliveryDays: '3-7 business days' },
          { service: 'Express Post', price: 18.00, deliveryDays: '1-3 business days' },
        ],
        source: 'flat_rate_fallback',
      })
    }

    const url = new URL('https://digitalapi.auspost.com.au/postage/parcel/domestic/calculate.json')
    url.searchParams.set('from_postcode', fromPostcode)
    url.searchParams.set('to_postcode', toPostcode)
    url.searchParams.set('length', length || 20)
    url.searchParams.set('width', width || 15)
    url.searchParams.set('height', height || 10)
    url.searchParams.set('weight', weight || 1)

    const response = await fetch(url.toString(), {
      headers: { 'AUTH-KEY': apiKey },
    })

    if (!response.ok) throw new Error('Australia Post API error')

    const data = await response.json()
    const rates = data.postage_result?.costs?.cost?.map(c => ({
      service: c.name,
      price: parseFloat(c.cost),
      deliveryDays: c.delivery_time || 'Unknown',
    })) || []

    res.json({ rates, source: 'auspost' })
  } catch (err) {
    next(err)
  }
})

// Track shipment
router.get('/track/:carrier/:trackingNumber', requireAuth, async (req, res, next) => {
  try {
    const { carrier, trackingNumber } = req.params

    // EasyPost tracking (unified API)
    const apiKey = process.env.EASYPOST_API_KEY
    if (apiKey) {
      const response = await fetch('https://api.easypost.com/v2/trackers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
        },
        body: JSON.stringify({
          tracker: { tracking_code: trackingNumber, carrier },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return res.json({
          status: data.status,
          estimatedDelivery: data.est_delivery_date,
          events: data.tracking_details?.map(d => ({
            status: d.status,
            message: d.message,
            datetime: d.datetime,
            location: d.tracking_location?.city,
          })) || [],
        })
      }
    }

    // Fallback: return placeholder
    res.json({
      status: 'in_transit',
      estimatedDelivery: null,
      events: [
        { status: 'info', message: 'Tracking info unavailable. Please check carrier website.', datetime: new Date().toISOString() },
      ],
    })
  } catch (err) {
    next(err)
  }
})

// Generate shipping label (via EasyPost)
router.post('/label', requireAuth, async (req, res, next) => {
  try {
    const { fromAddress, toAddress, parcel } = req.body
    const apiKey = process.env.EASYPOST_API_KEY

    if (!apiKey) {
      return res.status(503).json({ error: 'Shipping label service not configured. Please print label manually.' })
    }

    const response = await fetch('https://api.easypost.com/v2/shipments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
      },
      body: JSON.stringify({
        shipment: {
          from_address: fromAddress,
          to_address: toAddress,
          parcel: parcel || { length: 20, width: 15, height: 10, weight: 16 },
        },
      }),
    })

    if (!response.ok) throw new Error('Failed to create shipping label')

    const data = await response.json()
    res.json({
      labelUrl: data.postage_label?.label_url,
      trackingNumber: data.tracking_code,
      rate: data.selected_rate,
    })
  } catch (err) {
    next(err)
  }
})

export default router
