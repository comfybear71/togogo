import { sql } from '../_lib/db.js'
import { requireAdminLite } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    await requireAdminLite(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  try {
    if (req.method === 'GET') {
      const { search, status } = req.query

      // Get all stores with owner info
      let storesQuery
      if (search && status && status !== 'all') {
        storesQuery = await sql`
          SELECT s.*, u.name as owner_name, u.email as owner_email
          FROM user_stores s
          LEFT JOIN users u ON s.user_id = u.id
          WHERE (s.subdomain ILIKE ${'%' + search + '%'} OR s.full_domain ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'})
            AND s.status = ${status}
          ORDER BY s.created_at DESC
        `
      } else if (search) {
        storesQuery = await sql`
          SELECT s.*, u.name as owner_name, u.email as owner_email
          FROM user_stores s
          LEFT JOIN users u ON s.user_id = u.id
          WHERE s.subdomain ILIKE ${'%' + search + '%'} OR s.full_domain ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'}
          ORDER BY s.created_at DESC
        `
      } else if (status && status !== 'all') {
        storesQuery = await sql`
          SELECT s.*, u.name as owner_name, u.email as owner_email
          FROM user_stores s
          LEFT JOIN users u ON s.user_id = u.id
          WHERE s.status = ${status}
          ORDER BY s.created_at DESC
        `
      } else {
        storesQuery = await sql`
          SELECT s.*, u.name as owner_name, u.email as owner_email
          FROM user_stores s
          LEFT JOIN users u ON s.user_id = u.id
          ORDER BY s.created_at DESC
        `
      }

      // Get all purchased domains with owner info
      let domainsQuery
      if (search) {
        domainsQuery = await sql`
          SELECT d.*, u.name as owner_name, u.email as owner_email
          FROM user_domains d
          LEFT JOIN users u ON d.user_id = u.id
          WHERE d.domain ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'}
          ORDER BY d.created_at DESC
        `
      } else {
        domainsQuery = await sql`
          SELECT d.*, u.name as owner_name, u.email as owner_email
          FROM user_domains d
          LEFT JOIN users u ON d.user_id = u.id
          ORDER BY d.created_at DESC
        `
      }

      // Get counts by status
      const { rows: statusCounts } = await sql`
        SELECT status, COUNT(*)::int as count FROM user_stores GROUP BY status
      `

      return res.json({
        stores: storesQuery.rows,
        domains: domainsQuery.rows,
        statusCounts: statusCounts.reduce((acc, r) => ({ ...acc, [r.status]: r.count }), {}),
      })
    }

    if (req.method === 'PATCH') {
      // Admin-only partial update of a store. Currently used for markup_percent
      // so admins can tune per-store pricing during testing. Safely ignores any
      // field not on the allowlist.
      const { storeId, markup_percent } = req.body || {}
      if (!storeId) return res.status(400).json({ error: 'storeId required' })

      const updates = []
      if (markup_percent !== undefined) {
        const mp = parseFloat(markup_percent)
        if (!Number.isFinite(mp) || mp < 0 || mp > 500) {
          return res.status(400).json({ error: 'markup_percent must be between 0 and 500' })
        }
        // Run the update explicitly — tagged template arrays don't let us
        // compose a dynamic SET list cleanly, so one statement per allowed
        // field keeps behaviour predictable.
        await sql`UPDATE user_stores SET markup_percent = ${mp}, updated_at = NOW() WHERE id = ${storeId}`
        updates.push({ field: 'markup_percent', value: mp })
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updatable fields provided' })
      }

      const { rows } = await sql`
        SELECT id, subdomain, store_name, markup_percent
        FROM user_stores WHERE id = ${storeId} LIMIT 1
      `
      return res.json({ success: true, updates, store: rows[0] || null })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Admin stores error:', err)
    res.status(500).json({ error: 'Failed to fetch stores data' })
  }
}
