import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { User, CreditCard, LogOut, ExternalLink } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

// Client-side Account page. Moved out of /profile so the client
// dashboard has its own settings surface accessible from the sidebar.
// Intentionally sparse for Phase 1 — only the actions a store owner
// actually needs today. More settings added in Phase 2+.
//
// Elderly-friendly patterns:
//   - Each section is a labelled card with a 20px heading.
//   - Plain-language descriptions under every action.
//   - Destructive action (Sign out) has a confirmation modal.
//   - Links to Stripe / external pages clearly marked with icon.

export default function AccountPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const signOut = useAuthStore(s => s.signOut)
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  async function handleSignOut() {
    await signOut?.()
    navigate('/')
  }

  async function openStripePortal() {
    // Placeholder — Stripe Customer Portal requires a session API.
    // For Phase 1 we send users to the generic subscription page which
    // already has a portal redirect wired.
    navigate('/subscription')
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8 text-[16px]">
      <header className="mb-8">
        <h1 className="text-[28px] md:text-[32px] font-bold text-white mb-1">Account</h1>
        <p className="text-[16px] text-zinc-400">Manage your profile, payments, and how you sign in.</p>
      </header>

      {/* Profile — read-only for MVP. Editing lands in Phase 2. */}
      <Card icon={User} title="Your details">
        <Row label="Name"  value={user?.name  || '—'} />
        <Row label="Email" value={user?.email || '—'} />
        <p className="text-[14px] text-zinc-500 mt-3">
          Need to change these? Email us and we'll sort it out — self-serve editing is coming soon.
        </p>
      </Card>

      {/* Subscription */}
      <Card icon={CreditCard} title="Subscription">
        <p className="text-[16px] text-zinc-300 mb-4">
          Manage your ToGoGo plan, billing, and invoices.
        </p>
        <button
          onClick={openStripePortal}
          className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-5 py-3 text-[16px] font-semibold text-white hover:opacity-90 min-h-[48px]"
        >
          Manage subscription
          <ExternalLink className="h-4 w-4" aria-hidden />
        </button>
      </Card>

      {/* Sign out */}
      <Card icon={LogOut} title="Sign out" tone="danger">
        <p className="text-[16px] text-zinc-300 mb-4">
          You'll need to sign in again next time you visit.
        </p>
        {confirmSignOut ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSignOut}
              className="rounded-xl bg-red-500 px-5 py-3 text-[16px] font-semibold text-white hover:bg-red-400 min-h-[48px]"
            >
              Yes, sign me out
            </button>
            <button
              onClick={() => setConfirmSignOut(false)}
              className="rounded-xl border border-white/[0.12] px-5 py-3 text-[16px] font-semibold text-white hover:bg-white/[0.06] min-h-[48px]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmSignOut(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-[16px] font-semibold text-red-300 hover:bg-red-500/20 min-h-[48px]"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        )}
      </Card>
    </div>
  )
}

function Card({ icon: Icon, title, children, tone }) {
  const border = tone === 'danger' ? 'border-red-500/20' : 'border-white/[0.06]'
  return (
    <section className={`mb-5 rounded-2xl border ${border} bg-[#111] p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`h-5 w-5 ${tone === 'danger' ? 'text-red-400' : 'text-[#FF6B35]'}`} aria-hidden />
        <h2 className="text-[20px] font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-white/[0.04] last:border-b-0">
      <span className="text-[15px] text-zinc-500">{label}</span>
      <span className="text-[16px] text-white">{value}</span>
    </div>
  )
}
