export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Anthropic API key not configured' })
  }

  try {
    const { messages } = req.body

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

You're sharp, concise, and actionable. Give specific, practical advice — not vague generalities. When suggesting products or deals, be specific about what to look for and where. Use a warm but professional tone. Keep responses focused and scannable with bullet points where helpful.`,
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
