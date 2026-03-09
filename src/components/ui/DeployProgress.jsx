import { useState, useEffect, useRef } from 'react'
import { Clock, ExternalLink } from 'lucide-react'

// ============================================
// DEPLOY STEPS — The full cinematic sequence
// ============================================
//   Phase 1: Pre-payment setup (steps 0-7)
//   Phase 2: Payment checkpoint
//   Phase 3: Post-payment finalization (steps 8-14)
// ============================================
const DEPLOY_STEPS = [
  // Phase 1 — Building the store
  {
    id: 'validate',
    emoji: '\u{1F50D}',
    doneEmoji: '\u{2705}',
    label: 'Validating store details',
    doneText: 'Store details validated',
    detail: 'Checking name, subdomain & account...',
    phase: 1,
  },
  {
    id: 'subdomain',
    emoji: '\u{1F310}',
    doneEmoji: '\u{2705}',
    label: 'Reserving your subdomain',
    doneText: null, // dynamic
    detail: 'Claiming your .togogo.me address...',
    phase: 1,
  },
  {
    id: 'dns',
    emoji: '\u{1F4E1}',
    doneEmoji: '\u{2705}',
    label: 'Configuring DNS records',
    doneText: 'DNS records configured',
    detail: 'Pointing your domain to our servers...',
    phase: 1,
  },
  {
    id: 'ssl',
    emoji: '\u{1F512}',
    doneEmoji: '\u{2705}',
    label: 'Provisioning SSL certificate',
    doneText: 'SSL certificate active — HTTPS secured',
    detail: 'Securing your store with encryption...',
    phase: 1,
  },
  {
    id: 'storefront',
    emoji: '\u{1F3E0}',
    doneEmoji: '\u{2705}',
    label: 'Building your storefront',
    doneText: 'Storefront built & deployed',
    detail: 'Installing WordPress + WooCommerce...',
    phase: 1,
  },
  {
    id: 'theme',
    emoji: '\u{1F3A8}',
    doneEmoji: '\u{2705}',
    label: 'Applying theme & branding',
    doneText: 'Theme & branding applied',
    detail: 'Setting your colors, fonts & layout...',
    phase: 1,
  },
  {
    id: 'products',
    emoji: '\u{1F4E6}',
    doneEmoji: '\u{2705}',
    label: 'Importing products from suppliers',
    doneText: 'Products imported & ready to sell',
    detail: 'Syncing product catalog from suppliers...',
    phase: 1,
  },
  {
    id: 'control-panel',
    emoji: '\u{1F4BB}',
    doneEmoji: '\u{2705}',
    label: 'Setting up your control panel',
    doneText: 'Control panel configured & ready',
    detail: 'Building your admin dashboard...',
    phase: 1,
  },
  // ── PAYMENT CHECKPOINT ──
  {
    id: 'payment',
    emoji: '\u{1F4B3}',
    doneEmoji: '\u{2705}',
    label: 'Awaiting payment...',
    doneText: 'Payment confirmed — subscription active!',
    detail: 'Complete payment to activate your store...',
    phase: 'payment', // Special phase
  },
  // Phase 2 — Post-payment wiring
  {
    id: 'payment-wiring',
    emoji: '\u{26A1}',
    doneEmoji: '\u{2705}',
    label: 'Wiring up payment processing',
    doneText: 'Stripe payments connected & live',
    detail: 'Connecting Stripe checkout to your store...',
    phase: 2,
  },
  {
    id: 'suppliers',
    emoji: '\u{1F517}',
    doneEmoji: '\u{2705}',
    label: 'Connecting supplier network',
    doneText: 'All suppliers linked — auto-fulfillment active',
    detail: 'Wiring up dropship fulfillment pipelines...',
    phase: 2,
  },
  {
    id: 'wiring',
    emoji: '\u{1F50C}',
    doneEmoji: '\u{2705}',
    label: 'Wiring up all connections',
    doneText: 'All platform connections wired up',
    detail: 'Connecting APIs, webhooks & sync...',
    phase: 2,
  },
  {
    id: 'analytics',
    emoji: '\u{1F4CA}',
    doneEmoji: '\u{2705}',
    label: 'Activating analytics & tracking',
    doneText: 'Analytics dashboard live',
    detail: 'Setting up sales tracking & reports...',
    phase: 2,
  },
  {
    id: 'final-checks',
    emoji: '\u{1F9EA}',
    doneEmoji: '\u{2705}',
    label: 'Running final health checks',
    doneText: 'All systems green — everything healthy',
    detail: 'Testing every endpoint & connection...',
    phase: 2,
  },
  {
    id: 'go-live',
    emoji: '\u{1F680}',
    doneEmoji: '\u{1F389}',
    label: 'Going live!',
    doneText: null, // dynamic
    detail: 'Flipping the switch...',
    phase: 2,
  },
]

