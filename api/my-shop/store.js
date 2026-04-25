// User's own store info API — returns (and updates) the authenticated
// user's store details. Scoped to the logged-in user; ownership enforced
// inline via WHERE user_id = user.id.
//
// GET    /api/my-shop/store          → returns the caller's store
// PATCH  /api/my-shop/store          → updates store name / markup / theme
import { sql } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

// Allowed theme IDs — keep in sync with src/lib/storefrontThemes.js.
// Defined here rather than shared because server and client use
// different module systems (plain ESM vs Vite bundled), and the list
// is short + stable.
const ALLOWED_THEMES = new Set(['sunset', 'midnight', 'forest', 'lavender', 'coral'])

export default async function handler(req, res) {
  let user
  try {
    user = await requireAuth(req)
  } catch (err) {
    return res.status(err?.status || 401).json({ error: err?.message || 'Authentication required' })
  }

  if (req.method === 'GET') {
    try {
      // Self-heal niches[] from the user's actual product tags before
      // returning store info. Pre-v1.12.1, AI Builder overwrote
      // user_stores.niche on each run so the previous niche pointer
      // was lost and the storefront filter hid products tagged with
      // it. Rebuild the array from product tags + the legacy niche +
      // whatever's already there. Idempotent — same array out for
      // unchanged inputs. Failures are logged but never block the
      // dashboard from rendering.
      try {
        await sql`
          UPDATE user_stores s
          SET niches = ARRAY(
            SELECT DISTINCT n FROM (
              SELECT UNNEST(COALESCE(s.niches, ARRAY[]::TEXT[])) AS n
              UNION
              SELECT s.niche WHERE s.niche IS NOT NULL AND s.niche != ''
              UNION
              SELECT UNNEST(p.niches)
              FROM user_products p
              WHERE p.user_id = s.user_id
                AND p.niches IS NOT NULL
                AND cardinality(p.niches) > 0
            ) all_niches
            WHERE n IS NOT NULL AND n != ''
          )
          WHERE s.user_id = ${user.id}
        `
      } catch (healErr) {
        console.error('[my-shop/store] niches heal skipped:', healErr?.message || healErr)
      }

      const [storeResult, subResult] = await Promise.all([
        sql`
          SELECT id, subdomain, full_domain, store_name, status, tier, theme_id,
                 markup_percent, stripe_connect_status, stripe_connect_id,
                 created_at, updated_at
          FROM user_stores
          WHERE user_id = ${user.id}
          LIMIT 1
        `,
        // Most recent subscription for this user. We pick the freshest row
        // ordered by created_at so a cancelled-then-resubscribed user gets
        // their current state, not a stale 'cancelled' from months ago.
        sql`
          SELECT status, stripe_subscription_id, expires_at
          FROM subscriptions
          WHERE user_id = ${user.id}
          ORDER BY created_at DESC
          LIMIT 1
        `.catch(() => ({ rows: [] })),
      ])

      if (!storeResult.rows[0]) return res.json({ store: null, subscription: null })

      const subRow = subResult.rows[0] || null
      // Shape the subscription block so the frontend has everything it
      // needs to decide whether to show a "complete payment" prompt
      // without making another round trip.
      const subscription = subRow
        ? { status: subRow.status, expiresAt: subRow.expires_at }
        : { status: 'missing', expiresAt: null }

      return res.json({ store: storeResult.rows[0], subscription })
    } catch (err) {
      console.error('My store GET error:', err)
      return res.json({ store: null, subscription: null })
    }
  }

  if (req.method === 'PATCH') {
    // Accept a subset of editable fields. Reject unknown keys silently;
    // we'd rather ignore than return 400 and break the UI.
    const { store_name, markup_percent, theme_id } = req.body || {}

    // Validate each field that's present. Missing fields aren't an error.
    if (store_name !== undefined) {
      if (typeof store_name !== 'string' || !store_name.trim() || store_name.length > 100) {
        return res.status(400).json({ error: 'store_name must be 1-100 characters' })
      }
    }
    if (markup_percent !== undefined) {
      const mp = parseFloat(markup_percent)
      if (!Number.isFinite(mp) || mp < 0 || mp > 500) {
        return res.status(400).json({ error: 'markup_percent must be a number between 0 and 500' })
      }
    }
    if (theme_id !== undefined) {
      if (typeof theme_id !== 'string' || !ALLOWED_THEMES.has(theme_id)) {
        return res.status(400).json({
          error: `theme_id must be one of: ${[...ALLOWED_THEMES].join(', ')}`,
        })
      }
    }

    // Run a single UPDATE with COALESCE so only provided fields change.
    // WHERE user_id = ${user.id} is our ownership guard — if the caller
    // doesn't own a store, rowCount is 0 and we return 404.
    try {
      const result = await sql`
        UPDATE user_stores
        SET store_name     = COALESCE(${store_name ?? null}, store_name),
            markup_percent = COALESCE(${markup_percent ?? null}::numeric, markup_percent),
            theme_id       = COALESCE(${theme_id ?? null}, theme_id),
            updated_at     = NOW()
        WHERE user_id = ${user.id}
      `
      if (!result.rowCount) {
        return res.status(404).json({ error: 'No store found for your account' })
      }

      const { rows } = await sql`
        SELECT id, subdomain, full_domain, store_name, status, tier, theme_id,
               markup_percent, stripe_connect_status, stripe_connect_id,
               created_at, updated_at
        FROM user_stores
        WHERE user_id = ${user.id}
        LIMIT 1
      `
      return res.json({ success: true, store: rows[0] || null })
    } catch (err) {
      console.error('My store PATCH error:', err)
      return res.status(500).json({ error: 'Failed to update store' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
