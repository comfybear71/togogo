import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Loader2, AlertCircle, CreditCard } from 'lucide-react'
import { authFetch } from '../stores/authStore'

export default function SetupPaymentsPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState(null) // null = loading, object = loaded
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState(false)
  const [error, setError] = useState(null)

  // Check current Connect status
  useEffect(() => {
    async function checkStatus() {
      try {
        const data = await authFetch('/api/connect/status')
        setStatus(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    checkStatus()
  }, [])

  // Start onboarding
  const startOnboarding = useCallback(async () => {
    setOnboarding(true)
    setError(null)
    try {
      const data = await authFetch('/api/connect/onboard', { method: 'POST' })

      if (!data.clientSecret) {
        throw new Error('Failed to create onboarding session')
      }

      // Load Stripe Connect embedded onboarding
      const stripeConnectInstance = await loadConnectAndInitialize(data.clientSecret)
      if (stripeConnectInstance) {
        const container = document.getElementById('stripe-connect-onboarding')
        if (container) {
          container.innerHTML = ''
          const onboardingElement = stripeConnectInstance.create('account-onboarding')
          onboardingElement.setOnExit(() => {
            // User completed or exited onboarding — refresh status
            window.location.reload()
          })
          container.appendChild(onboardingElement)
        }
      }
    } catch (err) {
      setError(err.message)
      setOnboarding(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    )
  }

  const isConnected = status?.status === 'active'
  const isPending = status?.status === 'pending_verification'

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </button>

        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#06D6A0]/10">
            <CreditCard className="h-8 w-8 text-[#06D6A0]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Payment Setup</h1>
          <p className="text-sm text-zinc-400">Connect your bank account to receive payments from your store</p>
        </div>

        {/* Status Card */}
        <div className="rounded-2xl bg-[#111] border border-white/[0.06] p-6 mb-6">
          {isConnected ? (
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-[#06D6A0] mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Payments Connected</h3>
              <p className="text-sm text-zinc-400 mb-4">Your Stripe account is active and ready to receive payments</p>
              {status.balance && (
                <div className="flex justify-center gap-6 text-center">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Available</p>
                    <p className="text-xl font-bold text-[#06D6A0]">${status.balance.available.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Pending</p>
                    <p className="text-xl font-bold text-zinc-300">${status.balance.pending.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>
          ) : isPending ? (
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 text-[#FFD23F] mb-3 animate-spin" style={{ animationDuration: '3s' }} />
              <h3 className="text-lg font-bold text-white mb-1">Verification Pending</h3>
              <p className="text-sm text-zinc-400 mb-4">Stripe is reviewing your account. This usually takes 1-2 business days.</p>
              <button
                onClick={startOnboarding}
                className="rounded-xl bg-[#FFD23F] px-6 py-3 text-sm font-semibold text-black hover:bg-[#f0c430] transition-colors"
              >
                Complete Setup
              </button>
            </div>
          ) : (
            <div className="text-center">
              <CreditCard className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Connect Payments</h3>
              <p className="text-sm text-zinc-400 mb-6">Set up Stripe to receive payments when customers buy from your store. You'll need your bank details and ID.</p>
              <button
                onClick={startOnboarding}
                disabled={onboarding}
                className="rounded-xl bg-[#06D6A0] px-8 py-3.5 text-sm font-bold text-white hover:bg-[#05b88a] transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {onboarding ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Setting up...</>
                ) : (
                  <><CreditCard className="h-4 w-4" /> Connect with Stripe</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Setup Error</p>
              <p className="text-xs text-red-400/70 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Embedded Stripe Connect Onboarding */}
        <div id="stripe-connect-onboarding" className="min-h-[200px]" />

        {/* Info */}
        <div className="mt-8 space-y-3">
          <div className="rounded-xl bg-[#111] border border-white/[0.06] p-4">
            <h4 className="text-xs font-semibold text-white mb-1">How it works</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              When a customer buys from your store, the payment goes through Stripe. Your share (minus the platform fee) is automatically transferred to your connected bank account.
            </p>
          </div>
          <div className="rounded-xl bg-[#111] border border-white/[0.06] p-4">
            <h4 className="text-xs font-semibold text-white mb-1">What you'll need</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Your full name, date of birth, Australian bank account details (BSB + account number), and a form of ID for verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Load Stripe Connect JS
async function loadConnectAndInitialize(clientSecret) {
  // Load the script if not already loaded
  if (!window.StripeConnect) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://connect-js.stripe.com/connect-js/v1.0/connect.js'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  // Initialize
  const stripeConnectInstance = window.StripeConnect.init({
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    fetchClientSecret: () => clientSecret,
    appearance: {
      colorPrimary: '#FF6B35',
      colorBackground: '#111111',
      colorText: '#ffffff',
      colorSecondaryText: '#a1a1aa',
      colorBorder: '#27272a',
      borderRadius: { base: '12px' },
    },
  })

  return stripeConnectInstance
}
