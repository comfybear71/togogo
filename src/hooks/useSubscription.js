import { useQuery } from '@tanstack/react-query'
import { authFetch } from '../stores/authStore'
import { useAuthStore } from '../stores/authStore'

// Get user's current subscription
export function useSubscription() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      try {
        return await authFetch('/api/subscriptions/current')
      } catch {
        return { plan: 'paid' }
      }
    },
    enabled: !!user,
  })
}

// Get available retailers
export function useRetailers() {
  return useQuery({
    queryKey: ['retailers'],
    queryFn: async () => {
      try {
        return await authFetch('/api/retailers')
      } catch {
        return []
      }
    },
    staleTime: 30 * 60 * 1000,
  })
}
