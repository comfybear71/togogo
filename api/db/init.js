import { initializeSchema } from '../_lib/db.js'
import { requireAdmin } from '../_lib/auth.js'

// POST /api/db/init — Initialize database schema
// Protected: admin only (or first run with secret)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Allow initialization with a setup secret (for first run before any users exist)
    const setupSecret = req.headers['x-setup-secret']
    if (setupSecret !== process.env.JWT_SECRET) {
      // If no setup secret, require admin auth
      await requireAdmin(req)
    }

    await initializeSchema()

    return res.status(200).json({
      success: true,
      message: 'Database schema initialized successfully',
    })
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('DB init error:', error)
    return res.status(500).json({ error: 'Failed to initialize database', details: error.message })
  }
}
