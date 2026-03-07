import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useProducts(filters = {}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, seller:users(id, name, avatar_url, trust_score)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (filters.category) query = query.eq('category', filters.category)
      if (filters.search) query = query.ilike('title', `%${filters.search}%`)
      if (filters.minPrice) query = query.gte('price', filters.minPrice)
      if (filters.maxPrice) query = query.lte('price', filters.maxPrice)
      if (filters.condition) query = query.eq('condition', filters.condition)
      if (filters.limit) query = query.limit(filters.limit)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}

export function useProduct(id) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, seller:users(id, name, avatar_url, trust_score, bio, location_suburb)')
        .eq('id', id)
        .single()
      if (error) throw error
      // Increment views
      supabase.rpc('increment_views', { product_id: id }).catch(() => {})
      return data
    },
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (product) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', data.id] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useTrendingProducts() {
  return useQuery({
    queryKey: ['products', 'trending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, seller:users(id, name, avatar_url, trust_score)')
        .eq('status', 'active')
        .order('views_count', { ascending: false })
        .limit(20)
      if (error) throw error
      return data || []
    },
  })
}

export function useSellerProducts(sellerId) {
  return useQuery({
    queryKey: ['products', 'seller', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!sellerId,
  })
}
