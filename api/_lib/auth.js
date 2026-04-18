// Auth utilities for Vercel serverless functions
// JWT-based auth with Google OAuth + email/password
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { sql } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET && (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production')) {
  throw new Error('JWT_SECRET environment variable is required in production')
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'togogo-dev-secret-change-me'
const JWT_EXPIRES_IN = '30d'

// Generate JWT token for a user
export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    EFFECTIVE_JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

// Verify JWT token and return user payload
export function verifyToken(token) {
  try {
    return jwt.verify(token, EFFECTIVE_JWT_SECRET)
  } catch {
    return null
  }
}

// Hash a password
export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

// Compare password against hash
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

// Get current user from request (Bearer token or cookie)
export async function getCurrentUser(req) {
  let token = null

  // Check Authorization header
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  // Check cookie
  if (!token && req.cookies?.token) {
    token = req.cookies.token
  }

  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  // Fetch fresh user data from DB
  const { rows } = await sql`
    SELECT id, email, name, avatar_url, bio, role, wallet_balance,
           location_suburb, location_country, verification_level,
           stripe_account_id, phone, google_id, created_at
    FROM users WHERE id = ${payload.id}
  `

  return rows[0] || null
}

// Middleware-style auth check for serverless functions
export async function requireAuth(req) {
  const user = await getCurrentUser(req)
  if (!user) {
    throw { status: 401, message: 'Authentication required' }
  }
  return user
}

export async function requireAdmin(req) {
  const user = await requireAuth(req)
  if (user.role !== 'admin') {
    throw { status: 403, message: 'Admin access required' }
  }
  return user
}

// Admin check that also allows setup secret for initial configuration
export async function requireAdminOrSetup(req) {
  const setupSecret = req.headers['x-setup-secret']
  if (setupSecret && setupSecret === EFFECTIVE_JWT_SECRET) {
    return { id: 'setup', role: 'admin' }
  }
  return requireAdmin(req)
}

// In-memory role cache (per warm serverless instance). Keyed by user_id.
// Admin endpoints check this first to avoid a `SELECT role FROM users` on every
// request. 5-min TTL bounds staleness; bustRoleCache() clears on role change.
const roleCache = new Map()
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000

export function bustRoleCache(userId = null) {
  if (userId) roleCache.delete(userId)
  else roleCache.clear()
}

// Fast admin check — verifies JWT, checks cache, falls back to a single
// light `SELECT role` query on miss. Used by admin endpoints that only need
// to know "is this caller an admin" and don't need the full user row.
// Throws { status, message } for the caller to catch and map to a response.
export async function requireAdminLite(req) {
  // Setup secret bypass (for URL testing + ?secret= query param)
  const setupSecret = req.headers['x-setup-secret'] || req.query?.secret
  if (setupSecret && setupSecret === EFFECTIVE_JWT_SECRET) {
    return { id: 'setup', role: 'admin', email: null }
  }

  // Extract token from Authorization header or cookie
  const authHeader = req.headers.authorization
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token && req.cookies?.token) token = req.cookies.token
  if (!token) throw { status: 401, message: 'Authentication required' }

  const payload = verifyToken(token)
  if (!payload?.id) throw { status: 401, message: 'Invalid token' }

  // Cache hit?
  const cached = roleCache.get(payload.id)
  if (cached && Date.now() < cached.expiresAt) {
    if (cached.role !== 'admin') throw { status: 403, message: 'Admin access required' }
    return { id: payload.id, role: cached.role, email: payload.email || null }
  }

  // Cache miss — one light query
  const { rows } = await sql`SELECT role FROM users WHERE id = ${payload.id}`
  const role = rows[0]?.role || null
  roleCache.set(payload.id, { role, expiresAt: Date.now() + ROLE_CACHE_TTL_MS })
  if (role !== 'admin') throw { status: 403, message: 'Admin access required' }
  return { id: payload.id, role, email: payload.email || null }
}

// Find or create user from Google OAuth profile
export async function findOrCreateGoogleUser({ googleId, email, name, avatarUrl }) {
  // Check if user exists by google_id
  let { rows } = await sql`
    SELECT * FROM users WHERE google_id = ${googleId}
  `

  if (rows[0]) return rows[0]

  // Check if user exists by email (may have signed up with password)
  ;({ rows } = await sql`
    SELECT * FROM users WHERE email = ${email}
  `)

  if (rows[0]) {
    // Link Google account to existing user
    await sql`
      UPDATE users SET google_id = ${googleId}, avatar_url = COALESCE(avatar_url, ${avatarUrl})
      WHERE id = ${rows[0].id}
    `
    return { ...rows[0], google_id: googleId }
  }

  // Create new user
  ;({ rows } = await sql`
    INSERT INTO users (email, name, avatar_url, google_id, role)
    VALUES (${email}, ${name}, ${avatarUrl}, ${googleId}, 'buyer')
    RETURNING *
  `)

  return rows[0]
}
