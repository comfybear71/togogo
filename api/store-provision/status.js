import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

// Returns current provisioning progress for the monitoring panel
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)

    const { rows } = await sql`
      SELECT id, subdomain, full_domain, store_name, status, provision_data,
             created_at, updated_at
      FROM user_stores
      WHERE user_id = ${user.id}
      ORDER BY updated_at DESC
      LIMIT 1
    `

    if (!rows[0]) {
      return res.json({ status: 'none', store: null })
    }

    const store = rows[0]
    let provisionData = null

    try {
      provisionData = typeof store.provision_data === 'string'
        ? JSON.parse(store.provision_data)
        : store.provision_data
    } catch {
      provisionData = null
    }

    return res.json({
      status: store.status,
      store: {
        subdomain: store.subdomain,
        domain: store.full_domain,
        name: store.store_name,
        url: `https://${store.full_domain}`,
        createdAt: store.created_at,
      },
      provision: provisionData ? {
        currentStep: provisionData.currentStep || 0,
        stepsTotal: provisionData.steps?.length || 0,
        status: provisionData.status || store.status,
        completed: provisionData.completed || false,
        steps: (provisionData.steps || []).map(s => ({
          id: s.id,
          label: s.label,
          status: s.status,
        })),
      } : null,
    })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Provision status error:', err)
    res.status(500).json({ error: 'Failed to get provision status' })
  }
}
