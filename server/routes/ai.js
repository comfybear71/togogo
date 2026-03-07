import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Helper to call Claude API
async function callClaude(systemPrompt, userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('Claude API key not configured')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${err}`)
  }

  const data = await response.json()
  return data.content[0].text
}

// AI listing assistant - suggest title, description, category
router.post('/listing-assist', requireAuth, async (req, res, next) => {
  try {
    const { imageDescription, category } = req.body

    const result = await callClaude(
      'You are a marketplace listing assistant. Generate compelling product titles and descriptions that maximise sales. Be concise and friendly. Return JSON with keys: title, description, suggestedCategory, suggestedPrice.',
      `Create a product listing based on this: ${imageDescription}. Category hint: ${category || 'auto-detect'}. Return valid JSON only.`
    )

    res.json({ suggestion: JSON.parse(result) })
  } catch (err) {
    next(err)
  }
})

// AI listing optimiser - rewrite for better conversion
router.post('/optimise-listing', requireAuth, async (req, res, next) => {
  try {
    const { title, description } = req.body

    const result = await callClaude(
      'You are a marketplace listing optimiser. Rewrite product titles and descriptions to maximise conversion. Include search keywords. Write at a reading level suitable for all ages. Make it compelling. Return JSON with keys: title, description.',
      `Optimise this listing:\nTitle: ${title}\nDescription: ${description}\n\nReturn valid JSON only.`
    )

    res.json({ optimised: JSON.parse(result) })
  } catch (err) {
    next(err)
  }
})

// AI niche analyser
router.post('/niche-analysis', requireAuth, async (req, res, next) => {
  try {
    const { productIdea } = req.body

    const result = await callClaude(
      'You are a dropshipping product research expert. Analyse product ideas for marketplace potential. Return JSON with keys: score (1-10), demand (low/medium/high), competition (low/medium/high), profitPotential (low/medium/high), seasonalTrends (string), recommendation (string), risks (array of strings).',
      `Analyse this product idea for dropshipping: "${productIdea}". Consider demand, competition, profit margins, and seasonal trends. Return valid JSON only.`
    )

    res.json({ analysis: JSON.parse(result) })
  } catch (err) {
    next(err)
  }
})

// AI content moderation
router.post('/moderate', requireAuth, async (req, res, next) => {
  try {
    const { title, description } = req.body

    const result = await callClaude(
      'You are a content moderator for a marketplace. Check if product listings contain prohibited items (weapons, drugs, counterfeit goods, adult content, stolen property). Return JSON with keys: approved (boolean), reason (string or null), confidence (0-1).',
      `Moderate this listing:\nTitle: ${title}\nDescription: ${description}\n\nReturn valid JSON only.`
    )

    res.json({ moderation: JSON.parse(result) })
  } catch (err) {
    next(err)
  }
})

// AI report classifier
router.post('/classify-report', requireAuth, async (req, res, next) => {
  try {
    const { reportContent, reportedContent } = req.body

    const result = await callClaude(
      'You are a marketplace abuse report classifier. Categorise reports and assess severity. Return JSON with keys: category (spam/fraud/prohibited_item/harassment/counterfeit/other), severity (low/medium/high/critical), suggestedAction (warn/remove/ban/review), summary (string).',
      `Classify this report:\nReport: ${reportContent}\nReported content: ${reportedContent}\n\nReturn valid JSON only.`
    )

    res.json({ classification: JSON.parse(result) })
  } catch (err) {
    next(err)
  }
})

export default router
