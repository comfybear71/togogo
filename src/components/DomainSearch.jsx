import { useState } from 'react'
import { Search, Check, X, Loader2, Globe, ShoppingCart, ExternalLink } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function DomainSearch({ onDomainPurchased }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [purchasing, setPurchasing] = useState(null)
  const [error, setError] = useState(null)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim() || query.trim().length < 2) return

    setSearching(true)
    setError(null)
    setResults(null)

    try {
      const res = await fetch(`${API_BASE}/api/domains/search?q=${encodeURIComponent(query.trim())}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data)
    } catch (err) {
      setError('Failed to search domains. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const handlePurchase = async (domain) => {
    if (!user) {
      navigate('/auth?redirect=/setup')
      return
    }

    setPurchasing(domain)
    try {
      const token = localStorage.getItem('togogo-token')
      const res = await fetch(`${API_BASE}/api/domains/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ domain }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Purchase failed')
      }

      const data = await res.json()

      if (data.checkout_url) {
        window.location.href = data.checkout_url
      }

      onDomainPurchased?.(domain)
    } catch (err) {
      setError(err.message)
    } finally {
      setPurchasing(null)
    }
  }

  return (
    <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06D6A0]/15">
          <Globe className="h-5 w-5 text-[#06D6A0]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Need a domain?</h3>
          <p className="text-[10px] text-zinc-500">Search and buy your store's domain name right here</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center rounded-xl bg-[#0a0a0a] border border-white/[0.06] overflow-hidden">
          <Search className="h-4 w-4 text-zinc-600 ml-3 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. mystore"
            className="flex-1 px-2 py-2.5 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="px-4 py-2.5 rounded-xl bg-[#06D6A0] text-black text-xs font-semibold hover:bg-[#06D6A0]/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Search
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
          <X className="h-3.5 w-3.5 text-red-400" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {results && (
        <div className="space-y-2">
          {results.domains.map((d) => (
            <div
              key={d.domain}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                d.available
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : d.available === false
                  ? 'bg-white/[0.02] border-white/[0.04] opacity-60'
                  : 'bg-white/[0.02] border-white/[0.06]'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{d.domain}</p>
                  {d.available === true && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                      AVAILABLE
                    </span>
                  )}
                  {d.available === false && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">
                      TAKEN
                    </span>
                  )}
                  {d.available === null && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                      CHECK
                    </span>
                  )}
                </div>
                {d.available && (
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Renews at ${d.renewalPrice}/year
                  </p>
                )}
              </div>

              {d.available !== false && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-[#06D6A0]">${d.price}</span>
                  <button
                    onClick={() => handlePurchase(d.domain)}
                    disabled={purchasing === d.domain}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#06D6A0] text-black text-[11px] font-semibold hover:bg-[#06D6A0]/90 transition-colors disabled:opacity-50"
                  >
                    {purchasing === d.domain ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-3 w-3" />
                    )}
                    Buy
                  </button>
                </div>
              )}
            </div>
          ))}

          {results.domains.length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-4">No domains found. Try a different name.</p>
          )}
        </div>
      )}
    </div>
  )
}
