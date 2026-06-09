import { useEffect, useState } from 'react'
import { Percent, Loader2, Check } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

function getAuthHeaders() {
  const token = localStorage.getItem('togogo-token')
  if (token) return { Authorization: `Bearer ${token}` }
  const secret = sessionStorage.getItem('togogo-setup-secret')
  if (secret) return { 'x-setup-secret': secret }
  return {}
}

// Margin-funded "spend A$X, save Y%" discount. OFF by default. The checkout
// hard-caps the discount so it can never sell below cost.
export default function SpendSaveWidget() {
  const [enabled, setEnabled] = useState(false)
  const [thresholdAud, setThresholdAud] = useState('50')
  const [percent, setPercent] = useState('10')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/spend-save`, { headers: getAuthHeaders() })
        const d = await res.json()
        if (!alive) return
        if (typeof d.enabled === 'boolean') setEnabled(d.enabled)
        if (d.thresholdAud) setThresholdAud(String(d.thresholdAud))
        if (d.percent) setPercent(String(d.percent))
      } catch { /* keep defaults */ } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  async function save(next = {}) {
    setSaving(true); setSaved(false); setError(null)
    const body = {
      enabled: next.enabled !== undefined ? next.enabled : enabled,
      thresholdAud: parseFloat(thresholdAud) || 0,
      percent: parseFloat(percent) || 0,
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/spend-save`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Save failed')
      if (typeof d.enabled === 'boolean') setEnabled(d.enabled)
      if (d.thresholdAud) setThresholdAud(String(d.thresholdAud))
      if (d.percent) setPercent(String(d.percent))
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
        <span className="text-sm text-zinc-500">Loading Spend & Save…</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <Percent className="h-5 w-5 text-[#FF6B35] mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-white">Spend &amp; Save discount</h3>
            <p className="text-xs text-zinc-500 mt-0.5 max-w-md">
              Give customers {percent || 0}% off when they spend over A${thresholdAud || 0}.
              Comes out of margin and can never sell below cost.
            </p>
          </div>
        </div>
        {/* On/off toggle saves immediately */}
        <button
          onClick={() => { const next = !enabled; setEnabled(next); save({ enabled: next }) }}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${enabled ? 'bg-[#06D6A0]' : 'bg-zinc-700'} disabled:opacity-50`}
          title={enabled ? 'Enabled — tap to turn off' : 'Off — tap to turn on'}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-zinc-400">
          <span className="block mb-1">Min cart (AUD)</span>
          <input
            type="number" inputMode="decimal" min="0" step="1"
            value={thresholdAud}
            onChange={e => setThresholdAud(e.target.value)}
            className="w-28 rounded-lg border border-white/[0.08] bg-black px-3 py-2 text-sm text-white focus:border-[#FF6B35] focus:outline-none"
          />
        </label>
        <label className="text-xs text-zinc-400">
          <span className="block mb-1">Discount %</span>
          <input
            type="number" inputMode="decimal" min="0" max="90" step="1"
            value={percent}
            onChange={e => setPercent(e.target.value)}
            className="w-24 rounded-lg border border-white/[0.08] bg-black px-3 py-2 text-sm text-white focus:border-[#FF6B35] focus:outline-none"
          />
        </label>
        <button
          onClick={() => save()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6B35] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 min-h-[40px]"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
