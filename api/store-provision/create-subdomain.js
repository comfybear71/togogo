import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

// Creates a subdomain like storename.togogo.me using Vercel's API
// Vercel API docs: POST /v10/projects/{projectId}/domains
const VERCEL_API = 'https://api.vercel.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)
    const { subdomain } = req.body

    if (!subdomain) {
      return res.status(400).json({ error: 'Subdomain name is required' })
    }

    // Sanitize subdomain: lowercase, alphanumeric + hyphens only
    const clean = subdomain
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (!clean || clean.length < 2 || clean.length > 63) {
      return res.status(400).json({ error: 'Subdomain must be 2-63 characters (letters, numbers, hyphens)' })
    }

    // Reserved subdomains
    const reserved = ['www', 'api', 'app', 'admin', 'mail', 'ftp', 'test', 'staging', 'dev']
    if (reserved.includes(clean)) {
      return res.status(400).json({ error: 'This subdomain is reserved. Try another name.' })
    }

    const fullDomain = `${clean}.togogo.me`

    // Check if subdomain already taken in our DB
    const { rows: existing } = await sql`
      SELECT id FROM user_stores WHERE subdomain = ${clean} AND status != 'deleted'
    `
    if (existing.length > 0) {
      return res.status(409).json({ error: 'This subdomain is already taken. Try another name.' })
    }

    const vercelToken = process.env.VERCEL_TOKEN
    const vercelProjectId = process.env.VERCEL_PROJECT_ID

    if (!vercelToken || !vercelProjectId) {
      // Demo mode — simulate success without actual Vercel API call
      await sql`
        INSERT INTO user_stores (user_id, subdomain, full_domain, status)
        VALUES (${user.id}, ${clean}, ${fullDomain}, 'active')
        ON CONFLICT (user_id) DO UPDATE
        SET subdomain = ${clean}, full_domain = ${fullDomain}, status = 'active', updated_at = NOW()
      `
      return res.json({
        success: true,
        subdomain: clean,
        domain: fullDomain,
        url: `https://${fullDomain}`,
        vercel_configured: false,
      })
    }

    // Add domain to Vercel project
    const addDomainRes = await fetch(`${VERCEL_API}/v10/projects/${vercelProjectId}/domains`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: fullDomain }),
    })

    const domainData = await addDomainRes.json()

    if (!addDomainRes.ok) {
      // Domain might already exist on Vercel — that's OK if it's ours
      if (domainData.error?.code !== 'domain_already_in_use') {
        return res.status(400).json({
          error: domainData.error?.message || 'Failed to create subdomain on Vercel',
        })
      }
    }

    // Store in database
    await sql`
      INSERT INTO user_stores (user_id, subdomain, full_domain, status, vercel_domain_id)
      VALUES (${user.id}, ${clean}, ${fullDomain}, 'active', ${domainData.id || null})
      ON CONFLICT (user_id) DO UPDATE
      SET subdomain = ${clean}, full_domain = ${fullDomain}, status = 'active',
          vercel_domain_id = ${domainData.id || null}, updated_at = NOW()
    `

    return res.json({
      success: true,
      subdomain: clean,
      domain: fullDomain,
      url: `https://${fullDomain}`,
      vercel: domainData,
    })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Create subdomain error:', err)
    res.status(500).json({ error: 'Failed to create subdomain' })
  }
}
