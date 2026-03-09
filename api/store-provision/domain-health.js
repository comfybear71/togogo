// Domain health check — verifies Vercel domain configuration and DNS resolution
// GET /api/store-provision/domain-health
// GET /api/store-provision/domain-health?subdomain=clientname
const VERCEL_API = 'https://api.vercel.com'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const vercelToken = process.env.VERCEL_TOKEN
  const vercelProjectId = process.env.VERCEL_PROJECT_ID
  const { subdomain } = req.query

  const health = {
    timestamp: new Date().toISOString(),
    vercelTokenSet: !!vercelToken,
    vercelProjectIdSet: !!vercelProjectId,
    domains: [],
    wildcardConfigured: false,
    baseDomainConfigured: false,
    subdomainCheck: null,
  }

  if (!vercelToken || !vercelProjectId) {
    return res.json({
      ...health,
      status: 'error',
      message: 'VERCEL_TOKEN and/or VERCEL_PROJECT_ID not configured in environment variables',
      fix: 'Add VERCEL_TOKEN and VERCEL_PROJECT_ID to your Vercel project environment variables',
    })
  }

  try {
    // Get team ID
    let teamParam = ''
    try {
      const projRes = await fetch(`${VERCEL_API}/v9/projects/${vercelProjectId}`, {
        headers: { Authorization: `Bearer ${vercelToken}` },
      })
      const projData = await projRes.json()
      const teamId = projData.teamId || projData.team?.id
      if (teamId) teamParam = `?teamId=${teamId}`
      health.projectName = projData.name
      health.teamId = teamId
    } catch (e) {
      health.teamIdError = e.message
    }

    // List all domains on the project
    const listRes = await fetch(
      `${VERCEL_API}/v9/projects/${vercelProjectId}/domains${teamParam}`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    )
    const listData = await listRes.json()
    health.domains = (listData.domains || []).map(d => ({
      name: d.name,
      verified: d.verified,
      configured: d.configured !== false,
      gitBranch: d.gitBranch || null,
    }))

    health.wildcardConfigured = health.domains.some(d => d.name === '*.togogo.me')
    health.baseDomainConfigured = health.domains.some(d => d.name === 'togogo.me')

    // If a specific subdomain was requested, check it
    if (subdomain) {
      const fullDomain = `${subdomain}.togogo.me`
      const domainInVercel = health.domains.some(d => d.name === fullDomain)

      // Check DNS resolution
      let dnsResolved = false
      try {
        const dnsRes = await fetch(`https://dns.google/resolve?name=${fullDomain}&type=A`)
        const dnsData = await dnsRes.json()
        dnsResolved = dnsData.Status === 0 // NOERROR means it resolves
      } catch {
        dnsResolved = false
      }

      health.subdomainCheck = {
        subdomain,
        fullDomain,
        registeredInVercel: domainInVercel || health.wildcardConfigured,
        dnsResolves: dnsResolved,
        coveredByWildcard: health.wildcardConfigured,
        url: `https://${fullDomain}`,
        status: (domainInVercel || health.wildcardConfigured) && dnsResolved ? 'healthy' : 'issue',
      }
    }

    // Determine overall status
    const issues = []
    if (!health.baseDomainConfigured) issues.push('Base domain togogo.me not configured on Vercel')
    if (!health.wildcardConfigured) issues.push('Wildcard *.togogo.me not configured — subdomains must be added individually')
    if (health.subdomainCheck?.status === 'issue') issues.push(`Subdomain ${subdomain}.togogo.me has issues`)

    health.status = issues.length === 0 ? 'healthy' : 'issues'
    health.issues = issues
    health.message = issues.length === 0
      ? 'All domain configuration looks good!'
      : `Found ${issues.length} issue(s): ${issues.join('; ')}`

    if (!health.wildcardConfigured) {
      health.fix = 'POST to /api/store-provision/setup-wildcard to configure *.togogo.me wildcard domain'
    }

    return res.json(health)
  } catch (err) {
    console.error('Domain health check error:', err)
    return res.status(500).json({ ...health, status: 'error', error: err.message })
  }
}
