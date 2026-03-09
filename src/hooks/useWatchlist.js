import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authFetch, useAuthStore } from '../stores/authStore'

// Get user's watchlist from database
export function useWatchlist() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: async () => {
      try {
        return await authFetch('/api/watchlist')
      } catch {
        return []
      }
    },
    enabled: !!user,
  })
}

// Add product to watchlist
export function useAddToWatchlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ productId, targetPrice }) => {
      return await authFetch('/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, target_price: targetPrice }),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  })
}

// Remove from watchlist
export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (watchlistId) => {
      return await authFetch(`/api/watchlist/${watchlistId}`, { method: 'DELETE' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  })
}

// Get user's price alerts
export function usePriceAlerts() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['price-alerts', user?.id],
    queryFn: async () => {
      try {
        return await authFetch('/api/watchlist/alerts')
      } catch {
        return []
      }
    },
    enabled: !!user,
  })
}
