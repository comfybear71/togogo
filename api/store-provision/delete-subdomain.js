import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

const VERCEL_API = 'https://api.vercel.com'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)
    const { storeId } = req.query

    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' })
    }

    // Only admin can delete any store; regular users can only delete their own
    const { rows } = await sql`SELECT * FROM user_stores WHERE id = ${storeId}`
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const store = rows[0]

    // Check permission — admin or store owner
    const { rows: userRows } = await sql`SELECT role FROM users WHERE id = ${user.id}`
    const isAdmin = userRows[0]?.role === 'admin'

    if (!isAdmin && store.user_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this store' })
    }

    const vercelToken = process.env.VERCEL_TOKEN
    const vercelProjectId = process.env.VERCEL_PROJECT_ID

    // Remove domain from Vercel if credentials available
    if (vercelToken && vercelProjectId && store.full_domain) {
      try {
        const deleteRes = await fetch(
          `${VERCEL_API}/v9/projects/${vercelProjectId}/domains/${store.full_domain}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${vercelToken}` },
          }
        )
        if (!deleteRes.ok) {
          const errData = await deleteRes.json()
          console.warn('Vercel domain delete warning:', errData.error?.message)
          // Continue even if Vercel delete fails — still mark as deleted in DB
        }
      } catch (vercelErr) {
        console.warn('Vercel API error during delete:', vercelErr.message)
      }
    }

    // Mark as deleted in database
    await sql`
      UPDATE user_stores
      SET status = 'deleted', updated_at = NOW()
      WHERE id = ${storeId}
    `

    return res.json({
      success: true,
      message: `Store ${store.full_domain} has been deleted`,
      domain: store.full_domain,
    })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Delete subdomain error:', err)
    res.status(500).json({ error: 'Failed to delete store' })
  }
}
