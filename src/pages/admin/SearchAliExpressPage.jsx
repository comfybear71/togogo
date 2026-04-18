import { useState } from 'react'
import { Search, Plus, Check, Loader2, Package, Star, ShoppingCart } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function SearchAliExpressPage() {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(new Set())
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [sort, setSort] = useState('orders')
  const [error, setError] = useState(null)

  const search = async (p = 1) => {
    if (!keyword.trim()) return
    setLoading(true)
    setImportResult(null)
    setError(null)

    const token = localStorage.getItem('togogo-token')
    if (!token) {
      setError('Not logged in — missing auth token. Sign in again.')
      setLoading(false)
      return
    }

    const params = new URLSearchParams({ keyword: keyword.trim(), page: p, sort })
    const url = `${API_BASE}/api/admin/search-aliexpress?${params}`
    console.log('[SearchAE] Fetching', url)

    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const bodyText = await res.text()
      console.log('[SearchAE] HTTP', res.status, 'body:', bodyText.slice(0, 400))

      let data = null
      try { data = JSON.parse(bodyText) } catch {}

      if (!res.ok) {
        setError(`HTTP ${res.status}: ${data?.error || bodyText.slice(0, 200) || 'unknown error'}`)
        setLoading(false)
        return
      }

      if (data?.error) {
        setError(`AliExpress: ${data.error}`)
      }

      setResults(data)
      setPage(p)
      setSelected(new Set())
    } catch (err) {
      console.error('[SearchAE] Fetch failed:', err)
      setError(`Network error: ${err.message}`)
    }
    setLoading(false)
  }

  const toggleSelect = (productId) => {
    const next = new Set(selected)
    if (next.has(productId)) next.delete(productId)
    else next.add(productId)
    setSelected(next)
  }

  const selectAll = () => {
    if (!results) return
    if (selected.size === results.products.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(results.products.map(p => p.productId)))
    }
  }

  const importSelected = async () => {
    if (selected.size === 0 || !results) return
    setImporting(true)
    setError(null)
    const token = localStorage.getItem('togogo-token')
    const products = results.products.filter(p => selected.has(p.productId))
    try {
      const res = await fetch(`${API_BASE}/api/admin/search-aliexpress`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(`Import failed: HTTP ${res.status} ${data?.error || ''}`)
      } else {
        setImportResult(data)
        setSelected(new Set())
      }
    } catch (err) {
      setError(`Import network error: ${err.message}`)
    }
    setImporting(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Search AliExpress</h1>
          <p className="text-sm text-zinc-400 mt-1">Find products by keyword and import to your catalog</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search AliExpress... e.g. kitchen sponge, cotton underwear, microfiber cloth"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search(1)}
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] py-2.5 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF6B35]"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-2.5 text-sm text-white focus:outline-none"
        >
          <option value="orders">Most Sold</option>
          <option value="min_price">Price: Low → High</option>
          <option value="comments">Most Reviewed</option>
        </select>
        <button
          onClick={() => search(1)}
          disabled={loading || !keyword.trim()}
          className="rounded-xl bg-[#FF6B35] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#e85d2c] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </button>
      </div>

      {/* Import bar */}
      {results && results.products.length > 0 && (
        <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-xs text-zinc-400 hover:text-white">
              {selected.size === results.products.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs text-zinc-500">{selected.size} selected</span>
          </div>
          <button
            onClick={importSelected}
            disabled={selected.size === 0 || importing}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Import {selected.size} Product{selected.size !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <p className="text-sm font-medium text-red-300">Search failed</p>
          <p className="text-xs text-red-200/80 mt-1 break-all">{error}</p>
          <p className="text-[10px] text-red-200/60 mt-2">
            Tip: open the browser console for the request/response, or hit{' '}
            <code className="px-1 bg-black/30 rounded">/api/admin/search-aliexpress?keyword={keyword.trim()}&amp;debug=1&amp;secret=JWT_SECRET</code>{' '}
            to see the raw AliExpress response.
          </p>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-emerald-300">
            Imported {importResult.imported} product{importResult.imported !== 1 ? 's' : ''}
            {importResult.skipped > 0 && ` (${importResult.skipped} already existed)`}
          </span>
        </div>
      )}

      {/* Results grid */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-[#FF6B35] animate-spin" />
        </div>
      )}

      {results && !loading && results.products.length === 0 && (
        <div className="text-center py-20">
          <Package className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
          <p className="text-zinc-400">No products found for "{keyword}"</p>
          <p className="text-xs text-zinc-600 mt-1">Try different keywords</p>
        </div>
      )}

      {results && !loading && results.products.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {results.products.map((p) => {
              const isSelected = selected.has(p.productId)
              return (
                <div
                  key={p.productId}
                  onClick={() => toggleSelect(p.productId)}
                  className={`cursor-pointer rounded-xl border overflow-hidden transition-all ${
                    isSelected
                      ? 'border-[#FF6B35] bg-[#FF6B35]/10 ring-1 ring-[#FF6B35]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15]'
                  }`}
                >
                  <div className="relative aspect-square bg-gray-100">
                    {p.image && <img src={p.image} alt={p.title} className="h-full w-full object-cover" />}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-[#FF6B35] rounded-full p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {p.discountPercent > 0 && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        -{p.discountPercent}%
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs text-white line-clamp-2 leading-tight mb-1.5">{p.title}</p>
                    <p className="text-xs text-zinc-500 mb-1">{p.category}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-[#FF6B35]">A${p.salePrice?.toFixed(2)}</span>
                        <span className="text-[10px] text-zinc-600 ml-1">cost: ${p.costAUD?.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                      {p.rating > 0 && (
                        <span className="flex items-center gap-0.5"><Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />{p.rating}</span>
                      )}
                      {p.orders > 0 && (
                        <span className="flex items-center gap-0.5"><ShoppingCart className="h-2.5 w-2.5" />{p.orders}+ sold</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => search(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-sm text-zinc-500">Page {page}</span>
            <button
              onClick={() => search(page + 1)}
              className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-zinc-400 hover:text-white"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
