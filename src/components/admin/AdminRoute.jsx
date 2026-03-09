import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { Shield, Loader2, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function AdminRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const [setupSecret, setSetupSecret] = useState(sessionStorage.getItem('togogo-setup-secret') || '')
  const [checking, setChecking] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [error, setError] = useState(null)

  // Check access: either admin user token or valid setup secret
  useEffect(() => {
    // Wait for auth store to finish loading
    if (authLoading) return

    // If user is logged in as admin, grant access
    if (user?.role === 'admin') {
      setHasAccess(true)
      setChecking(false)
      return
    }

    // If there's a stored setup secret, validate it via API
    const storedSecret = sessionStorage.getItem('togogo-setup-secret')
    if (storedSecret) {
      validateSecret(storedSecret)
      return
    }

    // No auth — show login prompt
    setChecking(false)
  }, [authLoading, user])

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-[#FF6B35] animate-spin" />
          <p className="text-sm text-gray-500">Checking admin access...</p>
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#FF6B35]">
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B35]/10">
            <Shield className="h-5 w-5 text-[#FF6B35]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Admin Access</h2>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Enter your <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-[#FF6B35]">JWT_SECRET</code> from
          your Vercel environment variables to access the admin panel.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={setupSecret}
            onChange={(e) => setSetupSecret(e.target.value)}
            placeholder="Paste your JWT_SECRET here"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 mb-4 font-mono"
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

        <div className="mt-6 rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-700 mb-1">Where to find your JWT_SECRET:</p>
          <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
            <li>Go to your <span className="font-medium text-gray-700">Vercel Dashboard</span></li>
            <li>Open your project → <span className="font-medium text-gray-700">Settings</span> → <span className="font-medium text-gray-700">Environment Variables</span></li>
            <li>Copy the value of <code className="rounded bg-white px-1 py-0.5 font-mono text-[#FF6B35]">JWT_SECRET</code></li>
            <li>If it doesn't exist yet, create it with any secure random string</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
