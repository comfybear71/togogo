import { sql } from './_lib/db.js'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  const TEST_USER = {
    email: 'test@togogo.com',
    password: 'test1234',
    name: 'Test User',
    role: 'both',
  }

  try {
    const passwordHash = await bcrypt.hash(TEST_USER.password, 12)

    const { rows } = await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${TEST_USER.email}, ${passwordHash}, ${TEST_USER.name}, ${TEST_USER.role})
      ON CONFLICT (email) DO UPDATE SET
        password_hash = ${passwordHash},
        name = ${TEST_USER.name},
        role = ${TEST_USER.role},
        updated_at = NOW()
      RETURNING id, email, name, role
    `

    const user = rows[0]

    // Ensure free subscription exists
    await sql`
      INSERT INTO subscriptions (user_id, plan, status)
      VALUES (${user.id}, 'free', 'active')
      ON CONFLICT DO NOTHING
    `

    return res.status(200).json({
      message: 'Test user created successfully!',
      user,
      credentials: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return res.status(500).json({ error: error.message })
  }
}
