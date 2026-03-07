import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import stripeRoutes from './routes/stripe.js'
import ordersRoutes from './routes/orders.js'
import aiRoutes from './routes/ai.js'
import shippingRoutes from './routes/shipping.js'
import dropshipRoutes from './routes/dropship.js'
import adminRoutes from './routes/admin.js'

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
  res.json({ status: 'ok', service: 'togogo-api', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/stripe', stripeRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/shipping', shippingRoutes)
app.use('/api/dropship', dropshipRoutes)
app.use('/api/admin', adminRoutes)

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
  console.log(`ToGoGo API running on port ${PORT}`)
})
