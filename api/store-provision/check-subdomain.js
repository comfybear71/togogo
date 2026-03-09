import { sql } from '../_lib/db.js'

// Check if a subdomain is available
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const subdomain = (req.query.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (!subdomain || subdomain.length < 2) {
    return res.json({ available: false, reason: 'Too short (min 2 characters)' })
  }

  const reserved = ['www', 'api', 'app', 'admin', 'mail', 'ftp', 'test', 'staging', 'dev']
  if (reserved.includes(subdomain)) {
    return res.json({ available: false, reason: 'This name is reserved' })
  }

  try {
    const { rows } = await sql`
      SELECT id FROM user_stores WHERE subdomain = ${subdomain} AND status != 'deleted'
    `

    return res.json({
      available: rows.length === 0,
      subdomain,
      domain: `${subdomain}.togogo.me`,
      reason: rows.length > 0 ? 'Already taken' : null,
    })
  } catch {
    // If table doesn't exist yet, subdomain is available
    return res.json({ available: true, subdomain, domain: `${subdomain}.togogo.me` })
  }
}
