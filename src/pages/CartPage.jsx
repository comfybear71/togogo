import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Trash2, Plus, Minus, Package, ArrowRight,
  ShoppingBag, Tag, Truck,
} from 'lucide-react'
import { useCartStore } from '../stores/orderStore'
import Button from '../components/ui/Button'

export default function CartPage() {
  const navigate = useNavigate()
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore()
  const [removing, setRemoving] = useState(null)

  const subtotal = getTotal()
  const shipping = items.length > 0 ? 0 : 0 // Free shipping
  const total = subtotal + shipping

  const handleRemove = (id) => {
    setRemoving(id)
    setTimeout(() => {
      removeItem(id)
      setRemoving(null)
    }, 200)
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FF6B35]/10 mx-auto mb-6">
            <ShoppingCart className="h-10 w-10 text-[#FF6B35]" />
          </div>
          <h2 className="font-heading text-xl font-bold text-white mb-2">
            Your cart is empty
          </h2>
          <p className="text-sm text-zinc-500 max-w-[280px] mx-auto mb-8">
            Browse our supplier catalog and add products to start building your store.
          </p>
          <Link to="/suppliers">
            <Button>
              <ShoppingBag className="h-4 w-4 mr-2" />
              Browse Products
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B35]/15">
            <ShoppingCart className="h-5 w-5 text-[#FF6B35]" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-white">Cart</h1>
            <p className="text-[10px] text-zinc-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={clearCart}
          className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Items */}
      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl bg-[#111] border border-white/[0.06] p-4 transition-all duration-200 ${
              removing === item.id ? 'opacity-0 scale-95' : ''
            }`}
          >
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#0a0a0a] flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-zinc-700" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-white truncate">{item.title || item.name}</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {item.supplier || 'ToGoGo'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3">
                  {/* Quantity controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-semibold text-white w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  {/* Price */}
                  <p className="text-sm font-bold text-white">
                    ${((item.price || item.suggestedPrice || 0) * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Summary */}
      <div className="rounded-xl bg-[#111] border border-white/[0.06] p-5 mb-6">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Order Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Subtotal</span>
            <span className="text-white font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400 flex items-center gap-1">
              <Truck className="h-3 w-3" /> Shipping
            </span>
            <span className="text-[#06D6A0] font-medium">Free</span>
          </div>
          <div className="border-t border-white/[0.06] pt-3 flex justify-between">
            <span className="text-sm font-semibold text-white">Total</span>
            <span className="text-lg font-bold text-white">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Checkout Button */}
      <Button
        onClick={() => navigate('/checkout')}
        className="w-full"
        size="lg"
      >
        Proceed to Checkout <ArrowRight className="h-4 w-4 ml-2" />
      </Button>

      {/* Continue Shopping */}
      <div className="text-center mt-4">
        <Link to="/suppliers" className="text-xs text-zinc-500 hover:text-[#FF6B35] transition-colors">
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
