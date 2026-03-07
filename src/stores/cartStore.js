import { create } from 'zustand'

export const useWatchlistStore = create((set, get) => ({
  items: JSON.parse(localStorage.getItem('togogo_watchlist') || '[]'),

  addItem: (product) => {
    const items = get().items
    if (items.find((i) => i.id === product.id)) return
    const updated = [...items, { ...product, addedAt: new Date().toISOString(), targetPrice: null }]
    localStorage.setItem('togogo_watchlist', JSON.stringify(updated))
    set({ items: updated })
  },

  removeItem: (productId) => {
    const updated = get().items.filter((i) => i.id !== productId)
    localStorage.setItem('togogo_watchlist', JSON.stringify(updated))
    set({ items: updated })
  },

  setTargetPrice: (productId, price) => {
    const updated = get().items.map((i) =>
      i.id === productId ? { ...i, targetPrice: price } : i
    )
    localStorage.setItem('togogo_watchlist', JSON.stringify(updated))
    set({ items: updated })
  },

  isWatching: (productId) => get().items.some((i) => i.id === productId),

  getItemCount: () => get().items.length,

  clearAll: () => {
    localStorage.removeItem('togogo_watchlist')
    set({ items: [] })
  },
}))
