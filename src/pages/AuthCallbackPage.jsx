import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const handleAuthCallback = useAuthStore(s => s.handleAuthCallback)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = searchParams.get('token')
    const err = searchParams.get('error')

    if (err) {
      setError(err)
      setTimeout(() => navigate('/auth'), 3000)
      return
    }

    if (token) {
      handleAuthCallback(token)
        .then(() => navigate('/dashboard'))
        .catch(() => {
          setError('Authentication failed')
          setTimeout(() => navigate('/auth'), 3000)
        })
    } else {
      navigate('/auth')
    }
  }, [searchParams, handleAuthCallback, navigate])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <p className="text-red-400 text-sm">{error}</p>
        <p className="text-zinc-500 text-xs">Redirecting to sign in...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <Loader2 className="h-6 w-6 text-[#FF6B35] animate-spin" />
      <p className="text-zinc-400 text-sm">Signing you in...</p>
    </div>
  )
}
