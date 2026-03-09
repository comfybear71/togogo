// One-time seed: Add Stuart French's account, store, and subscription
// Protected by setup secret — call POST /api/db/seed-client with x-setup-secret header
import { sql, ensureSchema } from '../_lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Require setup secret
  const setupSecret = req.headers['x-setup-secret']
  const jwtSecret = process.env.JWT_SECRET
  if (!setupSecret || setupSecret !== jwtSecret) {
    return res.status(401).json({ error: 'Setup secret required' })
  }

  try {
    await ensureSchema()

    // 1. Create or find Stuart French
    let { rows: existing } = await sql`
      SELECT id, email, name, role FROM users WHERE email = 'sfrench71@gmail.com'
    `

    let user
    if (existing[0]) {
      user = existing[0]
    } else {
      const { rows } = await sql`
        INSERT INTO users (email, name, role, location_country)
        VALUES ('sfrench71@gmail.com', 'Stuart French', 'subscriber', 'Australia')
        RETURNING id, email, name, role
      `
      user = rows[0]
    }

    // 2. Ensure role is subscriber
    await sql`UPDATE users SET role = 'subscriber', updated_at = NOW() WHERE id = ${user.id}`

    // 3. Create store stu.togogo.me
    await sql`
      INSERT INTO user_stores (user_id, subdomain, full_domain, store_name, status, provision_data)
      VALUES (${user.id}, 'stu', 'stu.togogo.me', 'Stuart''s Store', 'active',
              ${JSON.stringify({ admin_provisioned: true, provisioned_at: new Date().toISOString(), payment_method: 'manual', notes: 'First client - paid $19.99 AUD via Google login' })})
      ON CONFLICT (user_id) DO UPDATE
      SET subdomain = 'stu', full_domain = 'stu.togogo.me', store_name = 'Stuart''s Store',
          status = 'active', updated_at = NOW()
    `

    // 4. Create subscription - $19.99 AUD/month starting today
    const { rows: existingSub } = await sql`
      SELECT id FROM subscriptions WHERE user_id = ${user.id} AND status IN ('active', 'past_due')
    `
    if (existingSub.length === 0) {
      await sql`
        INSERT INTO subscriptions (user_id, plan, status, price_per_month, started_at, expires_at)
        VALUES (${user.id}, 'premium', 'active', 19.99, NOW(), NOW() + INTERVAL '1 month')
      `
    }

    // 5. Register subdomain on Vercel if configured
    let vercelResult = null
    const vercelToken = process.env.VERCEL_TOKEN
    const vercelProjectId = process.env.VERCEL_PROJECT_ID
    if (vercelToken && vercelProjectId) {
      try {
        let teamParam = ''
        const projRes = await fetch(`https://api.vercel.com/v9/projects/${vercelProjectId}`, {
          headers: { Authorization: `Bearer ${vercelToken}` },
        })
        const projData = await projRes.json()
        const teamId = projData.teamId || projData.team?.id
        if (teamId) teamParam = `?teamId=${teamId}`

        const listRes = await fetch(
          `https://api.vercel.com/v9/projects/${vercelProjectId}/domains${teamParam}`,
          { headers: { Authorization: `Bearer ${vercelToken}` } }
        )
        const listData = await listRes.json()
        const hasWildcard = listData.domains?.some(d => d.name === '*.togogo.me')

        if (hasWildcard) {
          vercelResult = { wildcard: true, message: 'Covered by *.togogo.me wildcard' }
        } else {
          const addRes = await fetch(
            `https://api.vercel.com/v10/projects/${vercelProjectId}/domains${teamParam}`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'stu.togogo.me' }),
            }
          )
          vercelResult = await addRes.json()
        }
      } catch (err) {
        vercelResult = { error: err.message }
      }
    }

    return res.json({
      success: true,
      user: { id: user.id, email: 'sfrench71@gmail.com', name: 'Stuart French', role: 'subscriber' },
      store: { subdomain: 'stu', domain: 'stu.togogo.me', status: 'active' },
      subscription: { plan: 'premium', pricePerMonth: 19.99, currency: 'AUD', status: 'active' },
      vercel: vercelResult,
    })
  } catch (err) {
    console.error('Seed client error:', err)
    return res.status(500).json({ error: 'Failed to seed client: ' + err.message })
  }
}
