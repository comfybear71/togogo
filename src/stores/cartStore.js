import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1) => {
        const items = get().items
        const existing = items.find(i => i.product.id === product.id)
        if (existing) {
          set({
            items: items.map(i =>
              i.product.id === product.id
                ? { ...i, quantity: i.quantity + quantity }
                : i
            )
          })
        } else {
          set({ items: [...items, { product, quantity }] })
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter(i => i.product.id !== productId) })
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) return get().removeItem(productId)
        set({
          items: get().items.map(i =>
            i.product.id === productId ? { ...i, quantity } : i
          )
        })
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => {
        return get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
      },

      getItemCount: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },
    }),
    { name: 'togogo-cart' }
  )
)
