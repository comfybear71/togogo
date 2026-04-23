// Claude API helper — ToGoGo's only consumer of Anthropic's API.
//
// Env vars:
//   ANTHROPIC_API_KEY  — required
//
// The niche generator uses claude-opus-4-7 because it produces a much
// richer, more comprehensive product catalogue than smaller models.
// Per-call cost is acceptable since it runs once per store creation.
//
// All exported functions return { success, ...data } / { success: false, error }.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const NICHE_MODEL = 'claude-opus-4-7'

async function callClaude({ model, system, messages, maxTokens = 4000 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const body = { model, max_tokens: maxTokens, messages }
  if (system) body.system = system

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Claude API ${response.status}: ${text.slice(0, 500)}`)
  }
  let data
  try { data = JSON.parse(text) } catch {
    throw new Error(`Claude returned non-JSON: ${text.slice(0, 300)}`)
  }
  const content = data?.content?.[0]?.text
  if (!content) {
    throw new Error(`Claude returned empty content: ${JSON.stringify(data).slice(0, 300)}`)
  }
  return { content, raw: data }
}

// Extract a JSON object from Claude's response. Handles ```json fences,
// bare ``` fences, and raw top-level {...}. Logs a preview on failure.
function extractJsonBlock(text) {
  // 1. Explicit json fence
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()) } catch {}
  }
  // 2. Any code fence
  const anyFence = text.match(/```[a-z]*\s*([\s\S]*?)```/i)
  if (anyFence) {
    try { return JSON.parse(anyFence[1].trim()) } catch {}
  }
  // 3. Raw top-level object — from the first { to the matching }
  const firstBrace = text.indexOf('{')
  if (firstBrace >= 0) {
    const lastBrace = text.lastIndexOf('}')
    if (lastBrace > firstBrace) {
      try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)) } catch {}
    }
  }
  throw new Error('No JSON block found in Claude response')
}

// Build a comprehensive niche product plan.
// Asks Claude for pure JSON (no markdown) so parsing is unambiguous;
// we generate the human-readable markdown from the JSON ourselves.
//
// Returns:
//   {
//     success: true,
//     niche: 'fishing equipment',
//     markdown: '...generated from JSON...',
//     categories: { 'Rods & Reels': [...], 'Line & Terminal Tackle': [...] },
//     allKeywords: ['spinning rods', 'baitcasting rods', ...],
//   }
export async function generateNichePlan(niche) {
  if (!niche || typeof niche !== 'string' || niche.trim().length < 2) {
    return { success: false, error: 'Niche is required' }
  }

  const userNiche = niche.trim()

  const system = `You are an elite Dropshipping Niche Specialist and Product Catalog Architect. Your expertise is creating complete, highly profitable product assortments for specialized online stores sourced from AliExpress.

Return ONLY a single JSON object. No prose, no markdown headings, no explanation before or after. Just the JSON.`

  const userPrompt = `Generate a comprehensive product catalogue plan for the niche: "${userNiche}".

Return ONLY this JSON structure (no prose, no markdown, no code fences):

{
  "niche": "${userNiche}",
  "main_categories": {
    "Category Name 1": ["specific keyword 1", "specific keyword 2", "specific keyword 3"],
    "Category Name 2": ["specific keyword 4", "specific keyword 5"]
  },
  "all_keywords": ["every individual keyword from every category, no duplicates"]
}

Requirements:
- 12 to 25 well-grouped major categories
- 150-400 unique, highly specific keywords total (searchable on AliExpress)
- Include product variations, styles, materials, accessories, apparel, electronics, tools, storage, safety gear, consumables — everything a complete specialised store would sell
- For fashion/beauty niches include different styles, types, colours, sizes, and complementary accessories
- Stay 100% relevant to the exact niche. Do not add unrelated items
- Prioritise evergreen, popular, profitable dropshipping products
- "all_keywords" MUST be a flat deduplicated list of every keyword from every category

Generate the JSON now.`

  try {
    const { content } = await callClaude({
      model: NICHE_MODEL,
      system,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 8000,
    })

    let json
    try {
      json = extractJsonBlock(content)
    } catch (err) {
      return {
        success: false,
        error: 'Failed to parse JSON from Claude response: ' + err.message,
        raw: content.slice(0, 1000),
      }
    }

    const categories = json.main_categories || {}
    let allKeywords = Array.isArray(json.all_keywords)
      ? json.all_keywords.map(k => String(k).trim()).filter(Boolean)
      : []
    // Defensive: rebuild from categories if all_keywords is missing / short
    if (allKeywords.length < 20) {
      const flat = []
      for (const kws of Object.values(categories)) {
        if (Array.isArray(kws)) kws.forEach(k => flat.push(String(k).trim()))
      }
      allKeywords = [...new Set([...allKeywords, ...flat])].filter(Boolean)
    }
    allKeywords = [...new Set(allKeywords)]

    if (allKeywords.length === 0) {
      return { success: false, error: 'Claude returned no keywords', raw: content.slice(0, 500) }
    }

    // Build the human-readable markdown from the JSON — more reliable than
    // asking Claude to produce both formats
    const title = `${userNiche.charAt(0).toUpperCase() + userNiche.slice(1)} — Complete Product List`
    const catLines = Object.entries(categories).map(
      ([cat, items]) => `${cat}: ${(items || []).join(', ')}`
    )
    const markdown = [title, '', ...catLines].join('\n')

    return {
      success: true,
      niche: userNiche,
      markdown,
      categories,
      allKeywords,
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
