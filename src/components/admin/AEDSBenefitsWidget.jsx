import { useEffect, useState } from 'react'
import { TrendingUp, Loader2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

function getAuthHeaders() {
  const token = localStorage.getItem('togogo-token')
  if (token) return { Authorization: `Bearer ${token}` }
  const secret = sessionStorage.getItem('togogo-setup-secret')
  if (secret) return { 'x-setup-secret': secret }
  return {}
}

// Read-only snapshot of the AliExpress dropshipping account's savings:
// volume-based DS level/benefit (live, needs OAuth) plus our own AE spend.
// Helps size customer discounts without eroding margin.
export default function AEDSBenefitsWidget() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/ds-benefits`, { headers: getAuthHeaders() })
        const json = await res.json()
        if (alive) setData(json)
      } catch {
        /* leave data null */
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
        <span className="text-sm text-zinc-500">Checking AliExpress DS savings…</span>
      </div>
    )
  }
  if (!data) return null

  const spent = parseFloat(data.orderStats?.total_spent_usd || 0)
  const orders = parseInt(data.orderStats?.ae_orders || 0, 10)
  // Benefit shape is account-dependent — pull a level/discount out of whatever
  // AliExpress returns, defensively.
  const b = data.benefits || {}
  const level = b.level || b.member_level || b.memberLevel || b.dsLevel || b.grade || null
  const discount = b.discount || b.discount_rate || b.discountRate || b.benefit || null

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4">
      <div className="flex items-start gap-3">
        <TrendingUp className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white">AliExpress DS Savings</h3>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
            <span>AE orders: <span className="text-white">{orders}</span></span>
            <span>Total spent: <span className="text-white">US${spent.toFixed(2)}</span></span>
            {level && <span>Level: <span className="text-emerald-400">{String(level)}</span></span>}
            {discount && <span>Discount: <span className="text-emerald-400">{String(discount)}</span></span>}
          </div>
          {!level && (
            <p className="mt-1.5 text-[11px] text-zinc-500 leading-snug">
              {data.error
                ? `Couldn't read DS benefits live: ${data.error}`
                : `AliExpress didn't report a DS level for this account yet. ${data.levels || ''}`}
            </p>
          )}
          {level && data.levels && (
            <p className="mt-1.5 text-[11px] text-zinc-500 leading-snug">{data.levels}</p>
          )}
        </div>
      </div>
    </div>
  )
}
