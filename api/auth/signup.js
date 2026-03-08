import { sql } from '../_lib/db.js'
import { hashPassword, generateToken } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // FIRST: return raw debug
  if (req.query?.debug === '1') {
    return res.status(200).json({ bodyType: typeof req.body, body: req.body, method: req.method })
  }

  try {
    // Debug: return raw body info
    const rawBodyType = typeof req.body
    const rawBodyPreview = typeof req.body === 'string' ? req.body.slice(0, 200) : JSON.stringify(req.body)?.slice(0, 200)

    // Parse body if needed
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch (parseErr) {
        return res.status(400).json({ error: 'Body parse failed', bodyType: rawBodyType, bodyPreview: rawBodyPreview, parseError: parseErr.message })
      }
    }
    const { email, password, name } = body || {}

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required', bodyType: typeof req.body, hasBody: !!req.body })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Step-by-step to find exact error
    let existing
    try {
      const result = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`
      existing = result.rows
    } catch (dbErr) {
      return res.status(500).json({ error: 'DB SELECT failed', details: dbErr.message, code: dbErr.code })
    }

    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }

    let passwordHash
    try {
      passwordHash = await hashPassword(password)
    } catch (hashErr) {
      return res.status(500).json({ error: 'Hash failed', details: hashErr.message })
    }

    let rows
    try {
      const result = await sql`
        INSERT INTO users (email, password_hash, name, role)
        VALUES (${email.toLowerCase().trim()}, ${passwordHash}, ${name || email.split('@')[0]}, 'buyer')
        RETURNING id, email, name, avatar_url, role, created_at
      `
      rows = result.rows
    } catch (insertErr) {
      return res.status(500).json({ error: 'DB INSERT failed', details: insertErr.message, code: insertErr.code })
    }

    const user = rows[0]
    const token = generateToken(user)

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        role: user.role,
      },
      token,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return res.status(500).json({ error: 'Failed to create account', details: error.message })
  }
}
