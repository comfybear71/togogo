import { useState } from 'react'
import { Loader2, Play, FileText, AlertTriangle, Copy, Check } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

function getAuthHeaders() {
  const token = localStorage.getItem('togogo-token')
  if (token) return { Authorization: `Bearer ${token}` }
  const secret = sessionStorage.getItem('togogo-setup-secret')
  if (secret) return { 'x-setup-secret': secret }
  return {}
}

const METHODS = [
  { name: 'aliexpress.ds.feedname.get', desc: 'List all DS feed names', oauth: false, preset: '{}' },
  { name: 'aliexpress.ds.recommend.feed.get', desc: 'Products from a feed', oauth: false, preset: '{\n  "feed_name": "DS_Global_topsellers",\n  "page_no": "1",\n  "page_size": "10",\n  "target_currency": "AUD",\n  "target_language": "EN",\n  "country": "AU"\n}' },
  { name: 'aliexpress.ds.text.search', desc: 'Text search for products', oauth: false, preset: '{\n  "keyWord": "led light",\n  "countryCode": "AU",\n  "currency": "AUD",\n  "local": "en_US",\n  "pageNo": "1",\n  "pageSize": "10"\n}' },
  { name: 'aliexpress.ds.image.searchV2', desc: 'Image search', oauth: false, preset: '{\n  "imgurl": "https://example.com/image.jpg",\n  "countryCode": "AU"\n}' },
  { name: 'aliexpress.ds.category.get', desc: 'Get category tree', oauth: false, preset: '{\n  "language": "EN"\n}' },
  { name: 'aliexpress.ds.product.get', desc: 'Full product details (OAuth required)', oauth: true, preset: '{\n  "product_id": "1005007746629992",\n  "target_currency": "AUD",\n  "target_language": "EN",\n  "ship_to_country": "AU"\n}' },
  { name: 'aliexpress.ds.product.wholesale.get', desc: 'Tier / bulk pricing', oauth: true, preset: '{\n  "product_id": "1005007746629992"\n}' },
  { name: 'aliexpress.ds.product.specialinfo.get', desc: 'Promotional info', oauth: false, preset: '{\n  "product_id": "1005007746629992"\n}' },
  { name: 'aliexpress.ds.freight.query', desc: 'Shipping cost per product', oauth: false, preset: '{\n  "product_id": "1005007746629992",\n  "country_code": "AU",\n  "product_num": "1",\n  "send_goods_country_code": "CN"\n}' },
  { name: 'aliexpress.ds.order.create', desc: 'Create order — ⚠ PLACES REAL ORDER WITH AUTO-PAY', oauth: false, preset: '{}', warning: true },
  { name: 'aliexpress.ds.order.pay', desc: 'Pay for an existing order', oauth: false, preset: '{\n  "out_order_id": ""\n}' },
  { name: 'aliexpress.ds.order.tracking.get', desc: 'Tracking info', oauth: false, preset: '{\n  "ae_order_id": ""\n}' },
  { name: 'aliexpress.ds.trade.order.get', desc: 'DS trade order details', oauth: false, preset: '{\n  "ae_order_id": ""\n}' },
  { name: 'aliexpress.trade.ds.order.get', desc: 'Trade order details', oauth: false, preset: '{\n  "single_order_query": "{\\"order_id\\":\\"...\\"}"\n}' },
  { name: 'aliexpress.ds.member.benefit.get', desc: 'Member coupons / benefits', oauth: true, preset: '{}' },
  { name: 'aliexpress.ds.member.orderdata.submit', desc: 'Submit member order data', oauth: false, preset: '{}' },
  { name: 'aliexpress.ds.feed.itemids.get', desc: 'Item IDs from feed', oauth: false, preset: '{\n  "feed_name": "DS_Global_topsellers",\n  "page_no": "1",\n  "page_size": "50"\n}' },
  { name: 'aliexpress.ds.search.event.report', desc: 'Report search event', oauth: false, preset: '{}' },
  { name: 'aliexpress.logistics.buyer.freight.calculate', desc: 'Buyer-side freight (OAuth required)', oauth: true, preset: '{\n  "param_aeop_freight_calculate_for_buyer_d_t_o": "{\\"product_id\\":\\"1005007746629992\\",\\"product_num\\":1,\\"country_code\\":\\"AU\\",\\"send_goods_country_code\\":\\"CN\\"}"\n}' },
  { name: 'aliexpress.logistics.ds.trackinginfo.query', desc: 'Tracking info (logistics)', oauth: false, preset: '{\n  "logistics_no": "",\n  "origin": "CN",\n  "to_area": "AU"\n}' },
]

