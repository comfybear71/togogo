// Diagnostic endpoint — check which supplier API keys are configured
// GET: returns which supplier env vars exist (not their values)
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await requireAuth(req)

    const suppliers = {
      cj_dropshipping: {
        configured: !!process.env.CJ_DROPSHIPPING_API_KEY,
        env_var: 'CJ_DROPSHIPPING_API_KEY',
      },
      printful: {
        configured: !!process.env.PRINTFUL_API_KEY,
        env_var: 'PRINTFUL_API_KEY',
      },
      printify: {
        configured: !!process.env.PRINTIFY_API_KEY,
        env_var: 'PRINTIFY_API_KEY',
      },
      gooten: {
        configured: !!(process.env.GOOTEN_RECIPE_ID && process.env.GOOTEN_PARTNER_BILLING_KEY),
        env_vars: ['GOOTEN_RECIPE_ID', 'GOOTEN_PARTNER_BILLING_KEY'],
      },
      aliexpress: {
        configured: !!(process.env.ALIEXPRESS_APP_KEY && process.env.ALIEXPRESS_APP_SECRET),
        env_vars: ['ALIEXPRESS_APP_KEY', 'ALIEXPRESS_APP_SECRET'],
      },
    }

    const configured = Object.entries(suppliers).filter(([, v]) => v.configured).map(([k]) => k)
    const missing = Object.entries(suppliers).filter(([, v]) => !v.configured).map(([k, v]) => ({
      supplier: k,
      needs: v.env_var || v.env_vars,
    }))

    return res.json({
      configured,
      missing,
      suppliers,
    })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: 'Failed to check config' })
  }
}
