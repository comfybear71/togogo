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
  const [authLoading, setAuthLoading] = useState(false)
  const [error, setError] = useState(null)

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

  async function reauthorize() {
    if (authLoading) return
    setAuthLoading(true)
    setError(null)
    // Snapshot the CURRENT token's obtained_at so we can tell when the
    // callback saves a genuinely NEW token. The old code treated "a token
    // is present" as success — but an expired token is already present, so
    // it closed the popup after ~1s, before the user could even sign in to
    // AliExpress. That's why re-auth silently did nothing.
    const prevObtainedAt = status?.obtained_at || null
    try {
      const res = await fetch(`${API_BASE}/api/admin/ae-auth-url`, { headers: getAuthHeaders() })
      const data = await res.json()
      if (!data.auth_url) {
        setError(data.error || 'Failed to get authorization URL')
        setAuthLoading(false)
        return
      }
      // Open AliExpress auth in a new window/tab.
      const authWindow = window.open(data.auth_url, 'AliExpress Auth', 'width=800,height=600')
      // Poll for a brand-new token (obtained_at changes once the callback
      // exchanges the code and saves it). Give the user up to 3 minutes to
      // finish signing in + tapping Authorize.
      let elapsed = 0
      const pollInterval = setInterval(async () => {
        elapsed += 2
        try {
          const statusRes = await fetch(`${API_BASE}/api/admin/ae-token-status`, { headers: getAuthHeaders() })
          const statusData = await statusRes.json()
          if (statusData.present && statusData.obtained_at && statusData.obtained_at !== prevObtainedAt) {
            clearInterval(pollInterval)
            authWindow?.close()
            setAuthLoading(false)
            await load()
            return
          }
        } catch {
          // keep polling
        }
        if (elapsed >= 180) {
          clearInterval(pollInterval)
          setAuthLoading(false)
          setError('Re-authorization didn’t complete. In the AliExpress window, sign in and tap Authorize — then it saves automatically. Try again if needed.')
        }
      }, 2000)
    } catch (err) {
      setError(err.message)
      setAuthLoading(false)
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
            href="/api/platforms/callback/aliexpress"
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
          <button
            onClick={reauthorize}
            disabled={authLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-black px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.04] disabled:opacity-50"
            title="Re-authorize if auto-refresh stops working"
          >
            {authLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
            Re-auth
          </button>
        </div>
      </div>
    </div>
  )
}
