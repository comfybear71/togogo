import { useQuery } from '@tanstack/react-query'

// On Vercel, API routes are on the same domain (relative paths work)
// For local dev, fall back to Express server
const API_BASE = import.meta.env.VITE_API_URL || ''

// Search products across all suppliers via ToGoGo gateway
export function useSupplierSearch(filters = {}) {
  const { query, category, supplier, sort, page = 1 } = filters

  return useQuery({
    queryKey: ['supplier-search', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (query) params.set('query', query)
      if (category) params.set('category', category)
      if (supplier) params.set('supplier', supplier)
      if (sort) params.set('sort', sort)
      params.set('page', String(page))

      const res = await fetch(`${API_BASE}/api/dropship/search?${params}`)
      if (!res.ok) throw new Error('Failed to search suppliers')
      return res.json()
    },
    enabled: Boolean(query || category),
    staleTime: 2 * 60 * 1000, // 2 min cache
  })
}

// Get trending products
export function useTrendingProducts(category) {
  return useQuery({
    queryKey: ['supplier-trending', category],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (category) params.set('category', category)

      const res = await fetch(`${API_BASE}/api/dropship/trending?${params}`)
      if (!res.ok) throw new Error('Failed to fetch trending products')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Get product categories
export function useSupplierCategories() {
  return useQuery({
    queryKey: ['supplier-categories'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/dropship/categories`)
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json()
    },
    staleTime: 30 * 60 * 1000, // 30 min cache
  })
}
