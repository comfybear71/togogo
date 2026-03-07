import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Fetch daily deals (featured deals with best scores)
export function useDailyDeals() {
  return useQuery({
    queryKey: ['daily-deals'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('deals')
        .select('*, product:products(*), retailer:retailers(*)')
        .eq('is_daily_deal', true)
        .eq('in_stock', true)
        .order('deal_score', { ascending: false })
        .limit(20)
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  })
}

// Search products with optional filters
export function useProductSearch(filters = {}) {
  const { query, category, sort, minPrice, maxPrice } = filters
  return useQuery({
    queryKey: ['product-search', filters],
    queryFn: async () => {
      let q = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)

      if (query) {
        q = q.or(`name.ilike.%${query}%,brand.ilike.%${query}%,description.ilike.%${query}%`)
      }
      if (category) {
        q = q.eq('category', category)
      }

      q = q.order('created_at', { ascending: false }).limit(50)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: true,
    staleTime: 2 * 60 * 1000,
  })
}

// Get single product with all its deals across retailers
export function useProduct(id) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data: product, error: pErr } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
      if (pErr) throw pErr

      const { data: deals, error: dErr } = await supabase
        .from('deals')
        .select('*, retailer:retailers(*)')
        .eq('product_id', id)
        .eq('in_stock', true)
        .order('price', { ascending: true })
      if (dErr) throw dErr

      return { ...product, deals: deals || [] }
    },
    enabled: !!id,
  })
}

// Get price history for a deal
export function usePriceHistory(dealId) {
  return useQuery({
    queryKey: ['price-history', dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('deal_id', dealId)
        .order('checked_at', { ascending: true })
        .limit(90) // last 90 data points
      if (error) throw error
      return data || []
    },
    enabled: !!dealId,
  })
}

// Get trending/popular products (most watched)
export function useTrendingProducts() {
  return useQuery({
    queryKey: ['trending-products'],
    queryFn: async () => {
      // Get products that have deals with high scores
      const { data, error } = await supabase
        .from('deals')
        .select('*, product:products(*), retailer:retailers(*)')
        .eq('in_stock', true)
        .order('deal_score', { ascending: false })
        .limit(12)
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Get deals by category
export function useCategoryDeals(category) {
  return useQuery({
    queryKey: ['category-deals', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*, product:products(*), retailer:retailers(*)')
        .eq('product.category', category)
        .eq('in_stock', true)
        .order('deal_score', { ascending: false })
        .limit(20)
      if (error) throw error
      return data || []
    },
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
  })
}
