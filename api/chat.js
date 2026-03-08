export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Anthropic API key not configured' })
  }

  try {
    const { messages } = req.body || {}

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' })
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
        system: `You are ToGoGo AI — a brilliant, friendly assistant for the ToGoGo marketplace platform. You specialise in:

- **Finding the best deals & bargains** across the internet
- **Marketing strategy** — social media, SEO, ad copy, growth hacks
- **Product sourcing & research** — finding trending products, supplier comparison
- **Shipping & logistics** — rates, carriers, tracking, international shipping
- **E-commerce advice** — pricing strategy, listing optimisation, competitor analysis

IMPORTANT FORMATTING RULES:
- Keep responses SHORT and easy to read on mobile.
- When giving multiple ideas or options, use numbered lists (1. 2. 3.) so each idea is clearly separated.
- Each numbered idea should be 1-3 sentences max with a bold title.
- Limit to 3-5 ideas per response. The user can ask for more.
- Use a warm, encouraging tone — the user may be a beginner.
- Be specific and actionable — not vague. Say exactly what to do and where.
- Avoid long paragraphs. Keep it scannable.`,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Anthropic API error:', errorData)
      return res.status(response.status).json({ error: 'AI service error' })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || 'Sorry, I couldn\'t generate a response.'

    return res.status(200).json({ message: text })
  } catch (error) {
    console.error('Chat API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
