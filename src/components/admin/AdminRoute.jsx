import { useState, useEffect } from 'react'
import { Shield, Loader2, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function AdminRoute({ children }) {
  const [setupSecret, setSetupSecret] = useState(sessionStorage.getItem('togogo-setup-secret') || '')
  const [checking, setChecking] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [error, setError] = useState(null)

  // Check access: verify via API call (checks DB role, not JWT payload)
  useEffect(() => {
    const token = localStorage.getItem('togogo-token')
    const storedSecret = sessionStorage.getItem('togogo-setup-secret')

    if (token) {
      // Verify admin access via API — this checks DB role
      verifyAdminAccess(token)
    } else if (storedSecret) {
      validateSecret(storedSecret)
    } else {
      setChecking(false)
    }
  }, [])

  async function verifyAdminAccess(token) {
    setChecking(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setHasAccess(true)
      } else {
        // Token exists but not admin — show secret prompt
        setHasAccess(false)
      }
    } catch {
      setError('Could not reach the server')
    } finally {
      setChecking(false)
    }
  }

  async function validateSecret(secret) {
    setChecking(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { 'x-setup-secret': secret },
      })
      if (res.ok) {
        sessionStorage.setItem('togogo-setup-secret', secret)
        setHasAccess(true)
      } else {
        sessionStorage.removeItem('togogo-setup-secret')
        setError('Invalid secret — check your JWT_SECRET environment variable')
        setHasAccess(false)
      }
    } catch {
      setError('Could not reach the server — check your deployment')
    } finally {
      setChecking(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (setupSecret.trim()) {
      validateSecret(setupSecret.trim())
    }
  }

  // Still loading auth state
  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-[#FF6B35] animate-spin" />
          <p className="text-sm text-zinc-500">Checking admin access...</p>
        </div>
      </div>
    )
  }

  // Access granted
  if (hasAccess) {
    return children
  }

  // Show login gate
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-8 max-w-md w-full">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-[#FF6B35]">
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B35]/10">
            <Shield className="h-5 w-5 text-[#FF6B35]" />
          </div>
          <h2 className="text-xl font-bold text-white">Admin Access</h2>
        </div>

        <p className="text-sm text-zinc-500 mb-6">
          Enter your <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs font-mono text-[#FF6B35]">JWT_SECRET</code> from
          your Vercel environment variables to access the admin panel.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={setupSecret}
            onChange={(e) => setSetupSecret(e.target.value)}
            placeholder="Paste your JWT_SECRET here"
            className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 mb-4 font-mono"
            autoFocus
          />
          <button
            type="submit"
            disabled={!setupSecret.trim()}
            className="w-full rounded-xl bg-[#FF6B35] px-5 py-3 text-sm font-semibold text-white hover:bg-[#FF6B35]/90 transition-colors disabled:opacity-50"
          >
            Access Admin Panel
          </button>
        </form>

        <div className="mt-6 rounded-xl bg-[#0a0a0a] p-4">
          <p className="text-xs font-semibold text-zinc-300 mb-1">Where to find your JWT_SECRET:</p>
          <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
            <li>Go to your <span className="font-medium text-zinc-300">Vercel Dashboard</span></li>
            <li>Open your project → <span className="font-medium text-zinc-300">Settings</span> → <span className="font-medium text-zinc-300">Environment Variables</span></li>
            <li>Copy the value of <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[#FF6B35]">JWT_SECRET</code></li>
            <li>If it doesn't exist yet, create it with any secure random string</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
