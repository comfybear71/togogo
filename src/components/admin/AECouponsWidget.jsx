import { useEffect, useState } from 'react'
import { Ticket, Loader2, Plus, Trash2, AlertTriangle, Check } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

function getAuthHeaders() {
  const token = localStorage.getItem('togogo-token')
  if (token) return { Authorization: `Bearer ${token}` }
  const secret = sessionStorage.getItem('togogo-setup-secret')
  if (secret) return { 'x-setup-secret': secret }
  return {}
}

// Manage the AliExpress coupon codes applied to orders. The first/top code is
// the active one. If AliExpress rejects it, the order still goes through
// (without the coupon) and the rejection is shown here so you can swap it out.
export default function AECouponsWidget() {
  const [codes, setCodes] = useState([])
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newCode, setNewCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/ae-coupons`, { headers: getAuthHeaders() })
      const d = await res.json()
      setCodes(Array.isArray(d.codes) ? d.codes : [])
      setStatus(d.status || null)
    } catch { /* keep current */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function post(body) {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/admin/ae-coupons`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      if (Array.isArray(d.codes)) setCodes(d.codes)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function add() {
    const c = newCode.trim()
    if (!c) return
    await post({ code: c })
    setNewCode('')
  }

  const failed = status?.lastFailedCode
  const failedStillListed = failed && codes.some(c => c.code === failed)

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4">
      <div className="flex items-start gap-3 mb-3">
        <Ticket className="h-5 w-5 text-[#FFD23F] mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-white">AliExpress coupon codes</h3>
          <p className="text-xs text-zinc-500 mt-0.5 max-w-md">
            Applied to your AliExpress orders to cut your cost. The top code is active.
            If a code is rejected (expired), the order still goes through without it.
          </p>
        </div>
      </div>

      {/* Rejection warning so you know to swap an expired code out */}
      {failedStillListed && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-yellow-400/20 bg-yellow-400/[0.06] p-2.5 text-xs text-yellow-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            Code <strong>{failed}</strong> was rejected by AliExpress
            {status?.lastFailedAt ? ` on ${new Date(status.lastFailedAt).toLocaleDateString()}` : ''} —
            it’s likely expired. Orders still went through without it. Remove it and add a current code.
          </span>
        </div>
      )}
      {status?.lastUsedCode && !failedStillListed && (
        <div className="mb-3 flex items-center gap-1.5 text-xs text-emerald-400">
          <Check className="h-3.5 w-3.5" />
          Last order used <strong>{status.lastUsedCode}</strong>
          {status.lastUsedAt ? ` (${new Date(status.lastUsedAt).toLocaleDateString()})` : ''}
        </div>
      )}

      {/* Add */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Paste a coupon code (e.g. AUAP05)"
          value={newCode}
          onChange={e => setNewCode(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          className="flex-1 rounded-lg border border-white/[0.08] bg-black px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-[#FFD23F] focus:outline-none"
        />
        <button
          onClick={add}
          disabled={busy || !newCode.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFD23F] px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : codes.length === 0 ? (
        <p className="text-xs text-zinc-500">No coupon codes yet. Add one above when you collect one from AliExpress.</p>
      ) : (
        <ul className="space-y-1.5">
          {codes.map((c, i) => (
            <li key={c.code} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black px-3 py-2">
              <span className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-sm text-white select-all truncate">{c.code}</span>
                {i === 0 && <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 rounded px-1.5 py-0.5 flex-shrink-0">ACTIVE</span>}
                {c.note && <span className="text-xs text-zinc-500 truncate">— {c.note}</span>}
              </span>
              <button
                onClick={() => post({ action: 'delete', code: c.code })}
                disabled={busy}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-white/[0.04] disabled:opacity-50 flex-shrink-0"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
