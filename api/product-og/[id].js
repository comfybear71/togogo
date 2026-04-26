// Server-rendered HTML with product-specific Open Graph tags so link
// unfurlers (WhatsApp / iMessage / Facebook / Slack / Telegram) show
// the actual product image and title when a customer shares a
// /product/:id link. The SPA bundle still mounts on the same page —
// real users get the same React app they'd get from index.html, with
// the OG meta tags pre-baked in the head.
//
// Reached via a vercel.json rewrite from /product/:id. The handler
// fetches the index.html from the deployment, injects four meta tags
// + a canonical link, and returns the modified HTML. If anything
// fails we fall back to plain index.html so the SPA still loads.
import { sql } from '../_lib/db.js'

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default async function handler(req, res) {
  const { id } = req.query
  // Sanitise the host header — it's customer-visible in og:url, so a
  // forged Host shouldn't leak into the rendered page. Storefronts are
  // *.togogo.me only.
  const rawHost = (req.headers.host || '').toLowerCase()
  const host = /^[a-z0-9-]+\.togogo\.me$/.test(rawHost) ? rawHost : 'togogo.me'
  const productPageUrl = `https://${host}/product/${id || ''}`

  // Fetch the production index.html on every request. Vercel serves it
  // from the same deployment so this is a same-origin fetch, fast and
  // reliable. We don't read from disk because the path layout differs
  // between local dev and Vercel runtime.
  let indexHtml = ''
  try {
    const indexRes = await fetch(`https://${host}/index.html`, {
      // Avoid recursive rewrites — go straight to the static file.
      headers: { 'x-internal-og-fetch': '1' },
    })
    indexHtml = await indexRes.text()
  } catch (err) {
    console.error('[product-og] Failed to fetch index.html:', err.message)
  }

  // Look up the product. Failures fall through to a generic share card
  // — better than 500ing on a corner case.
  let title = 'ToGoGo'
  let description = 'Discover great products on ToGoGo'
  let image = `https://${host}/pwa-512x512.png`
  if (id && /^[0-9a-f-]{36}$/i.test(String(id))) {
    try {
      const { rows } = await sql`
        SELECT title, description, image
        FROM user_products
        WHERE id = ${id} AND is_active = true
        LIMIT 1
      `
      const p = rows[0]
      if (p) {
        // Truncate the title to 60 chars so FB / Twitter / LinkedIn
        // unfurls don't render a 4-line block. opengraph.xyz flagged
        // the 95-char originals as overlong; FB also occasionally
        // rejects cards whose title fields exceed its rendering limit.
        // Add an ellipsis only when we actually trimmed.
        const fullTitle = p.title || title
        title = fullTitle.length > 60 ? fullTitle.slice(0, 57).trimEnd() + '…' : fullTitle
        const desc = p.description && p.description !== p.title
          ? p.description
          : `Buy ${fullTitle} on ${host.split('.')[0]}.togogo.me`
        description = desc.slice(0, 200)
        if (p.image) image = p.image
      }
    } catch (err) {
      console.error('[product-og] DB lookup failed:', err.message)
    }
  }

  // AE serves WEBP at URLs ending in `_.webp`. Facebook's crawler
  // sometimes rejects WEBP outright (X/Twitter handle it fine, which
  // is why customers reported X working but FB showing no image).
  // Strip the trailing `_.webp` so FB gets the underlying JPG, which
  // AE's CDN serves at the same path. We also strip an inner
  // `.jpg_640x640q90.jpg` size suffix back to a smaller variant if
  // needed — but a 640x640 source is fine for FB (they want >= 200x200,
  // ideally 1200x630). Keep the original URL as a Twitter fallback
  // since X already accepts it.
  const ogImage = image.replace(/_\.webp(\?.*)?$/i, '$1')
  // No og:image:width / og:image:height. AE images vary (most are
  // 1024x1024 but some sources send 640x640 or non-square). Declaring
  // a fixed size that disagrees with the actual bytes makes FB reject
  // the image — opengraph.xyz reported "Image is 1024x1024px" for the
  // same URL where we'd previously declared 640. Letting unfurlers
  // probe the file is more reliable than guessing.
  const ogTags = `
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:url" content="${escapeHtml(productPageUrl)}" />
    <meta property="og:site_name" content="${escapeHtml(host.split('.')[0])}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <link rel="canonical" href="${escapeHtml(productPageUrl)}" />
  `.trim()

  // Inject the meta tags into the <head>. If we couldn't fetch
  // index.html (rare — same-origin same-deployment fetch), serve a
  // tiny stub with the OG tags. Bots get what they need; a real
  // human would see the storefront home as a fallback (NOT the
  // product URL — that would loop right back to this function).
  let html
  if (indexHtml && indexHtml.includes('</head>')) {
    html = indexHtml.replace('</head>', `${ogTags}\n</head>`)
  } else {
    const homeUrl = `https://${host}/`
    html = `<!doctype html>
<html><head>
<meta charset="utf-8" />
${ogTags}
<meta http-equiv="refresh" content="0; url=${escapeHtml(homeUrl)}" />
<title>${escapeHtml(title)}</title>
</head><body>
<script>window.location.replace(${JSON.stringify(homeUrl)})</script>
</body></html>`
  }

  // Short cache so unfurlers hit a fresh OG response when product
  // titles/images change, but we don't crush the function on every
  // SPA navigation. 5 minutes is a reasonable middle.
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300')
  res.status(200).send(html)
}
