import { sql } from '../_lib/db.js'
import { hashPassword, generateToken } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password, name } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    // Check if user already exists
    const { rows: existing } = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}
    `

    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)
    const { rows } = await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${email.toLowerCase().trim()}, ${passwordHash}, ${name || email.split('@')[0]}, 'buyer')
      RETURNING id, email, name, avatar_url, role, created_at
    `

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
    return res.status(500).json({ error: 'Failed to create account' })
  }
}
