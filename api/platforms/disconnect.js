import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)
    const { platform } = req.query

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' })
    }

    await sql`
      DELETE FROM platform_connections
      WHERE user_id = ${user.id} AND platform = ${platform}
    `

    res.json({ success: true, message: `${platform} disconnected` })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Platform disconnect error:', err)
    res.status(500).json({ error: 'Failed to disconnect' })
  }
}
