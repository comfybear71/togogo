import { useState } from 'react'
import {
  Eye, EyeOff, Loader2, RefreshCw, Search, ChevronDown, ChevronUp,
  ExternalLink, AlertTriangle, Check
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

function getShippingStatus(usd) {
  if (!usd) return { label: '?', color: 'text-zinc-500', bg: 'bg-zinc-500/10', emoji: '❓' }
  const aud = usd * 1.45
  if (aud > 10) return { label: `A$${aud.toFixed(2)} — HIGH`, color: 'text-red-500', bg: 'bg-red-500/10', emoji: '🔴' }
  if (aud > 5) return { label: `A$${aud.toFixed(2)}`, color: 'text-yellow-500', bg: 'bg-yellow-500/10', emoji: '🟡' }
  return { label: `A$${aud.toFixed(2)}`, color: 'text-emerald-500', bg: 'bg-emerald-500/10', emoji: '🟢' }
}

// Back / Page X of Y / Next. Rendered at the top AND bottom of the list so
// owners with many products don't have to scroll back up to change pages.
function PaginationBar({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-2 rounded-lg border border-white/[0.08] text-[14px] text-zinc-300 hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ← Back
      </button>
      <span className="text-[14px] text-zinc-400">Page {page} of {totalPages}</span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-2 rounded-lg border border-white/[0.08] text-[14px] text-zinc-300 hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next →
      </button>
    </div>
  )
}

export default function MyProductsManager({ products, token, storageSubdomain }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [filterVisible, setFilterVisible] = useState(null)
  const [page, setPage] = useState(1)
  const itemsPerPage = 20
  const [shippingCache, setShippingCache] = useState({})
  const [queryingShipping, setQueryingShipping] = useState({})
  const [shippingErrors, setShippingErrors] = useState({})
  const [toggleStates, setToggleStates] = useState({})
  const [expandedVariants, setExpandedVariants] = useState({})
  // Local optimistic overrides for visibility, keyed by product id. The
  // server is the source of truth, but we flip the UI instantly on click
  // and only fall back to the override if the PATCH fails. Without this the
  // toggle appeared to "do nothing" because the old code refetched stale
  // server data before the write landed.
  const [visibilityOverrides, setVisibilityOverrides] = useState({})

  // Effective visibility = optimistic override if we have one, else the
  // server value. Defaults to visible (true) for legacy rows where the
  // column is NULL.
  const isProductVisible = (p) =>
    visibilityOverrides[p.id] !== undefined
      ? visibilityOverrides[p.id]
      : p.visible_to_storefront !== false

  // Filter and sort products
  let filtered = products.filter(p => {
    const matchesVisibility = filterVisible === null || isProductVisible(p) === filterVisible
    const matchesSearch = !searchQuery || (p.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesVisibility && matchesSearch
  })

  if (sortBy === 'newest') {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  } else if (sortBy === 'oldest') {
    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  } else if (sortBy === 'expensive-shipping') {
    filtered.sort((a, b) => (shippingCache[b.id] || 0) - (shippingCache[a.id] || 0))
  }

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paged = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  async function toggleVisibility(productId, currentValue) {
    const newValue = !currentValue
    // 1. Flip the UI instantly via the optimistic override.
    setVisibilityOverrides(s => ({ ...s, [productId]: newValue }))
    setToggleStates(s => ({ ...s, [productId]: 'saving' }))

    try {
      // 2. Persist to the database (hides from the storefront — the row is
      //    NEVER deleted, only flagged).
      const res = await fetch(`${API_BASE}/api/my-shop/products`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: productId,
          visibleToStorefront: newValue,
        }),
      })
      if (!res.ok) throw new Error('Failed to toggle visibility')
      // 3. Success — keep the override so the card stays flipped, show a
      //    brief tick. No refetch: a refetch here would clobber other
      //    pending optimistic toggles with stale data.
      setToggleStates(s => ({ ...s, [productId]: 'done' }))
      setTimeout(() => setToggleStates(s => ({ ...s, [productId]: null })), 800)
    } catch {
      // 4. Failure — roll the override back and surface the error.
      setVisibilityOverrides(s => {
        const next = { ...s }
        delete next[productId]
        return next
      })
      setToggleStates(s => ({ ...s, [productId]: 'error' }))
      setTimeout(() => setToggleStates(s => ({ ...s, [productId]: null })), 2500)
    }
  }

  async function queryShipping(productId) {
    if (queryingShipping[productId]) return
    setQueryingShipping(s => ({ ...s, [productId]: true }))
    setShippingErrors(s => ({ ...s, [productId]: null }))
    try {
      const res = await fetch(`${API_BASE}/api/my-shop/product-shipping?productId=${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success && data.shippingUsd !== undefined) {
        setShippingCache(s => ({ ...s, [productId]: data.shippingUsd }))
      } else {
        // Don't fail silently — the most common cause is the AliExpress
        // OAuth token having expired, which the owner can fix themselves.
        const raw = (data.error || '').toLowerCase()
        const msg = raw.includes('oauth') || raw.includes('token') || raw.includes('authoriz')
          ? 'Shipping check needs AliExpress re-authorization (Admin → Settings → Re-auth).'
          : (data.error || 'Could not get a shipping price for this product right now.')
        setShippingErrors(s => ({ ...s, [productId]: msg }))
      }
    } catch (err) {
      console.error('Shipping query failed:', err)
      setShippingErrors(s => ({ ...s, [productId]: 'Could not reach the shipping service. Please try again.' }))
    } finally {
      setQueryingShipping(s => ({ ...s, [productId]: false }))
    }
  }

  const storefrontBase = storageSubdomain ? `https://${storageSubdomain}.togogo.me` : null

  // Change page and bring the list back into view — used by both the top
  // and bottom pagination bars so a Next/Back tap at the bottom doesn't
  // leave the owner scrolled past the new page's first products.
  function goToPage(p) {
    const next = Math.min(totalPages || 1, Math.max(1, p))
    setPage(next)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
          className="flex-1 rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-[15px] text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none"
        />

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-[15px] text-white focus:border-[#FF6B35] focus:outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="expensive-shipping">Expensive shipping first</option>
        </select>

        <select
          value={filterVisible === null ? 'all' : filterVisible ? 'visible' : 'hidden'}
          onChange={e => {
            const val = e.target.value
            setFilterVisible(val === 'all' ? null : val === 'visible')
            setPage(1)
          }}
          className="rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-[15px] text-white focus:border-[#FF6B35] focus:outline-none"
        >
          <option value="all">All products</option>
          <option value="visible">Visible only</option>
          <option value="hidden">Hidden only</option>
        </select>
      </div>

      {/* Results info + pagination controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-[14px] text-zinc-400">
          {filtered.length} product{filtered.length !== 1 ? 's' : ''} ({page} of {totalPages || 1})
        </div>
        <PaginationBar page={page} totalPages={totalPages} onChange={goToPage} />
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <Search className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
          <div className="text-[16px] text-zinc-400">No products found</div>
          <div className="text-[14px] text-zinc-500 mt-1">Try adjusting your search or filters</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.map(product => {
            const shippingUsd = shippingCache[product.id]
            const shippingStatus = getShippingStatus(shippingUsd)
            const isQuerying = queryingShipping[product.id]
            const shippingError = shippingErrors[product.id]
            const toggleState = toggleStates[product.id]
            const isVisible = isProductVisible(product)
            const isExpanded = expandedVariants[product.id]
            const variantCount = (Array.isArray(product.variants) ? product.variants.length : 0)

            return (
              <div key={product.id} className="rounded-2xl border border-white/[0.06] bg-[#111] p-4 flex flex-col">
                {/* Product Image */}
                <div className="mb-4 -mx-4 -mt-4 rounded-t-2xl h-48 sm:h-40 bg-zinc-900 overflow-hidden flex items-center justify-center">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-zinc-600 text-sm">No image</div>
                  )}
                </div>

                {/* Product Name - Clickable to view on storefront */}
                {storefrontBase ? (
                  <a
                    href={`${storefrontBase}/product/${product.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-2 group mb-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-white group-hover:text-[#FF6B35] transition-colors line-clamp-2">
                        {product.title}
                      </h3>
                      <div className="text-[12px] text-zinc-500 mt-0.5">{product.category || 'General'}</div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-zinc-500 group-hover:text-[#FF6B35] flex-shrink-0 mt-0.5 transition-colors" />
                  </a>
                ) : (
                  <div className="mb-3">
                    <h3 className="text-[15px] font-semibold text-white line-clamp-2">
                      {product.title}
                    </h3>
                    <div className="text-[12px] text-zinc-500 mt-0.5">{product.category || 'General'}</div>
                  </div>
                )}

                {/* Pricing */}
                <div className="mb-4 p-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <div className="text-[12px] text-zinc-500 mb-1">Wholesale cost</div>
                  <div className="text-[18px] font-bold text-white">
                    US ${parseFloat(product.supplier_cost || 0).toFixed(2)}
                  </div>
                </div>

                {/* Shipping */}
                <div className="mb-4">
                  {isQuerying ? (
                    <div className="flex items-center gap-2 text-[14px] text-zinc-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking shipping...
                    </div>
                  ) : shippingUsd ? (
                    <div className="flex items-center justify-between">
                      <span className={`text-[13px] font-medium px-3 py-1.5 rounded-lg ${shippingStatus.bg} ${shippingStatus.color}`}>
                        {shippingStatus.emoji} {shippingStatus.label}
                      </span>
                      <button
                        onClick={() => queryShipping(product.id)}
                        className="p-1.5 hover:bg-white/[0.08] rounded-lg transition-colors"
                        title="Refresh shipping cost"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-zinc-500 hover:text-white" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => queryShipping(product.id)}
                        className="w-full text-[13px] text-[#FF6B35] hover:bg-[#FF6B35]/10 px-3 py-2 rounded-lg transition-colors"
                      >
                        Check shipping cost
                      </button>
                      {shippingError && (
                        <div className="mt-2 flex items-start gap-1.5 text-[12px] text-amber-400/90">
                          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          <span>{shippingError}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Variants section - collapsible */}
                {variantCount > 0 && (
                  <div className="mb-4 border-t border-white/[0.06] pt-4">
                    <button
                      onClick={() => setExpandedVariants(s => ({ ...s, [product.id]: !isExpanded }))}
                      className="w-full flex items-center justify-between text-[14px] font-medium text-white hover:text-[#FF6B35] transition-colors"
                    >
                      <span>{variantCount} variant{variantCount !== 1 ? 's' : ''}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                        {Array.isArray(product.variants) && product.variants.map((variant, idx) => (
                          <div key={idx} className="text-[12px] p-2 rounded bg-white/[0.04] border border-white/[0.06]">
                            <div className="font-medium text-white">{variant.name || `Variant ${idx + 1}`}</div>
                            {variant.price && (
                              <div className="text-zinc-400 mt-0.5">
                                US ${typeof variant.price === 'number' ? variant.price.toFixed(2) : variant.price}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Remove / add-back control. This only flags the product so
                    the customer storefront skips it — the row is NEVER deleted
                    from the database, so it can always be added back. */}
                <div className="mt-auto pt-4 border-t border-white/[0.06]">
                  {!isVisible && toggleState !== 'saving' && (
                    <div className="mb-2 flex items-center justify-center gap-1.5 text-[12px] text-zinc-500">
                      <EyeOff className="h-3.5 w-3.5" />
                      Removed from your store
                    </div>
                  )}
                  <button
                    onClick={() => toggleVisibility(product.id, isVisible)}
                    disabled={toggleState === 'saving'}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
                      isVisible
                        ? 'border border-white/[0.12] text-zinc-200 hover:bg-white/[0.06]'
                        : 'bg-[#FF6B35]/10 text-[#FF6B35] hover:bg-[#FF6B35]/20'
                    } disabled:opacity-60 disabled:cursor-wait`}
                    title={isVisible
                      ? 'Tap to remove this product from your store (it stays saved and can be added back)'
                      : 'Tap to add this product back to your store'}
                  >
                    {toggleState === 'saving' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : toggleState === 'done' ? (
                      <>
                        <Check className="h-4 w-4" />
                        Saved
                      </>
                    ) : isVisible ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Remove from my store
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Add back to my store
                      </>
                    )}
                  </button>
                  {toggleState === 'error' && (
                    <div className="mt-2 flex items-start gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="text-[12px] text-red-300">Couldn't save — tap to try again</div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom pagination — mirrors the top bar */}
      {filtered.length > 0 && (
        <PaginationBar page={page} totalPages={totalPages} onChange={goToPage} />
      )}

      {/* Legend */}
      {filtered.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-[13px] text-zinc-400 space-y-1.5">
            <div><span className="text-emerald-500">🟢 LOW</span> — Shipping &lt; A$5 (great for customers)</div>
            <div><span className="text-yellow-500">🟡 MEDIUM</span> — Shipping A$5–10 (reasonable)</div>
            <div><span className="text-red-500">🔴 HIGH</span> — Shipping &gt; A$10 (consider removing)</div>
            <div className="mt-2 pt-2 border-t border-white/[0.06]">
              💡 Tip: Products with HIGH shipping often don't sell. Remove them from your store to keep it appealing — they stay saved and can be added back any time.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
