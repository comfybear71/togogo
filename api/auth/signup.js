import { sql } from '../_lib/db.js'
import { hashPassword, generateToken } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password, name } = req.body || {}

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
    if (!user) {
      return res.status(500).json({ error: 'INSERT returned no rows' })
    }

    let token
    try {
      token = generateToken(user)
    } catch (tokenErr) {
      return res.status(500).json({ error: 'Token generation failed', details: tokenErr.message, user: { id: user.id, email: user.email, role: user.role } })
    }

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
