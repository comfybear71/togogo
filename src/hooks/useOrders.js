import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useMyOrders(type = 'bought') {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['orders', type, user?.id],
    queryFn: async () => {
      const field = type === 'bought' ? 'buyer_id' : 'seller_id'
      const { data, error } = await supabase
        .from('orders')
        .select('*, product:products(id, title, images, price), buyer:users!buyer_id(id, name, avatar_url), seller:users!seller_id(id, name, avatar_url)')
        .eq(field, user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (order) => {
      const { data, error } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
}
