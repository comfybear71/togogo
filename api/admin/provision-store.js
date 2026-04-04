// Admin endpoint to manually provision a store + subscription for a user
// Used when a client has paid but store creation failed
import { sql, ensureSchema } from '../_lib/db.js'
import { getCurrentUser } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
  const setupSecret = req.headers["x-setup-secret"] || req.query.secret
  if (setupSecret && setupSecret === process.env.JWT_SECRET) { /* OK */ } else {
    const tokenUser = await getCurrentUser(req)
    if (!tokenUser) return res.status(401).json({ error: "Authentication required" })
    const { rows: roleRows } = await sql`SELECT role FROM users WHERE id = ${tokenUser.id}`
    if (!roleRows[0] || roleRows[0].role !== "admin") return res.status(403).json({ error: "Admin access required" })
  }
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication failed' })
  }

  try {
    await ensureSchema()
    const { userId, email, userName, subdomain, storeName, pricePerMonth } = req.body

    if (!subdomain) {
      return res.status(400).json({ error: 'subdomain is required' })
    }
    if (!userId && !email) {
      return res.status(400).json({ error: 'Either userId or email is required' })
    }

    // Sanitize subdomain
    const clean = subdomain
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (!clean || clean.length < 2 || clean.length > 63) {
      return res.status(400).json({ error: 'Subdomain must be 2-63 characters' })
    }

    const fullDomain = `${clean}.togogo.me`
    const name = storeName || `${clean}'s Store`
    const price = parseFloat(pricePerMonth) || 19.99

    let userRows
    if (userId) {
      // Look up by ID
      const result = await sql`SELECT id, email, name FROM users WHERE id = ${userId}`
      userRows = result.rows
    } else {
      // Look up by email, create if not found
      const result = await sql`SELECT id, email, name FROM users WHERE email = ${email.toLowerCase().trim()}`
      userRows = result.rows
      if (!userRows[0]) {
        // Auto-create user with provided email
        const newName = userName || email.split('@')[0]
        const created = await sql`
          INSERT INTO users (email, name, role)
          VALUES (${email.toLowerCase().trim()}, ${newName}, 'subscriber')
          RETURNING id, email, name
        `
        userRows = created.rows
      }
    }
    if (!userRows[0]) {
      return res.status(404).json({ error: 'User not found' })
    }
    const resolvedUserId = userRows[0].id

    // Create or update the store
    await sql`
      INSERT INTO user_stores (user_id, subdomain, full_domain, store_name, status, provision_data)
      VALUES (${resolvedUserId}, ${clean}, ${fullDomain}, ${name}, 'active',
              ${JSON.stringify({ admin_provisioned: true, provisioned_at: new Date().toISOString() })})
      ON CONFLICT (user_id) DO UPDATE
      SET subdomain = ${clean}, full_domain = ${fullDomain}, store_name = ${name},
          status = 'active', updated_at = NOW()
    `

    // Create subscription record if one doesn't exist
    const { rows: existingSub } = await sql`
      SELECT id FROM subscriptions WHERE user_id = ${resolvedUserId} AND status IN ('active', 'past_due')
    `
    if (existingSub.length === 0) {
      await sql`
        INSERT INTO subscriptions (user_id, plan, status, price_per_month, started_at, expires_at)
        VALUES (${resolvedUserId}, 'premium', 'active', ${price}, NOW(), NOW() + INTERVAL '1 month')
      `
    }

    // Upgrade user role to subscriber
    await sql`
      UPDATE users SET role = CASE
        WHEN role = 'buyer' THEN 'subscriber'
        WHEN role = 'both' THEN 'both'
        ELSE role
      END, updated_at = NOW()
      WHERE id = ${resolvedUserId}
    `

    // Try to register subdomain on Vercel
    let vercelResult = null
    const vercelToken = process.env.VERCEL_TOKEN
    const vercelProjectId = process.env.VERCEL_PROJECT_ID

    if (vercelToken && vercelProjectId) {
      try {
        // Get team ID
        let teamParam = ''
        const projRes = await fetch(`https://api.vercel.com/v9/projects/${vercelProjectId}`, {
          headers: { Authorization: `Bearer ${vercelToken}` },
        })
        const projData = await projRes.json()
        const teamId = projData.teamId || projData.team?.id
        if (teamId) teamParam = `?teamId=${teamId}`

        // Check for wildcard
        const listRes = await fetch(
          `https://api.vercel.com/v9/projects/${vercelProjectId}/domains${teamParam}`,
          { headers: { Authorization: `Bearer ${vercelToken}` } }
        )
        const listData = await listRes.json()
        const hasWildcard = listData.domains?.some(d => d.name === '*.togogo.me')

        if (hasWildcard) {
          vercelResult = { wildcard: true, message: 'Covered by *.togogo.me wildcard' }
        } else {
          // Add individual subdomain
          const addRes = await fetch(
            `https://api.vercel.com/v10/projects/${vercelProjectId}/domains${teamParam}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${vercelToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: fullDomain }),
            }
          )
          vercelResult = await addRes.json()
        }

        // Update store with Vercel info
        const domainId = vercelResult?.wildcard ? 'wildcard' : (vercelResult?.id || 'added')
        await sql`
          UPDATE user_stores SET vercel_domain_id = ${domainId}
          WHERE user_id = ${resolvedUserId} AND subdomain = ${clean}
        `.catch(() => {})
      } catch (err) {
        vercelResult = { error: err.message }
      }
    }

    return res.json({
      success: true,
      store: {
        subdomain: clean,
        domain: fullDomain,
        url: `https://${fullDomain}`,
        status: 'active',
      },
      subscription: {
        plan: 'premium',
        pricePerMonth: price,
        status: 'active',
      },
      user: {
        id: userRows[0].id,
        email: userRows[0].email,
        name: userRows[0].name,
      },
      vercel: vercelResult,
    })
  } catch (err) {
    console.error('Admin provision store error:', err)
    return res.status(500).json({ error: 'Failed to provision store: ' + err.message })
  }
}
