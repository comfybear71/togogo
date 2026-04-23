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

// Extract a JSON code block from Claude's response (it's instructed to put
// the JSON inside ```json ... ``` at the end of the message).
function extractJsonBlock(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  if (fenced) return JSON.parse(fenced[1].trim())
  // Fallback: try to find a top-level { ... } that parses
  const braceMatch = text.match(/\{[\s\S]*\}/)
  if (braceMatch) return JSON.parse(braceMatch[0])
  throw new Error('No JSON block found in Claude response')
}

// Build a comprehensive niche product plan.
//
// Returns:
//   {
//     success: true,
//     niche: 'fishing equipment',
//     markdown: '...full formatted list for humans...',
//     categories: { 'Rods & Reels': [...], 'Line & Terminal Tackle': [...] },
//     allKeywords: ['spinning rods', 'baitcasting rods', ...],
//   }
export async function generateNichePlan(niche) {
  if (!niche || typeof niche !== 'string' || niche.trim().length < 2) {
    return { success: false, error: 'Niche is required' }
  }

  const userNiche = niche.trim()

  const system = `You are an elite Dropshipping Niche Specialist and Product Catalog Architect. Your expertise is creating complete, highly profitable product assortments for specialized online stores sourced from AliExpress.`

  const userPrompt = `Task: Generate an extremely comprehensive product keyword list for the niche: "${userNiche}".

Output Format - You MUST follow this exactly:

1. Start with the title line:
[Niche Name] — Complete Product List

2. Then create 12-25 well-grouped major categories. Format each line exactly like this:
Category Name: keyword1, keyword2, keyword3, keyword4, specific product variations...

3. After all the categories, add this section:
All Search Keywords (for AliExpress):
keyword1, keyword2, keyword3, ... (a single long comma-separated list of every individual keyword from the categories above, no duplicates)

4. Finally, output clean JSON for system integration (place it at the very end inside a \`\`\`json code block):
\`\`\`json
{
  "niche": "${userNiche}",
  "main_categories": {
    "Category Name 1": ["keyword 1", "keyword 2"],
    "Category Name 2": ["keyword 3", "keyword 4"]
  },
  "all_keywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4"]
}
\`\`\`

Important Guidelines:
- Be as comprehensive as possible — aim for 150-400+ unique keywords depending on niche size
- Use highly specific, searchable product terms that real buyers type into AliExpress
- Include product variations, styles, materials, accessories, apparel, electronics, tools, storage, safety gear, consumables — everything a complete specialized store would sell
- For fashion/beauty niches include different styles, types, colours, sizes, and complementary accessories
- Stay 100% relevant to the exact niche the user gave. Do not add unrelated items
- Think like the owner of the ultimate one-stop shop in this niche
- Prioritise evergreen, popular, profitable dropshipping products

Generate the complete output now for niche: "${userNiche}".`

  try {
    const { content } = await callClaude({
      model: NICHE_MODEL,
      system,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 4000,
    })

    // Parse JSON block at the end
    let json
    try {
      json = extractJsonBlock(content)
    } catch (err) {
      return { success: false, error: 'Failed to parse JSON from Claude response: ' + err.message, raw: content.slice(0, 500) }
    }

    const allKeywords = Array.isArray(json.all_keywords)
      ? [...new Set(json.all_keywords.map(k => String(k).trim()).filter(Boolean))]
      : []

    if (allKeywords.length === 0) {
      return { success: false, error: 'Claude returned no keywords', raw: content.slice(0, 500) }
    }

    // Strip the JSON block from the markdown for the human-readable view
    const markdown = content.replace(/```json[\s\S]*?```/i, '').trim()

    return {
      success: true,
      niche: userNiche,
      markdown,
      categories: json.main_categories || {},
      allKeywords,
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
