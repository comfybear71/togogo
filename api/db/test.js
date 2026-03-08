import { sql } from '../_lib/db.js'
import { hashPassword, generateToken } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    const steps = {}

    // Test 1: bcryptjs hash
    const hash = await hashPassword('TestPass123!')
    steps.hash = { success: true, hash: hash.slice(0, 20) + '...' }

    // Test 2: DB insert with real hash
    const testEmail = 'test-debug@test.com'
    const { rows } = await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${testEmail}, ${hash}, ${'Debug User'}, 'buyer')
      RETURNING id, email, name, role
    `
    steps.insert = { success: true, user: rows[0] }

    // Test 3: JWT token generation
    const token = generateToken(rows[0])
    steps.token = { success: true, token: token.slice(0, 30) + '...' }

    // Cleanup
    await sql`DELETE FROM users WHERE email = ${testEmail}`

    return res.status(200).json({ success: true, steps })
  } catch (error) {
    return res.status(500).json({ 
      error: error.message, 
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5)
    })
  }
}
