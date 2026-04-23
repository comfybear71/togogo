// Generate a complete product catalogue plan for a niche via Claude.
//
// POST /api/store-provision/niche-plan
//   Body: { niche: 'fishing equipment' }
//   Returns: { success, niche, markdown, categories: {Cat: [...]}, allKeywords: [...] }
//
// Admin-gated via requireAdminOrSetup. Customer-facing version (auth via
// signed-in user JWT) will be added when we wire this into the signup flow.
import { requireAdminOrSetup } from '../_lib/auth.js'
import { generateNichePlan } from '../_lib/claude.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    await requireAdminOrSetup(req)
  } catch (err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Auth error' })
  }

  const { niche } = req.body || {}
  if (!niche || typeof niche !== 'string') {
    return res.status(400).json({ error: 'niche (string) required' })
  }

  const start = Date.now()
  const result = await generateNichePlan(niche)
  const durationMs = Date.now() - start

  if (!result.success) {
    return res.json({ success: false, error: result.error, durationMs, raw: result.raw })
  }

  return res.json({
    success: true,
    durationMs,
    niche: result.niche,
    markdown: result.markdown,
    categories: result.categories,
    allKeywords: result.allKeywords,
    keywordCount: result.allKeywords.length,
    categoryCount: Object.keys(result.categories).length,
  })
}
