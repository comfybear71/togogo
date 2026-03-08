import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cron from 'node-cron'
import dealsRoutes from './routes/deals.js'
import pricesRoutes from './routes/prices.js'
import stripeRoutes from './routes/stripe.js'
import adminRoutes from './routes/admin.js'
import aiRoutes from './routes/ai.js'
import dropshipRoutes from './routes/dropship.js'
import platformRoutes from './routes/platforms.js'

const app = express()
const PORT = process.env.PORT || 3001

// Security
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

// Rate limiting: 100 requests/minute per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a minute.' },
}))

// Parse JSON (except for Stripe webhooks which need raw body)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') {
    next()
  } else {
    express.json({ limit: '10mb' })(req, res, next)
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'togogo-price-comparison-api',
    timestamp: new Date().toISOString(),
  })
})

// Routes
app.use('/api/deals', dealsRoutes)
app.use('/api/prices', pricesRoutes)
app.use('/api/stripe', stripeRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/dropship', dropshipRoutes)
app.use('/api/platforms', platformRoutes)

// Schedule price checks (3 times per day: 6am, 12pm, 6pm)
cron.schedule('0 6,12,18 * * *', async () => {
  console.log('[CRON] Running scheduled price check...')
  try {
    const response = await fetch(`http://localhost:${PORT}/api/prices/check-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'internal-cron'}`,
      },
    })
    const result = await response.json()
    console.log(`[CRON] Price check complete: ${result.checked} checked, ${result.updated} updated`)
  } catch (err) {
    console.error('[CRON] Price check failed:', err.message)
  }
})

// Error handler
app.use((err, req, res, _next) => {
  console.error('Server error:', err.message)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again.'
      : err.message,
  })
})

app.listen(PORT, () => {
  console.log(`ToGoGo Price Comparison API running on port ${PORT}`)
})
