import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CreditCard, Lock, Package, Check, ArrowLeft, Truck,
  MapPin, Mail, User, ShoppingCart,
} from 'lucide-react'
import { useCartStore, useOrderStore } from '../stores/orderStore'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { items, getTotal, clearCart } = useCartStore()
  const { addOrder } = useOrderStore()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const [step, setStep] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [orderComplete, setOrderComplete] = useState(null)

  const [form, setForm] = useState({
    name: profile?.name || '',
    email: user?.email || '',
    address: '',
    city: '',
    postcode: '',
    country: 'United Kingdom',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
  })

  const subtotal = getTotal()
  const total = subtotal

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handlePlaceOrder = async () => {
    setProcessing(true)
    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 2000))

    const order = addOrder({
      items: items.map((i) => ({
        id: i.id,
        title: i.title || i.name,
        price: i.price || i.suggestedPrice || 0,
        quantity: i.quantity,
        image: i.image,
        supplier: i.supplier,
      })),
      total,
      shipping: {
        name: form.name,
        address: form.address,
        city: form.city,
        postcode: form.postcode,
        country: form.country,
      },
      email: form.email,
    })

    clearCart()
    setProcessing(false)
    setOrderComplete(order)
  }

  // Empty cart redirect
  if (items.length === 0 && !orderComplete) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800/50 mx-auto mb-6">
            <ShoppingCart className="h-10 w-10 text-zinc-600" />
          </div>
          <h2 className="font-heading text-xl font-bold text-white mb-2">No items to checkout</h2>
          <p className="text-sm text-zinc-500 mb-6">Add products to your cart first.</p>
          <Link to="/suppliers">
            <Button>Browse Products</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Order complete
  if (orderComplete) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center px-6 max-w-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#06D6A0]/10 mx-auto mb-6">
            <Check className="h-10 w-10 text-[#06D6A0]" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-white mb-2">Order Placed!</h2>
          <p className="text-sm text-zinc-500 mb-2">
            Your order <span className="text-white font-semibold">{orderComplete.id}</span> has been confirmed.
          </p>
          <p className="text-xs text-zinc-600 mb-8">
            You'll receive a confirmation email at {form.email}
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/orders">
              <Button variant="outline" size="sm">View Orders</Button>
            </Link>
            <Link to="/suppliers">
              <Button size="sm">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/cart')} className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
          <ArrowLeft className="h-5 w-5 text-zinc-400" />
        </button>
        <div>
          <h1 className="text-xl font-heading font-bold text-white">Checkout</h1>
          <p className="text-[10px] text-zinc-500">Step {step} of 2</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-[#FF6B35]' : 'bg-white/[0.06]'}`} />
        <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-[#FF6B35]' : 'bg-white/[0.06]'}`} />
      </div>

      {step === 1 && (
        <>
          {/* Shipping Info */}
          <div className="rounded-xl bg-[#111] border border-white/[0.06] p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-[#FF6B35]" />
              <h3 className="text-sm font-semibold text-white">Shipping Details</h3>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="John Smith"
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="john@email.com"
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="123 High Street"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="London"
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Postcode</label>
                  <input
                    type="text"
                    value={form.postcode}
                    onChange={(e) => updateField('postcode', e.target.value)}
                    placeholder="SW1A 1AA"
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Country</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary Mini */}
          <div className="rounded-xl bg-[#111] border border-white/[0.06] p-5 mb-6">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              {items.length} item{items.length !== 1 ? 's' : ''} in cart
            </h3>
            <div className="space-y-2 mb-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400 truncate max-w-[200px]">
                    {item.title || item.name} x{item.quantity}
                  </span>
                  <span className="text-xs text-white font-medium">
                    ${((item.price || item.suggestedPrice || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-white/[0.06] pt-3 flex justify-between">
              <span className="text-sm font-semibold text-white">Total</span>
              <span className="text-sm font-bold text-white">${total.toFixed(2)}</span>
            </div>
          </div>

          <Button
            onClick={() => setStep(2)}
            className="w-full"
            size="lg"
            disabled={!form.name || !form.email || !form.address || !form.city}
          >
            Continue to Payment
          </Button>
        </>
      )}

      {step === 2 && (
        <>
          {/* Payment */}
          <div className="rounded-xl bg-[#111] border border-white/[0.06] p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-4 w-4 text-[#FF6B35]" />
              <h3 className="text-sm font-semibold text-white">Payment Details</h3>
              <div className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500">
                <Lock className="h-3 w-3" /> Secure
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Card Number</label>
                <input
                  type="text"
                  value={form.cardNumber}
                  onChange={(e) => updateField('cardNumber', e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19))}
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Expiry</label>
                  <input
                    type="text"
                    value={form.cardExpiry}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '')
                      if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2, 4)
                      updateField('cardExpiry', val.slice(0, 5))
                    }}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">CVC</label>
                  <input
                    type="text"
                    value={form.cardCvc}
                    onChange={(e) => updateField('cardCvc', e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="123"
                    maxLength={3}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B35]/40 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="rounded-xl bg-[#111] border border-white/[0.06] p-5 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-zinc-500">Total to pay</p>
                <p className="text-2xl font-bold text-white">${total.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[#06D6A0]">
                <Truck className="h-3 w-3" /> Free shipping
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} size="lg" className="flex-1">
              Back
            </Button>
            <Button
              onClick={handlePlaceOrder}
              loading={processing}
              size="lg"
              className="flex-[2]"
              disabled={!form.cardNumber || !form.cardExpiry || !form.cardCvc}
            >
              {processing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
