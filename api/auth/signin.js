import { sql, ensureSchema } from '../_lib/db.js'
import { comparePassword, generateToken } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  await ensureSchema()

  try {
    const { email, password } = req.body || {}

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Find user
    const { rows } = await sql`
      SELECT id, email, name, avatar_url, role, password_hash, google_id
      FROM users WHERE email = ${email.toLowerCase().trim()}
    `

    const user = rows[0]
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // If user signed up with Google only (no password)
    if (!user.password_hash && user.google_id) {
      return res.status(401).json({ error: 'This account uses Google sign-in. Please sign in with Google.' })
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Verify password
    const isValid = await comparePassword(password, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = generateToken(user)

    return res.status(200).json({
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
    console.error('Signin error:', error)
    return res.status(500).json({ error: 'Failed to sign in' })
  }
}
