import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  if (requiredRole && profile?.role !== requiredRole && profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
