import { useEffect, useState } from 'react'
import { Key, RefreshCw, ExternalLink, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

function getAuthHeaders() {
  const token = localStorage.getItem('togogo-token')
  if (token) return { Authorization: `Bearer ${token}` }
  const secret = sessionStorage.getItem('togogo-setup-secret')
  if (secret) return { 'x-setup-secret': secret }
  return {}
}

const STATUS_STYLES = {
  ok: { dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-400/20', label: 'Healthy' },
  warning: { dot: 'bg-yellow-400', text: 'text-yellow-400', border: 'border-yellow-400/20', label: 'Expiring soon' },
  critical: { dot: 'bg-red-400', text: 'text-red-400', border: 'border-red-400/20', label: 'Critical — refresh now' },
  expired: { dot: 'bg-red-500', text: 'text-red-500', border: 'border-red-500/30', label: 'Expired' },
  missing: { dot: 'bg-zinc-500', text: 'text-zinc-500', border: 'border-zinc-500/30', label: 'Not authorized' },
}

export default function AEOAuthTokenWidget() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // One-click re-authorization: navigate the whole page to the AliExpress
  // sign-in (via our redirect endpoint). When it returns the token is saved
  // and this widget reloads green. Far more reliable on iPad/iPhone than a
  // popup — mobile Safari blocks/auto-closes popups.
  const reauthUrl = `${API_BASE}/api/admin/ae-connect`

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/ae-token-status`, { headers: getAuthHeaders() })
      const data = await res.json()
      setStatus(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function refresh() {
    if (refreshing) return
    setRefreshing(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/ae-token-status?action=refresh`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (data.success) {
        await load()
      } else {
        setError(data.error || 'Refresh failed')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
        <span className="text-sm text-zinc-500">Checking AliExpress token...</span>
      </div>
    )
  }

  if (!status || !status.present) {
    return (
      <div className="rounded-xl border border-zinc-500/30 bg-[#0a0a0a] p-4">
        <div className="flex items-center gap-3">
          <Key className="h-5 w-5 text-zinc-500" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-white">AliExpress OAuth</h3>
            <p className="text-xs text-zinc-500 mt-0.5">No token saved — authorize to unlock product details, freight, wholesale.</p>
          </div>
          <a
            href={reauthUrl}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#FF6B35] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#FF6B35]/90"
          >
            <ExternalLink className="h-3 w-3" />
            Authorize
          </a>
        </div>
      </div>
    )
  }

  const style = STATUS_STYLES[status.status] || STATUS_STYLES.ok
  const days = status.access_token_days_remaining
  const refreshDays = status.refresh_token_days_remaining
  const daysText = days === null ? '—' : days < 0 ? `${Math.abs(days)} days ago` : `${days} day${days === 1 ? '' : 's'}`

  return (
    <div className={`rounded-xl border ${style.border} bg-[#0a0a0a] p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Key className="h-5 w-5 text-zinc-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium text-white">AliExpress OAuth</h3>
              <span className={`inline-flex items-center gap-1.5 text-xs ${style.text}`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`}></span>
                {style.label}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
              <span>
                Access expires in <span className={style.text}>{daysText}</span>
              </span>
              {refreshDays !== null && (
                <span>Refresh valid for {refreshDays} more days</span>
              )}
              {status.account && (
                <span className="truncate">· {status.account}</span>
              )}
            </div>
            {error && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-black px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.04] disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Refresh
          </button>
          <a
            href={reauthUrl}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-black px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.04]"
            title="Re-authorize AliExpress — opens the AliExpress sign-in, then returns here"
          >
            <ExternalLink className="h-3 w-3" />
            Re-auth
          </a>
        </div>
      </div>
    </div>
  )
}
