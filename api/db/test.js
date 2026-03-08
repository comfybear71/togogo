import { sql } from '../_lib/db.js'

export default async function handler(req, res) {
  try {
    const testEmail = 'nobody@test.com'

    // Test 1: Simple query
    const r1 = await sql`SELECT 1 as test`

    // Test 2: Parameterized query
    const r2 = await sql`SELECT id FROM users WHERE email = ${testEmail}`

    // Test 3: INSERT
    const r3 = await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${testEmail}, ${'fakehash'}, ${'Test'}, 'buyer')
      RETURNING id, email
    `

    // Cleanup
    await sql`DELETE FROM users WHERE email = ${testEmail}`

    return res.status(200).json({
      success: true,
      select1: r1.rows,
      select2: r2.rows,
      insert: r3.rows
    })
  } catch (error) {
    return res.status(500).json({ 
      error: error.message, 
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5)
    })
  }
}
