// Server auth middleware — uses JWT (same as Vercel functions)
import jwt from 'jsonwebtoken'
import { sql } from '@vercel/postgres'

const JWT_SECRET = process.env.JWT_SECRET || 'togogo-dev-secret-change-me'

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const payload = verifyToken(token)
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const { rows } = await sql`
      SELECT id, email, name, role FROM users WHERE id = ${payload.id}
    `
    if (!rows[0]) {
      return res.status(401).json({ error: 'User not found' })
    }
    req.user = rows[0]
    next()
  } catch {
    res.status(401).json({ error: 'Authentication failed' })
  }
}

export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    next()
  })
}