export default function ApiTesterPage() {
  const [selectedMethod, setSelectedMethod] = useState(METHODS[8].name) // default to freight.query
  const [paramsText, setParamsText] = useState(METHODS[8].preset)
  const [useOAuth, setUseOAuth] = useState(METHODS[8].oauth)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [spec, setSpec] = useState(null)
  const [specLoading, setSpecLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const currentMethodMeta = METHODS.find(m => m.name === selectedMethod)

  function handleMethodChange(methodName) {
    const meta = METHODS.find(m => m.name === methodName)
    setSelectedMethod(methodName)
    setParamsText(meta?.preset || '{}')
    setUseOAuth(!!meta?.oauth)
    setResponse(null)
    setSpec(null)
  }

  async function fetchSpec() {
    setSpecLoading(true)
    setSpec(null)
    try {
      const res = await fetch(`${API_BASE}/api/admin/api-tester`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'spec', method: selectedMethod }),
      })
      const data = await res.json()
      setSpec(data)
    } catch (err) {
      setSpec({ success: false, error: err.message })
    } finally {
      setSpecLoading(false)
    }
  }

  async function sendRequest() {
    setLoading(true)
    setResponse(null)

    let params = {}
    try {
      params = paramsText.trim() ? JSON.parse(paramsText) : {}
    } catch (err) {
      setResponse({ success: false, error: 'Invalid JSON in params: ' + err.message })
      setLoading(false)
      return
    }

    if (currentMethodMeta?.warning) {
      const confirmMsg = '⚠ This method will PLACE A REAL ORDER with auto-pay. Are you absolutely sure?'
      if (!window.confirm(confirmMsg)) {
        setLoading(false)
        return
      }
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/api-tester`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'call', method: selectedMethod, params, useOAuth }),
      })
      const data = await res.json()
      setResponse(data)
    } catch (err) {
      setResponse({ success: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  function copyResponse() {
    if (!response) return
    navigator.clipboard.writeText(JSON.stringify(response, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AliExpress API Tester</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Test any AliExpress API method and inspect the raw response. Admin-only.
        </p>
      </div>

      {/* Method selector */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-4">
        <label className="block text-xs font-medium text-zinc-400 mb-2">API Method</label>
        <select
          value={selectedMethod}
          onChange={(e) => handleMethodChange(e.target.value)}
          className="w-full rounded-md border border-white/[0.08] bg-black px-3 py-2 text-sm text-white focus:border-[#FF6B35] focus:outline-none"
        >
          {METHODS.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name} {m.oauth ? ' (OAuth)' : ''} {m.warning ? ' ⚠' : ''}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-zinc-500">{currentMethodMeta?.desc}</p>

        {currentMethodMeta?.warning && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>This method places a real order with auto-pay enabled. You will be charged. A confirm dialog appears before sending.</span>
          </div>
        )}
      </div>

      {/* OAuth toggle */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useOAuth}
            onChange={(e) => setUseOAuth(e.target.checked)}
            className="h-4 w-4 rounded border-white/[0.08] bg-black text-[#FF6B35] focus:ring-[#FF6B35]"
          />
          <span className="text-sm text-white">Include OAuth access_token</span>
          <span className="text-xs text-zinc-500">
            (required for ds.product.get, wholesale, member.benefit, logistics.buyer.*)
          </span>
        </label>
      </div>

      {/* Params editor */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-4">
        <label className="block text-xs font-medium text-zinc-400 mb-2">Parameters (JSON)</label>
        <textarea
          value={paramsText}
          onChange={(e) => setParamsText(e.target.value)}
          className="w-full rounded-md border border-white/[0.08] bg-black px-3 py-2 text-xs font-mono text-white focus:border-[#FF6B35] focus:outline-none"
          rows={10}
          spellCheck={false}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={sendRequest}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-[#FF6B35] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF6B35]/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Send Request
        </button>
        <button
          onClick={fetchSpec}
          disabled={specLoading}
          className="inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-black px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/[0.04] disabled:opacity-50"
        >
          {specLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Fetch AE Docs
        </button>
      </div>

      {/* Spec display */}
      {spec && (
        <div className="rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white">AliExpress Documentation</h3>
            <span className={`text-xs ${spec.success ? 'text-emerald-400' : 'text-red-400'}`}>
              {spec.success ? 'Loaded' : 'Failed'}
            </span>
          </div>
          <pre className="max-h-96 overflow-auto rounded-md border border-white/[0.06] bg-black p-3 text-xs font-mono text-zinc-300">
            {JSON.stringify(spec.spec || spec, null, 2)}
          </pre>
        </div>
      )}

      {/* Response display */}
      {response && (
        <div className="rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-medium text-white">Response</h3>
              {response.durationMs != null && (
                <span className="text-xs text-zinc-500">{response.durationMs}ms</span>
              )}
              <span className={`text-xs font-medium ${response.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {response.success ? '✓ Success' : '✗ Failed'}
              </span>
            </div>
            <button
              onClick={copyResponse}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-black px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {response.error && (
            <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
              {response.error}
            </div>
          )}
          <pre className="max-h-[600px] overflow-auto rounded-md border border-white/[0.06] bg-black p-3 text-xs font-mono text-zinc-300">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
