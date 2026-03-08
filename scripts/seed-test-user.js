// Seed a test user into Vercel Postgres
// Usage: node scripts/seed-test-user.js
//
// Requires POSTGRES_URL environment variable to be set.
// Creates a test user with email: test@togogo.com / password: test1234

import { sql } from '@vercel/postgres'
import bcrypt from 'bcryptjs'

const TEST_USER = {
  email: 'test@togogo.com',
  password: 'test1234',
  name: 'Test User',
  role: 'both', // can buy and sell
}

async function seed() {
  console.log('Seeding test user...')

  // Hash password
  const passwordHash = await bcrypt.hash(TEST_USER.password, 12)

  // Upsert user (skip if already exists)
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
  console.log('Test user ready:', user)
  console.log('')
  console.log('Login credentials:')
  console.log(`  Email:    ${TEST_USER.email}`)
  console.log(`  Password: ${TEST_USER.password}`)

  // Also create a free subscription if none exists
  await sql`
    INSERT INTO subscriptions (user_id, plan, status)
    VALUES (${user.id}, 'free', 'active')
    ON CONFLICT DO NOTHING
  `
  console.log('  Subscription: free (active)')
}

seed()
  .then(() => { console.log('\nDone!'); process.exit(0) })
  .catch((err) => { console.error('Seed failed:', err.message); process.exit(1) })
