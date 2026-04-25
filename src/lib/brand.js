// Brand-name split helper. Used to colour the right-hand portion of a
// store/platform name accent-orange (or theme accent on a storefront)
// in the same visual style as the "ToGoGo" wordmark.
//
// Picks a natural split point in this order:
//   1. Last word boundary (space) — "Annie's Shop" → "Annie's " + "Shop"
//   2. Apostrophe — "Jummi's" → "Jummi" + "'s"
//   3. Roughly half — "Stuie" → "Stu" + "ie"
//
// Empty / blank input falls back to ["To", "GoGo"] so callers can
// always render something.
export function splitBrand(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return ['To', 'GoGo']
  const lastSpace = trimmed.lastIndexOf(' ')
  if (lastSpace > 0 && lastSpace < trimmed.length - 1) {
    return [trimmed.slice(0, lastSpace + 1), trimmed.slice(lastSpace + 1)]
  }
  const apos = trimmed.indexOf("'")
  if (apos > 0 && apos < trimmed.length - 1) {
    return [trimmed.slice(0, apos), trimmed.slice(apos)]
  }
  const mid = Math.max(1, Math.ceil(trimmed.length / 2))
  return [trimmed.slice(0, mid), trimmed.slice(mid)]
}
