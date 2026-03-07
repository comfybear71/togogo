import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

// Get user's watchlist from database
export function useWatchlist() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('watchlist')
        .select('*, product:products(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })
}

// Add product to watchlist
export function useAddToWatchlist() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async ({ productId, targetPrice }) => {
      const { data, error } = await supabase
        .from('watchlist')
        .insert({ user_id: user.id, product_id: productId, target_price: targetPrice })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  })
}

// Remove from watchlist
export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (watchlistId) => {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('id', watchlistId)
      if (error) throw error
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
      const { data, error } = await supabase
        .from('price_alerts')
        .select('*, deal:deals(*, product:products(*), retailer:retailers(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })
}
