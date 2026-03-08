import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Helper to make authenticated API calls
async function authFetch(url, options = {}) {
  const token = localStorage.getItem('togogo-token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export { authFetch }

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      loading: true,

      initialize: async () => {
        const token = localStorage.getItem('togogo-token')
        if (!token) {
          set({ user: null, profile: null, loading: false })
          return
        }

        try {
          const data = await authFetch('/api/auth/me')
          set({ user: data.user, profile: data.user, loading: false })
        } catch {
          // Token invalid or expired
          localStorage.removeItem('togogo-token')
          set({ user: null, profile: null, loading: false })
        }
      },

      signUp: async (email, password, metadata) => {
        const data = await authFetch('/api/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ email, password, name: metadata?.name }),
        })
        localStorage.setItem('togogo-token', data.token)
        set({ user: data.user, profile: data.user })
        return data
      },

      signIn: async (email, password) => {
        const data = await authFetch('/api/auth/signin', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        localStorage.setItem('togogo-token', data.token)
        set({ user: data.user, profile: data.user })
        return data
      },

      signInWithGoogle: async () => {
        // Redirect to our Google OAuth endpoint
        window.location.href = `${API_BASE}/api/auth/google`
      },

      // Called when returning from Google OAuth callback
      handleAuthCallback: async (token) => {
        localStorage.setItem('togogo-token', token)
        try {
          const data = await authFetch('/api/auth/me')
          set({ user: data.user, profile: data.user })
          return data.user
        } catch {
          localStorage.removeItem('togogo-token')
          throw new Error('Failed to authenticate')
        }
      },

      // Demo sign-in for testing (no database required)
      demoSignIn: () => {
        const demoUser = {
          id: 'demo-user-001',
          email: 'test@togogo.com',
          name: 'Test User',
          avatar_url: null,
          role: 'both',
          wallet_balance: 0,
          location_suburb: null,
          location_country: null,
          verification_level: 'basic',
        }
        localStorage.setItem('togogo-token', 'demo-token')
        set({ user: demoUser, profile: demoUser, loading: false })
      },

      signOut: async () => {
        localStorage.removeItem('togogo-token')
        set({ user: null, profile: null })
      },

      updateProfile: async (updates) => {
        const data = await authFetch('/api/auth/profile', {
          method: 'PUT',
          body: JSON.stringify(updates),
        })
        set({ profile: data.user })
        return data.user
      },
    }),
    { name: 'togogo-auth', partialize: (state) => ({ profile: state.profile }) }
  )
)
