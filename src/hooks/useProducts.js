import { useQuery } from '@tanstack/react-query'
import { authFetch } from '../stores/authStore'

// Fetch daily deals (featured deals with best scores)
export function useDailyDeals() {
  return useQuery({
    queryKey: ['daily-deals'],
    queryFn: async () => {
      try {
        return await authFetch('/api/products/deals?type=daily&limit=20')
      } catch {
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Search products with optional filters
export function useProductSearch(filters = {}) {
  const { query, category, sort } = filters
  return useQuery({
    queryKey: ['product-search', filters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams()
        if (query) params.set('q', query)
        if (category) params.set('category', category)
        if (sort) params.set('sort', sort)
        return await authFetch(`/api/products/search?${params}`)
      } catch {
        return []
      }
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
      return await authFetch(`/api/products/${id}`)
    },
    enabled: !!id,
  })
}

// Get price history for a deal
export function usePriceHistory(dealId) {
  return useQuery({
    queryKey: ['price-history', dealId],
    queryFn: async () => {
      try {
        return await authFetch(`/api/products/price-history?deal_id=${dealId}`)
      } catch {
        return []
      }
    },
    enabled: !!dealId,
  })
}

// Get trending/popular products (most watched)
export function useTrendingProducts() {
  return useQuery({
    queryKey: ['trending-products'],
    queryFn: async () => {
      try {
        return await authFetch('/api/products/deals?type=trending&limit=12')
      } catch {
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Get deals by category
export function useCategoryDeals(category) {
  return useQuery({
    queryKey: ['category-deals', category],
    queryFn: async () => {
      try {
        return await authFetch(`/api/products/deals?type=category&category=${category}&limit=20`)
      } catch {
        return []
      }
    },
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
  })
}