// ============================================
// HELPERS
// ============================================
function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `0:${s.toString().padStart(2, '0')}`
}

// ============================================
// CONFETTI BURST
// ============================================
function Confetti({ active }) {
  if (!active) return null
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 1,
    duration: 1.5 + Math.random() * 2,
    color: ['#FF6B35', '#06D6A0', '#FFD23F', '#3B82F6', '#EC4899', '#8B5CF6', '#10B981', '#F59E0B'][i % 8],
    size: 4 + Math.random() * 8,
    rotation: Math.random() * 360,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute deploy-confetti"
          style={{
            left: `${p.x}%`,
            top: '-8%',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  )
}

// ============================================
// DEPLOY PROGRESS COMPONENT
// ============================================
export default function DeployProgress({
  storeName,
  storeUrl,
  onPaymentNeeded,    // Called when we reach the payment step
  paymentComplete,    // Set to true when payment is confirmed
  paymentCancelled,   // Set to true if payment cancelled/failed
  onComplete,         // Called when everything is done
  onOpenPanel,        // Called to open the user's control panel
  externalSteps,      // Optional server-polled steps
  externalStatus,     // Optional server status
}) {
  const [steps, setSteps] = useState(() =>
    DEPLOY_STEPS.map((s) => ({ ...s, status: 'pending' }))
  )
  const [elapsed, setElapsed] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const logRef = useRef(null)
  const startTimeRef = useRef(Date.now())
  const simIndexRef = useRef(0)
  const simTimeoutRef = useRef(null)

  const resolvedUrl = storeUrl || `https://${storeName?.toLowerCase().replace(/[^a-z0-9]/g, '-')}.togogo.me`

  // ── Client-side simulation engine ──
  useEffect(() => {
    if (cancelled) return

    const delays = [900, 1300, 1500, 1800, 2400, 1700, 2100, 1900, 0, 1400, 1600, 1800, 1200, 1500, 2000]

    const advanceStep = () => {
      const idx = simIndexRef.current
      if (idx >= DEPLOY_STEPS.length) {
        // All done!
        setTimeout(() => {
          setIsComplete(true)
          setShowConfetti(true)
          if (onComplete) onComplete()
        }, 600)
        return
      }

      const step = DEPLOY_STEPS[idx]

      // ── PAYMENT CHECKPOINT ──
      if (step.phase === 'payment') {
        // Mark payment step as in_progress
        setSteps((prev) =>
          prev.map((s, i) => {
            if (i < idx) return { ...s, status: 'completed' }
            if (i === idx) return { ...s, status: 'in_progress' }
            return s
          })
        )
        setIsPaused(true)
        // Trigger payment flow
        if (onPaymentNeeded) onPaymentNeeded()
        return // Pause here — resumed when paymentComplete becomes true
      }

      // Mark current step as in_progress
      setSteps((prev) =>
        prev.map((s, i) => {
          if (i < idx) return { ...s, status: 'completed' }
          if (i === idx) return { ...s, status: 'in_progress' }
          return s
        })
      )

      // After delay, complete and advance
      simTimeoutRef.current = setTimeout(() => {
        setSteps((prev) =>
          prev.map((s, i) => {
            if (i <= idx) return { ...s, status: 'completed' }
            return s
          })
        )
        simIndexRef.current = idx + 1
        // Small gap then next step
        simTimeoutRef.current = setTimeout(advanceStep, 350)
      }, delays[idx] || 1500)
    }

    // Start simulation
    simTimeoutRef.current = setTimeout(advanceStep, 500)

    return () => {
      if (simTimeoutRef.current) clearTimeout(simTimeoutRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resume after payment confirmed ──
  useEffect(() => {
    if (paymentComplete && isPaused) {
      setIsPaused(false)
      // Mark payment step as completed
      const paymentIdx = DEPLOY_STEPS.findIndex((s) => s.id === 'payment')
      setSteps((prev) =>
        prev.map((s, i) => {
          if (i <= paymentIdx) return { ...s, status: 'completed' }
          return s
        })
      )
      simIndexRef.current = paymentIdx + 1

      // Continue simulation after brief celebration
      const delays = [900, 1300, 1500, 1800, 2400, 1700, 2100, 1900, 0, 1400, 1600, 1800, 1200, 1500, 2000]
      const advanceStep = () => {
        const idx = simIndexRef.current
        if (idx >= DEPLOY_STEPS.length) {
          setTimeout(() => {
            setIsComplete(true)
            setShowConfetti(true)
            if (onComplete) onComplete()
          }, 600)
          return
        }

        setSteps((prev) =>
          prev.map((s, i) => {
            if (i < idx) return { ...s, status: 'completed' }
            if (i === idx) return { ...s, status: 'in_progress' }
            return s
          })
        )

        simTimeoutRef.current = setTimeout(() => {
          setSteps((prev) =>
            prev.map((s, i) => {
              if (i <= idx) return { ...s, status: 'completed' }
              return s
            })
          )
          simIndexRef.current = idx + 1
          simTimeoutRef.current = setTimeout(advanceStep, 350)
        }, delays[idx] || 1500)
      }

      simTimeoutRef.current = setTimeout(advanceStep, 800)
    }
  }, [paymentComplete, isPaused, onComplete])

  // ── Payment cancelled — tear down ──
  useEffect(() => {
    if (paymentCancelled && !cancelled) {
      setCancelled(true)
      if (simTimeoutRef.current) clearTimeout(simTimeoutRef.current)
      // Mark all pending/in-progress as failed
      setSteps((prev) =>
        prev.map((s) => {
          if (s.status === 'in_progress' || s.status === 'pending') {
            return { ...s, status: 'cancelled' }
          }
          return s
        })
      )
    }
  }, [paymentCancelled, cancelled])

  // ── Elapsed timer ──
  useEffect(() => {
    if (isComplete || cancelled) return
    const tick = () => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isComplete, cancelled])

  // ── Auto-scroll ──
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [steps])

  // ── Computed values ──
  const completedCount = steps.filter((s) => s.status === 'completed').length
  const totalSteps = steps.length
  const progress = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0
  const activeStep = steps.find((s) => s.status === 'in_progress')
  const remainingSteps = totalSteps - completedCount
  const avgPerStep = completedCount > 0 ? elapsed / completedCount : 2
  const estRemaining = Math.max(0, Math.round(remainingSteps * avgPerStep))

  // ── CANCELLED STATE ──
  if (cancelled) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="rounded-2xl border border-red-500/20 bg-[#0c0c0c] overflow-hidden shadow-2xl">
          <div className="px-5 py-6 text-center">
            <div className="text-4xl mb-3">{'\u{274C}'}</div>
            <h3 className="text-lg font-heading font-bold text-red-400 mb-2">
              Store Deployment Cancelled
            </h3>
            <p className="text-xs text-zinc-500 mb-1">
              Payment was not completed. Your store has been removed.
            </p>
            <p className="text-[10px] text-zinc-600">
              All provisioned resources have been cleaned up.
            </p>
          </div>
          <div className="px-5 pb-5">
            <button
              onClick={() => window.location.href = '/create-store'}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-bold hover:bg-[#FF6B35]/90 transition-colors"
            >
              {'\u{1F504}'} Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg mx-auto relative">
      <Confetti active={showConfetti} />

      {/* ── Main container ── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0c] overflow-hidden shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-[#111]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-3 h-3 rounded-full transition-colors duration-500 ${
                isComplete ? 'bg-emerald-400'
                : isPaused ? 'bg-[#FFD23F]'
                : 'bg-[#06D6A0]'
              }`} />
              {!isComplete && (
                <div className={`absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-75 ${
                  isPaused ? 'bg-[#FFD23F]' : 'bg-[#06D6A0]'
                }`} />
              )}
            </div>
            <div>
              <span className={`text-sm font-bold transition-colors duration-500 ${
                isComplete ? 'text-emerald-400'
                : isPaused ? 'text-[#FFD23F]'
                : 'text-[#06D6A0]'
              }`}>
                {isComplete
                  ? `\u{1F389} ${storeName || 'Store'} is LIVE!`
                  : isPaused
                  ? '\u{1F4B3} Complete payment to continue...'
                  : 'Deploying your store...'}
              </span>
              {!isComplete && activeStep && !isPaused && (
                <p className="text-[10px] text-zinc-500 mt-0.5">{activeStep.detail}</p>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className={`text-xs font-mono font-bold ${
              isComplete ? 'text-emerald-400' : 'text-[#06D6A0]'
            }`}>
              {formatElapsed(elapsed)}
            </span>
            <p className="text-[9px] text-zinc-600">elapsed</p>
          </div>
        </div>

        {/* ── Progress Bar ── */}
        <div className="px-5 py-3 border-b border-white/[0.06] bg-[#0e0e0e]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-300 font-semibold">
              {isComplete
                ? `\u{2705} All ${totalSteps} steps complete!`
                : isPaused
                ? `\u{23F8}\u{FE0F} Paused — awaiting payment (${completedCount}/${totalSteps})`
                : activeStep
                ? `Step ${completedCount + 1} of ${totalSteps}`
                : 'Initializing...'}
            </span>
            {!isComplete && !isPaused && estRemaining > 0 && (
              <span className="text-[10px] text-zinc-500 font-mono">
                ~{estRemaining}s remaining
              </span>
            )}
          </div>

          {/* Progressive bar */}
          <div className="relative h-3.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden ${
                isComplete
                  ? 'bg-emerald-500'
                  : isPaused
                  ? 'bg-[#FFD23F]'
                  : 'deploy-progress-bar'
              }`}
              style={{ width: `${isComplete ? 100 : progress}%` }}
            >
              {/* Animated shine */}
              {!isComplete && progress > 0 && !isPaused && (
                <div className="absolute inset-0 deploy-progress-shine" />
              )}
            </div>
            {/* Step markers on the bar */}
            {totalSteps > 1 && (
              <div className="absolute inset-0 flex items-center">
                {steps.map((_, i) => {
                  if (i === 0) return null
                  const pct = (i / totalSteps) * 100
                  return (
                    <div
                      key={i}
                      className="absolute w-px h-2 bg-white/[0.08]"
                      style={{ left: `${pct}%` }}
                    />
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-zinc-500 font-medium">
              {completedCount} of {totalSteps} done
            </span>
            <span className={`text-[11px] font-bold font-mono ${
              isComplete ? 'text-emerald-400'
              : isPaused ? 'text-[#FFD23F]'
              : 'text-[#06D6A0]'
            }`}>
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* ── Step Log — Each step bangs in ── */}
        <div
          ref={logRef}
          className="px-4 py-3 max-h-[450px] overflow-y-auto space-y-0.5"
          style={{ scrollBehavior: 'smooth' }}
        >
          {steps.map((step, i) => {
            const isDone = step.status === 'completed'
            const isActive = step.status === 'in_progress'
            const isPending = step.status === 'pending'
            const isCancelled = step.status === 'cancelled'
            const isPaymentStep = step.id === 'payment'

            // Dynamic done text
            let doneLabel = step.doneText || step.label
            if (step.id === 'subdomain' && isDone) {
              doneLabel = `Subdomain reserved \u{2192} ${resolvedUrl.replace('https://', '')}`
            }
            if (step.id === 'go-live' && isDone) {
              doneLabel = `${storeName || 'Your store'} is LIVE at ${resolvedUrl.replace('https://', '')}`
            }

            return (
              <div
                key={step.id}
                className={`flex items-start gap-2.5 py-1.5 px-2 rounded-lg transition-all duration-500 ${
                  isActive && isPaymentStep
                    ? 'bg-[#FFD23F]/[0.08] border border-[#FFD23F]/20'
                    : isActive
                    ? 'bg-[#06D6A0]/[0.06]'
                    : ''
                } ${
                  isPending ? 'opacity-25' : isCancelled ? 'opacity-20' : 'opacity-100'
                }`}
                style={{
                  animation: (isDone || isActive)
                    ? 'deploy-step-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                    : 'none',
                }}
              >
                {/* Step number badge */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                  isDone
                    ? 'bg-white/10 text-white'
                    : isActive && isPaymentStep
                    ? 'bg-[#FFD23F]/20 text-[#FFD23F] deploy-step-number-pulse'
                    : isActive
                    ? 'bg-[#06D6A0]/20 text-[#06D6A0] deploy-step-number-pulse'
                    : 'bg-white/[0.03] text-zinc-700'
                }`}>
                  {isDone ? '\u{2714}' : isCancelled ? '\u{2716}' : i + 1}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  {isDone ? (
                    <span className="text-[12px] text-white font-medium">
                      {step.doneEmoji} {doneLabel}
                    </span>
                  ) : isActive ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[12px] font-semibold ${
                          isPaymentStep ? 'text-[#FFD23F]' : 'text-[#06D6A0]'
                        }`}>
                          {step.emoji} {step.label}
                        </span>
                        {!isPaymentStep && (
                          <span className="flex gap-[3px] ml-0.5">
                            <span className={`w-1 h-1 rounded-full animate-bounce ${
                              isPaymentStep ? 'bg-[#FFD23F]' : 'bg-[#06D6A0]'
                            }`} style={{ animationDelay: '0ms' }} />
                            <span className={`w-1 h-1 rounded-full animate-bounce ${
                              isPaymentStep ? 'bg-[#FFD23F]' : 'bg-[#06D6A0]'
                            }`} style={{ animationDelay: '150ms' }} />
                            <span className={`w-1 h-1 rounded-full animate-bounce ${
                              isPaymentStep ? 'bg-[#FFD23F]' : 'bg-[#06D6A0]'
                            }`} style={{ animationDelay: '300ms' }} />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{step.detail}</p>
                    </div>
                  ) : isCancelled ? (
                    <span className="text-[12px] text-red-400/50 line-through">
                      {step.emoji} {step.label}
                    </span>
                  ) : (
                    <span className="text-[12px] text-zinc-600">
                      {step.emoji} {step.label}
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {/* ── Completion banner ── */}
          {isComplete && (
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <div
                className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-[#06D6A0]/10 border border-emerald-500/20 p-5 text-center"
                style={{ animation: 'deploy-step-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
              >
                <div className="text-3xl mb-2">{'\u{1F389}\u{1F680}\u{1F389}'}</div>
                <p className="text-lg font-heading font-bold text-emerald-400 mb-1">
                  Store deployed in {formatElapsed(elapsed)}!
                </p>
                <p className="text-xs text-zinc-400 mb-1">
                  {'\u{1F517}'} {resolvedUrl}
                </p>
                <p className="text-[10px] text-zinc-500 mb-4">
                  Your store is fully wired up and accepting orders.
                </p>

                <div className="flex gap-2">
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Visit Store
                  </a>
                  {onOpenPanel && (
                    <button
                      onClick={onOpenPanel}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-bold hover:bg-[#FF6B35]/90 transition-colors"
                    >
                      {'\u{1F4BB}'} Open Control Panel
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/[0.06] bg-[#0a0a0a]">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-zinc-600" />
            <span className="text-[10px] text-zinc-500 font-mono">
              {formatElapsed(elapsed)}
            </span>
          </div>

          {/* Mini step dots */}
          <div className="flex items-center gap-1">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                  step.status === 'completed'
                    ? 'bg-white scale-100'
                    : step.status === 'in_progress'
                    ? step.id === 'payment' ? 'bg-[#FFD23F] animate-pulse scale-125' : 'bg-[#06D6A0] animate-pulse scale-125'
                    : step.status === 'cancelled'
                    ? 'bg-red-500/30 scale-75'
                    : 'bg-zinc-800 scale-75'
                }`}
              />
            ))}
          </div>

          <span className={`text-[10px] font-mono font-bold ${isComplete ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {completedCount}/{totalSteps}
          </span>
        </div>
      </div>
    </div>
  )
}
