import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Loader2, CreditCard, RefreshCw, ExternalLink } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function TestPaymentPage() {
  const [searchParams] = useSearchParams()
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const paymentResult = searchParams.get('result')

  async function runTests() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/subscriptions/test`)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`API returned ${res.status}: ${text.slice(0, 200)}`)
      }
      const data = await res.json()
      setResults(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runTests()
  }, [])

  const statusIcon = (status) => {
    if (status === 'pass') return <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
    if (status === 'fail') return <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
    if (status === 'warn') return <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
    return <AlertTriangle className="h-5 w-5 text-zinc-500 flex-shrink-0" />
  }

  const statusBorder = (status) => {
    if (status === 'pass') return 'border-green-500/20 bg-green-500/5'
    if (status === 'fail') return 'border-red-500/20 bg-red-500/5'
    if (status === 'warn') return 'border-yellow-500/20 bg-yellow-500/5'
    return 'border-white/[0.06] bg-white/[0.02]'
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-[#FF6B35] transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF6B35]/10">
            <CreditCard className="h-6 w-6 text-[#FF6B35]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Payment Gateway Test</h1>
            <p className="text-sm text-zinc-500">Diagnose Stripe integration issues</p>
          </div>
        </div>

        {/* Payment return result */}
        {paymentResult && (
          <div className={`mt-6 rounded-xl border p-4 ${paymentResult === 'success'
            ? 'border-green-500/30 bg-green-500/10'
            : 'border-red-500/30 bg-red-500/10'
          }`}>
            <div className="flex items-center gap-2">
              {paymentResult === 'success'
                ? <CheckCircle2 className="h-5 w-5 text-green-400" />
                : <XCircle className="h-5 w-5 text-red-400" />
              }
              <p className="font-semibold">
                {paymentResult === 'success'
                  ? 'Test payment completed successfully!'
                  : 'Test payment was cancelled.'
                }
              </p>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              {paymentResult === 'success'
                ? 'Stripe checkout flow is working end-to-end. The $1.00 test charge will appear in your Stripe dashboard.'
                : 'You cancelled the checkout. The payment flow itself is working — you just didn\'t complete it.'
              }
            </p>
          </div>
        )}

        {/* Refresh button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={runTests}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.1] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Re-run Tests
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="mt-8 flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 text-[#FF6B35] animate-spin" />
            <p className="text-sm text-zinc-500">Running Stripe diagnostics...</p>
          </div>
        )}

        {/* Network error */}
        {error && !loading && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-5">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-300">Could not reach the test endpoint</p>
                <p className="text-sm text-red-400/80 mt-1 font-mono break-all">{error}</p>
                <div className="mt-3 rounded-lg bg-black/30 p-3">
                  <p className="text-xs font-semibold text-zinc-300 mb-1">This means:</p>
                  <ul className="text-xs text-zinc-500 space-y-1 list-disc list-inside">
                    <li>The API endpoint <code className="text-[#FF6B35] font-mono">/api/subscriptions/test</code> may not be deployed yet</li>
                    <li>Or the server is unreachable</li>
                    <li>Push your latest code and redeploy, then try again</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test results */}
        {results && !loading && (
          <div className="mt-6 space-y-4">
            {/* Overall status */}
            <div className={`rounded-xl border p-4 ${statusBorder(results.overall)}`}>
              <div className="flex items-center gap-2">
                {statusIcon(results.overall)}
                <p className="font-bold text-lg">
                  {results.overall === 'pass' && 'All checks passed'}
                  {results.overall === 'warn' && 'Passed with warnings'}
                  {results.overall === 'fail' && 'Issues found'}
                </p>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Tested at {new Date(results.timestamp).toLocaleString()}</p>
            </div>

            {/* Individual checks */}
            {Object.entries(results.checks).map(([key, check]) => (
              <div key={key} className={`rounded-xl border p-4 ${statusBorder(check.status)}`}>
                <div className="flex items-start gap-3">
                  {statusIcon(check.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm capitalize">
                      {key.replace(/_/g, ' ')}
                      {check.mode && (
                        <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          check.mode === 'LIVE'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {check.mode} MODE
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-zinc-400 mt-0.5 break-all">{check.message}</p>

                    {/* Show products list */}
                    {check.products && check.products.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold text-zinc-500">Products:</p>
                        {check.products.map(p => (
                          <p key={p.id} className="text-xs text-zinc-500 font-mono">{p.id} — {p.name}</p>
                        ))}
                      </div>
                    )}

                    {/* Show prices list */}
                    {check.prices && check.prices.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold text-zinc-500">Prices:</p>
                        {check.prices.map(p => (
                          <p key={p.id} className="text-xs text-zinc-500 font-mono">
                            {p.id} — ${(p.amount / 100).toFixed(2)} {p.currency.toUpperCase()} / {p.recurring}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Checkout session link */}
                    {check.session_url && (
                      <a
                        href={check.session_url}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#FFD23F] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#FFD23F]/90 transition-colors"
                      >
                        <CreditCard className="h-4 w-4" />
                        Open Test Checkout ($1.00 AUD)
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Help section */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-5 mt-6">
              <p className="text-sm font-semibold text-zinc-300 mb-3">Troubleshooting Guide</p>
              <div className="space-y-3 text-xs text-zinc-500">
                <div>
                  <p className="font-semibold text-zinc-400">Stripe Secret Key fails:</p>
                  <p>Add <code className="text-[#FF6B35] font-mono">STRIPE_SECRET_KEY</code> to your Vercel Environment Variables. Get it from <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-[#FF6B35] underline">Stripe Dashboard → API Keys</a>.</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-400">Stripe API connection fails:</p>
                  <p>Your secret key may be invalid or expired. Generate a new one from the Stripe dashboard.</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-400">Checkout session fails:</p>
                  <p>Make sure your Stripe account is fully activated (not restricted). Check <a href="https://dashboard.stripe.com/settings/account" target="_blank" rel="noopener noreferrer" className="text-[#FF6B35] underline">Stripe Settings</a>.</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-400">Webhook secret warning:</p>
                  <p>Add <code className="text-[#FF6B35] font-mono">STRIPE_WEBHOOK_SECRET</code> for production. Get it from <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="text-[#FF6B35] underline">Stripe Webhooks</a>.</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-400">Test card numbers for Stripe test mode:</p>
                  <ul className="mt-1 space-y-0.5 list-disc list-inside">
                    <li><code className="font-mono text-zinc-300">4242 4242 4242 4242</code> — Successful payment</li>
                    <li><code className="font-mono text-zinc-300">4000 0000 0000 0002</code> — Card declined</li>
                    <li>Use any future expiry, any CVC, any postcode</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
