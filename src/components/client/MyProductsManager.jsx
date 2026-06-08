import { useState, useEffect } from 'react'
import {
  Eye, EyeOff, AlertTriangle, Loader2, RefreshCw, Search,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

function getShippingStatus(usd) {
  if (!usd) return { label: '?', color: 'text-zinc-500', bg: 'bg-zinc-500/10', emoji: '❓' }
  const aud = usd * 1.45 // Rough USD to AUD
  if (aud > 10) return { label: `A$${aud.toFixed(2)} — HIGH`, color: 'text-red-500', bg: 'bg-red-500/10', emoji: '🔴' }
  if (aud > 5) return { label: `A$${aud.toFixed(2)}`, color: 'text-yellow-500', bg: 'bg-yellow-500/10', emoji: '🟡' }
  return { label: `A$${aud.toFixed(2)}`, color: 'text-emerald-500', bg: 'bg-emerald-500/10', emoji: '🟢' }
}

export default function MyProductsManager({ products, token, onUpdate }) {
  const [sortBy, setSortBy] = useState('newest')
  const [filterVisible, setFilterVisible] = useState(null) // null = all, true = visible, false = hidden
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const itemsPerPage = 20

  const [shippingCache, setShippingCache] = useState({})
  const [queryingShipping, setQueryingShipping] = useState({})
  const [toggleStates, setToggleStates] = useState({})

  // Filter and sort products
  let filtered = products.filter(p => {
    const matchesVisibility = filterVisible === null || p.visible_to_storefront === filterVisible
    const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesVisibility && matchesSearch
  })

  if (sortBy === 'newest') {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  } else if (sortBy === 'oldest') {
    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  } else if (sortBy === 'expensive-shipping') {
    filtered.sort((a, b) => (shippingCache[b.id] || 0) - (shippingCache[a.id] || 0))
  }

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paged = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  async function toggleVisibility(productId, currentValue) {
    setToggleStates(s => ({ ...s, [productId]: 'loading' }))
    try {
      const res = await fetch(`${API_BASE}/api/my-shop/products`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: productId,
          visibleToStorefront: !currentValue,
        }),
      })
      if (!res.ok) throw new Error('Failed to toggle visibility')
      setToggleStates(s => ({ ...s, [productId]: 'done' }))
      setTimeout(() => setToggleStates(s => ({ ...s, [productId]: null })), 1000)
      onUpdate?.()
    } catch (err) {
      setToggleStates(s => ({ ...s, [productId]: 'error' }))
      setTimeout(() => setToggleStates(s => ({ ...s, [productId]: null })), 2000)
    }
  }

  async function queryShipping(productId) {
    if (queryingShipping[productId]) return
    setQueryingShipping(s => ({ ...s, [productId]: true }))
    try {
      const res = await fetch(`${API_BASE}/api/my-shop/product-shipping?productId=${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success && data.shippingUsd !== undefined) {
        setShippingCache(s => ({ ...s, [productId]: data.shippingUsd }))
      }
    } catch (err) {
      console.error('Shipping query failed:', err)
    } finally {
      setQueryingShipping(s => ({ ...s, [productId]: false }))
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
          className="flex-1 min-w-[200px] rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-[15px] text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none"
        />

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-[15px] text-white focus:border-[#FF6B35] focus:outline-none"
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
          className="rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-[15px] text-white focus:border-[#FF6B35] focus:outline-none"
        >
          <option value="all">All products</option>
          <option value="visible">Visible only</option>
          <option value="hidden">Hidden only</option>
        </select>
      </div>

      {/* Results info */}
      <div className="text-[14px] text-zinc-400">
        Showing {paged.length > 0 ? (page - 1) * itemsPerPage + 1 : 0}–{Math.min(page * itemsPerPage, filtered.length)} of {filtered.length} products
      </div>

      {/* Table */}
      {paged.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <Search className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
          <div className="text-[16px] text-zinc-400">No products found</div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-[14px] font-medium text-zinc-400">Product</th>
                <th className="px-4 py-3 text-left text-[14px] font-medium text-zinc-400">Cost</th>
                <th className="px-4 py-3 text-left text-[14px] font-medium text-zinc-400">Shipping (AUD)</th>
                <th className="px-4 py-3 text-center text-[14px] font-medium text-zinc-400">Visible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {paged.map(product => {
                const shippingUsd = shippingCache[product.id]
                const shippingStatus = getShippingStatus(shippingUsd)
                const isQuerying = queryingShipping[product.id]
                const toggleState = toggleStates[product.id]
                const isVisible = product.visible_to_storefront !== false

                return (
                  <tr key={product.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Product name + image */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.image && (
                          <img
                            src={product.image}
                            alt={product.title}
                            className="h-10 w-10 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-medium text-white truncate">{product.title}</div>
                          <div className="text-[12px] text-zinc-500">{product.category || '—'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Cost */}
                    <td className="px-4 py-3 text-[14px] text-zinc-300">
                      US ${parseFloat(product.supplier_cost || 0).toFixed(2)}
                    </td>

                    {/* Shipping cost with refresh button */}
                    <td className="px-4 py-3">
                      {isQuerying ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                          <span className="text-[14px] text-zinc-500">Checking...</span>
                        </div>
                      ) : shippingUsd ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-[14px] font-medium px-2 py-1 rounded ${shippingStatus.bg} ${shippingStatus.color}`}>
                            {shippingStatus.emoji} {shippingStatus.label}
                          </span>
                          <button
                            onClick={() => queryShipping(product.id)}
                            className="p-1 hover:bg-white/[0.08] rounded transition-colors"
                            title="Refresh shipping cost"
                          >
                            <RefreshCw className="h-3.5 w-3.5 text-zinc-500 hover:text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => queryShipping(product.id)}
                          className="text-[13px] text-[#FF6B35] hover:underline"
                        >
                          Check shipping
                        </button>
                      )}
                    </td>

                    {/* Visibility toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleVisibility(product.id, isVisible)}
                        disabled={toggleState === 'loading'}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                          isVisible
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20'
                        } disabled:opacity-50`}
                        title={isVisible ? 'Click to hide from storefront' : 'Click to show on storefront'}
                      >
                        {toggleState === 'loading' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isVisible ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                        {toggleState === 'done' ? 'Saved' : isVisible ? 'Visible' : 'Hidden'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 rounded-lg border border-white/[0.08] text-[14px] text-zinc-300 hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          <span className="text-[14px] text-zinc-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 rounded-lg border border-white/[0.08] text-[14px] text-zinc-300 hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="text-[13px] text-zinc-400 space-y-1.5">
          <div><span className="text-emerald-500">🟢 LOW</span> — Shipping &lt; A$5 (great for customers)</div>
          <div><span className="text-yellow-500">🟡 MEDIUM</span> — Shipping A$5–10 (reasonable)</div>
          <div><span className="text-red-500">🔴 HIGH</span> — Shipping &gt; A$10 (consider hiding)</div>
          <div className="mt-2 pt-2 border-t border-white/[0.06]">
            💡 Tip: Products with HIGH shipping often don't sell. Hide them to improve your store's appeal.
          </div>
        </div>
      </div>
    </div>
  )
}
