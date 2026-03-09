import { sql } from '../_lib/db.js'

// One-time setup: adds *.togogo.me wildcard domain to the Vercel project
// This means ALL subdomains (clientname.togogo.me) automatically resolve
// without needing to add each one individually via the API
const VERCEL_API = 'https://api.vercel.com'

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const vercelToken = process.env.VERCEL_TOKEN
  const vercelProjectId = process.env.VERCEL_PROJECT_ID

  if (!vercelToken || !vercelProjectId) {
    return res.status(500).json({
      error: 'VERCEL_TOKEN and VERCEL_PROJECT_ID must be set in environment variables',
    })
  }

  try {
    // First, get the project info to find the teamId
    const teamId = await getTeamId(vercelToken, vercelProjectId)
    const teamParam = teamId ? `?teamId=${teamId}` : ''

    if (req.method === 'GET') {
      // Check current domain configuration
      return await checkDomainStatus(res, vercelToken, vercelProjectId, teamParam)
    }

    // POST: Set up wildcard domain
    const results = {
      wildcard: null,
      baseDomain: null,
      existingDomains: [],
    }

    // 1. List existing domains on the project
    const listRes = await fetch(
      `${VERCEL_API}/v9/projects/${vercelProjectId}/domains${teamParam}`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    )
    const listData = await listRes.json()
    results.existingDomains = listData.domains?.map(d => d.name) || []

    // 2. Add the base domain togogo.me if not already added
    if (!results.existingDomains.includes('togogo.me')) {
      const baseRes = await fetch(
        `${VERCEL_API}/v10/projects/${vercelProjectId}/domains${teamParam}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'togogo.me' }),
        }
      )
      const baseData = await baseRes.json()
      results.baseDomain = {
        success: baseRes.ok || baseData.error?.code === 'domain_already_in_use',
        status: baseRes.status,
        data: baseData,
      }
    } else {
      results.baseDomain = { success: true, status: 200, data: { message: 'Already configured' } }
    }

    // 3. Add the wildcard domain *.togogo.me
    const wildcardRes = await fetch(
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
    const wildcardData = await wildcardRes.json()
    results.wildcard = {
      success: wildcardRes.ok || wildcardData.error?.code === 'domain_already_in_use',
      status: wildcardRes.status,
      data: wildcardData,
    }

    // 4. Also add www.togogo.me redirect if missing
    if (!results.existingDomains.includes('www.togogo.me')) {
      await fetch(
        `${VERCEL_API}/v10/projects/${vercelProjectId}/domains${teamParam}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'www.togogo.me', redirect: 'togogo.me', redirectStatusCode: 308 }),
        }
      )
    }

    // Re-fetch updated domain list
    const updatedListRes = await fetch(
      `${VERCEL_API}/v9/projects/${vercelProjectId}/domains${teamParam}`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    )
    const updatedList = await updatedListRes.json()

    return res.json({
      success: results.wildcard.success && results.baseDomain.success,
      message: results.wildcard.success
        ? 'Wildcard domain *.togogo.me configured! All client subdomains will now work automatically.'
        : 'Failed to configure wildcard domain — check the error details.',
      domains: updatedList.domains?.map(d => ({
        name: d.name,
        verified: d.verified,
        configured: d.configured !== false,
      })) || [],
      details: results,
      teamId,
    })
  } catch (err) {
    console.error('Wildcard setup error:', err)
    return res.status(500).json({ error: err.message })
  }
}

async function getTeamId(token, projectId) {
  try {
    const res = await fetch(`${VERCEL_API}/v9/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    return data.teamId || data.team?.id || null
  } catch {
    return null
  }
}

async function checkDomainStatus(res, token, projectId, teamParam) {
  const listRes = await fetch(
    `${VERCEL_API}/v9/projects/${projectId}/domains${teamParam}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const listData = await listRes.json()
  const domains = listData.domains || []

  const hasWildcard = domains.some(d => d.name === '*.togogo.me')
  const hasBase = domains.some(d => d.name === 'togogo.me')

  return res.json({
    configured: hasWildcard && hasBase,
    hasWildcard,
    hasBaseDomain: hasBase,
    domains: domains.map(d => ({
      name: d.name,
      verified: d.verified,
      configured: d.configured !== false,
    })),
    message: hasWildcard
      ? 'Wildcard domain is configured — all subdomains will work automatically.'
      : 'Wildcard domain NOT configured. POST to this endpoint to set it up.',
  })
}
