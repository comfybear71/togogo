// Admin endpoint — manually initialize/migrate the database schema.
//
// Why this exists: ensureSchema() used to run on every request handler,
// which added ~500ms–2s to every cold start (35 CREATE TABLE + 30 ALTER
// TABLE statements). It's been removed from hot-path handlers; tables are
// created once on first deploy and migrations extend the schema.
//
// Hit this endpoint after:
//   1. The very first deploy of ToGoGo against a fresh database
//   2. Any code change that adds a new table or column (i.e. any change
//      to initializeSchema() in api/_lib/db.js)
//
// Safe to call repeatedly — every statement uses IF NOT EXISTS / idempotent.
//
// Auth: admin-only (requireAdminLite) OR ?secret=JWT_SECRET for first-run
// bootstrap when no admin user exists yet.
import { initializeSchema } from '../_lib/db.js'
import { requireAdminLite } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    await requireAdminLite(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  const startedAt = Date.now()
  try {
    await initializeSchema()
    const durationMs = Date.now() - startedAt
    return res.json({
      success: true,
      durationMs,
      message: 'Schema is up to date. Safe to call again after future migrations.',
    })
  } catch (err) {
    console.error('[init-schema] failed:', err)
    return res.status(500).json({
      success: false,
      error: err.message,
      durationMs: Date.now() - startedAt,
    })
  }
}
