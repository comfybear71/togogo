import { sql, ensureSchema } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

// Creates a subdomain like storename.togogo.me using Vercel's API
// Vercel API docs: POST /v10/projects/{projectId}/domains
const VERCEL_API = 'https://api.vercel.com'

// Cache team ID to avoid repeated lookups
let cachedTeamId = undefined

async function getTeamId(token, projectId) {
  if (cachedTeamId !== undefined) return cachedTeamId
  try {
    const res = await fetch(`${VERCEL_API}/v9/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    cachedTeamId = data.teamId || data.team?.id || null
    return cachedTeamId
  } catch {
    cachedTeamId = null
    return null
  }
}

async function hasWildcardDomain(token, projectId, teamParam) {
  try {
    const res = await fetch(
      `${VERCEL_API}/v9/projects/${projectId}/domains${teamParam}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    return data.domains?.some(d => d.name === '*.togogo.me') || false
  } catch {
    return false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await ensureSchema()
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
      // No Vercel tokens — store in DB only (subdomain will work once wildcard is configured)
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
        note: 'VERCEL_TOKEN/VERCEL_PROJECT_ID not set — subdomain stored in DB but not registered on Vercel',
      })
    }

    // Get team ID for Pro/Team Vercel accounts
    const teamId = await getTeamId(vercelToken, vercelProjectId)
    const teamParam = teamId ? `?teamId=${teamId}` : ''

    // Check if wildcard *.togogo.me is already configured
    const wildcardExists = await hasWildcardDomain(vercelToken, vercelProjectId, teamParam)

    let vercelResult = null

    if (wildcardExists) {
      // Wildcard handles all subdomains — no individual domain needed
      vercelResult = { wildcard: true, message: 'Covered by *.togogo.me wildcard' }
    } else {
      // Add individual subdomain to Vercel project
      const addDomainRes = await fetch(
        `${VERCEL_API}/v10/projects/${vercelProjectId}/domains${teamParam}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: fullDomain }),
        }
      )

      const domainData = await addDomainRes.json()

      if (!addDomainRes.ok) {
        // domain_already_in_use means it exists on this project — that's fine
        // Also handle 'domain_already_exists' variant
        const errCode = domainData.error?.code || ''
        if (!errCode.includes('already')) {
          console.error(`Vercel domain add failed for ${fullDomain}:`, domainData)

          // Try adding wildcard as fallback
          console.log('Attempting wildcard *.togogo.me as fallback...')
          const wcRes = await fetch(
            `${VERCEL_API}/v10/projects/${vercelProjectId}/domains${teamParam}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${vercelToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: '*.togogo.me' }),
            }
          )
          const wcData = await wcRes.json()
          if (wcRes.ok || (wcData.error?.code || '').includes('already')) {
            vercelResult = { wildcard: true, message: 'Wildcard *.togogo.me added as fallback' }
          } else {
            // Store in DB anyway — the subdomain will work once DNS is configured
            console.error('Wildcard fallback also failed:', wcData)
            vercelResult = {
              error: domainData.error?.message || 'Vercel API error',
              fallbackError: wcData.error?.message,
            }
          }
        } else {
          vercelResult = { ...domainData, alreadyExists: true }
        }
      } else {
        vercelResult = domainData
      }
    }

    // Store in database regardless — the store entry is needed for the storefront API
    await sql`
      INSERT INTO user_stores (user_id, subdomain, full_domain, status, vercel_domain_id)
      VALUES (${user.id}, ${clean}, ${fullDomain}, 'active', ${vercelResult?.id || (vercelResult?.wildcard ? 'wildcard' : null)})
      ON CONFLICT (user_id) DO UPDATE
      SET subdomain = ${clean}, full_domain = ${fullDomain}, status = 'active',
          vercel_domain_id = ${vercelResult?.id || (vercelResult?.wildcard ? 'wildcard' : null)}, updated_at = NOW()
    `

    return res.json({
      success: true,
      subdomain: clean,
      domain: fullDomain,
      url: `https://${fullDomain}`,
      vercel_configured: !vercelResult?.error,
      vercel: vercelResult,
    })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Create subdomain error:', err)
    res.status(500).json({ error: 'Failed to create subdomain' })
  }
}
