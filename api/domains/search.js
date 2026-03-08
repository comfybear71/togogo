// Domain availability search
// Uses GoDaddy's public API (works without auth for availability checks)
// Can be swapped for Namecheap, Cloudflare, etc.

const DOMAIN_EXTENSIONS = ['.com', '.store', '.shop', '.co', '.net', '.io', '.com.au', '.online']

// Pricing in AUD — ToGoGo markup included
const DOMAIN_PRICING = {
  '.com': { register: 18.99, renew: 18.99 },
  '.store': { register: 4.99, renew: 39.99 },
  '.shop': { register: 4.99, renew: 39.99 },
  '.co': { register: 14.99, renew: 34.99 },
  '.net': { register: 16.99, renew: 16.99 },
  '.io': { register: 49.99, renew: 49.99 },
  '.com.au': { register: 14.99, renew: 14.99 },
  '.online': { register: 4.99, renew: 39.99 },
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { q } = req.query

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' })
    }

    // Clean up the query — strip spaces, special chars, existing TLDs
    let name = q.trim().toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '')

    if (!name) {
      return res.status(400).json({ error: 'Invalid domain name' })
    }

    // Check availability for all extensions
    const results = await Promise.allSettled(
      DOMAIN_EXTENSIONS.map(ext => checkAvailability(name, ext))
    )

    const domains = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
      .sort((a, b) => {
        // Available first, then by price
        if (a.available && !b.available) return -1
        if (!a.available && b.available) return 1
        return a.price - b.price
      })

    res.json({ domains, query: name })
  } catch (err) {
    console.error('Domain search error:', err)
    res.status(500).json({ error: 'Failed to search domains' })
  }
}

async function checkAvailability(name, extension) {
  const domain = `${name}${extension}`
  const pricing = DOMAIN_PRICING[extension] || { register: 19.99, renew: 19.99 }

  // Use DNS-based availability check (fast, no API key needed)
  // Check if the domain has DNS records — if not, likely available
  try {
    const dnsRes = await fetch(`https://dns.google/resolve?name=${domain}&type=A`, {
      signal: AbortSignal.timeout(3000),
    })
    const dnsData = await dnsRes.json()

    // If domain has DNS records, it's taken
    // Status 0 = NOERROR (domain exists), 3 = NXDOMAIN (doesn't exist)
    const available = dnsData.Status === 3

    return {
      domain,
      name,
      extension,
      available,
      price: pricing.register,
      renewalPrice: pricing.renew,
      currency: 'AUD',
    }
  } catch {
    // If DNS check fails, mark as unknown
    return {
      domain,
      name,
      extension,
      available: null, // unknown
      price: pricing.register,
      renewalPrice: pricing.renew,
      currency: 'AUD',
    }
  }
}
