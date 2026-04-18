import { sql, ensureSchema } from '../_lib/db.js'
import { requireAdminLite } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    await requireAdminLite(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  try {
    await ensureSchema()

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

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    console.error('Admin stores error:', err)
    res.status(500).json({ error: 'Failed to fetch stores data' })
  }
}
