import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'

const API_BASE = import.meta.env.VITE_API_URL || ''

function getAuthHeaders() {
  const token = localStorage.getItem('togogo-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Get all platform connections for the current user
export function usePlatformConnections() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['platform-connections'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/platforms/connections`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error('Failed to fetch platform connections')
      return res.json()
    },
    enabled: Boolean(user),
    staleTime: 30 * 1000,
  })
}

// Start OAuth connection to a platform
export function useConnectPlatform() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ platform, shop_name, shop_url }) => {
      const res = await fetch(`${API_BASE}/api/platforms/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ platform, shop_name, shop_url }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to start connection')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-connections'] })
    },
  })
}

// Save API keys for platforms that use direct auth (PrestaShop, Depop)
export function useConnectPlatformKeys() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ platform, api_key, api_secret, store_url }) => {
      const res = await fetch(`${API_BASE}/api/platforms/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ platform, api_key, api_secret, store_url, type: 'api_keys' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save API keys')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-connections'] })
    },
  })
}

// Disconnect a platform
export function useDisconnectPlatform() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (platform) => {
      const res = await fetch(`${API_BASE}/api/platforms/disconnect?platform=${encodeURIComponent(platform)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error('Failed to disconnect platform')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-connections'] })
    },
  })
}

// Push a product to a specific platform
export function usePushProduct() {
  return useMutation({
    mutationFn: async ({ platform, product }) => {
      const res = await fetch(`${API_BASE}/api/platforms/push-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ platform, product }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to push product')
      }
      return res.json()
    },
  })
}

// Push a product to ALL connected platforms
export function usePushProductAll() {
  return useMutation({
    mutationFn: async (product) => {
      const res = await fetch(`${API_BASE}/api/platforms/push-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ product, all: true }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to push product')
      }
      return res.json()
    },
  })
}
