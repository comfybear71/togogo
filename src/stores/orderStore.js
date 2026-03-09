import { create } from 'zustand'

// Cart store for shopping cart functionality
export const useCartStore = create((set, get) => ({
  items: JSON.parse(localStorage.getItem('togogo_cart') || '[]'),

  addItem: (product, quantity = 1) => {
    const items = get().items
    const existing = items.find((i) => i.id === product.id)
    let updated
    if (existing) {
      updated = items.map((i) =>
        i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
      )
    } else {
      updated = [...items, { ...product, quantity, addedAt: new Date().toISOString() }]
    }
    localStorage.setItem('togogo_cart', JSON.stringify(updated))
    set({ items: updated })
  },

  updateQuantity: (productId, quantity) => {
    if (quantity < 1) return get().removeItem(productId)
    const updated = get().items.map((i) =>
      i.id === productId ? { ...i, quantity } : i
    )
    localStorage.setItem('togogo_cart', JSON.stringify(updated))
    set({ items: updated })
  },

  removeItem: (productId) => {
    const updated = get().items.filter((i) => i.id !== productId)
    localStorage.setItem('togogo_cart', JSON.stringify(updated))
    set({ items: updated })
  },

  getTotal: () => get().items.reduce((sum, i) => sum + (i.price || i.suggestedPrice || 0) * i.quantity, 0),
  getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  clearCart: () => {
    localStorage.removeItem('togogo_cart')
    set({ items: [] })
  },
}))

// Orders store for order history
export const useOrderStore = create((set, get) => ({
  orders: JSON.parse(localStorage.getItem('togogo_orders') || '[]'),

  addOrder: (order) => {
    const newOrder = {
      ...order,
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: 'processing',
    }
    const updated = [newOrder, ...get().orders]
    localStorage.setItem('togogo_orders', JSON.stringify(updated))
    set({ orders: updated })
    return newOrder
  },

  getOrderById: (id) => get().orders.find((o) => o.id === id),

  getOrders: () => get().orders,
}))

// Notifications/inbox store
export const useInboxStore = create((set, get) => ({
  messages: JSON.parse(localStorage.getItem('togogo_inbox') || JSON.stringify([
    {
      id: '1',
      type: 'welcome',
      title: 'Welcome to ToGoGo!',
      body: 'Your all-in-one ecommerce platform is ready. Start by connecting a supplier and listing your first product.',
      read: false,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '2',
      type: 'tip',
      title: 'Connect your first platform',
      body: 'Link eBay, Etsy, or Amazon to start selling across multiple channels. Go to Platforms to get started.',
      read: false,
      createdAt: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: '3',
      type: 'update',
      title: 'New supplier: Printify',
      body: 'Print-on-demand products are now available through Printify. Browse custom t-shirts, mugs, and more.',
      read: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ])),

  markRead: (id) => {
    const updated = get().messages.map((m) =>
      m.id === id ? { ...m, read: true } : m
    )
    localStorage.setItem('togogo_inbox', JSON.stringify(updated))
    set({ messages: updated })
  },

  markAllRead: () => {
    const updated = get().messages.map((m) => ({ ...m, read: true }))
    localStorage.setItem('togogo_inbox', JSON.stringify(updated))
    set({ messages: updated })
  },

  deleteMessage: (id) => {
    const updated = get().messages.filter((m) => m.id !== id)
    localStorage.setItem('togogo_inbox', JSON.stringify(updated))
    set({ messages: updated })
  },

  getUnreadCount: () => get().messages.filter((m) => !m.read).length,
}))
