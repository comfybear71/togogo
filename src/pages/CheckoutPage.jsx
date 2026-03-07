import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Check,
  CreditCard,
  MapPin,
  ShoppingBag,
  ChevronRight,
  ChevronLeft,
  Lock,
  Truck,
  PartyPopper,
  Package,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useCartStore } from '../stores/cartStore';
import { useCreateOrder } from '../hooks/useOrders';
import { useAuthStore } from '../stores/authStore';
import { PLATFORM_FEE_PERCENT } from '../lib/constants';

const STEPS = [
  { num: 1, label: 'Review' },
  { num: 2, label: 'Shipping' },
  { num: 3, label: 'Payment' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, getTotal, clearCart } = useCartStore();
  const createOrder = useCreateOrder();

  const [step, setStep] = useState(1);
  const [isPlacing, setIsPlacing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Shipping form
  const [shipping, setShipping] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Australia',
  });
  const [saveAddress, setSaveAddress] = useState(false);

  const subtotal = typeof getTotal === 'function' ? getTotal() : items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  const shippingCost = 5.99;
  const platformFee = subtotal * (PLATFORM_FEE_PERCENT / 100);
  const total = subtotal + shippingCost + platformFee;

  const updateShipping = (field, value) => {
    setShipping((prev) => ({ ...prev, [field]: value }));
  };

  const shippingValid =
    shipping.name && shipping.street && shipping.city && shipping.state && shipping.postcode;

  const handlePlaceOrder = async () => {
    setIsPlacing(true);
    try {
      const orderNum = `TGG-${Date.now().toString(36).toUpperCase()}`;
      await createOrder.mutateAsync({
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity || 1,
          price: item.price,
        })),
        shipping_address: shipping,
        subtotal,
        shipping_cost: shippingCost,
        platform_fee: platformFee,
        total,
        order_number: orderNum,
        buyer_id: user?.id,
      });
      setOrderNumber(orderNum);
      setOrderComplete(true);
      clearCart();
    } catch (err) {
      console.error('Order failed:', err);
    } finally {
      setIsPlacing(false);
    }
  };

  // Success Screen
  if (orderComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#06D6A0]/5 via-white to-[#FFD23F]/5 dark:from-[#06D6A0]/5 dark:via-gray-950 dark:to-[#FFD23F]/5 px-4">
        <div className="max-w-md text-center">
          {/* Animated Checkmark */}
          <div className="relative mx-auto mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-32 animate-ping rounded-full bg-[#06D6A0]/20" />
            </div>
            <div className="relative flex h-24 w-24 mx-auto items-center justify-center rounded-full bg-[#06D6A0] shadow-lg shadow-[#06D6A0]/30">
              <Check className="h-12 w-12 text-white" strokeWidth={3} />
            </div>
          </div>

          {/* Confetti-like dots */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute h-2 w-2 rounded-full animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: ['#FF6B35', '#06D6A0', '#FFD23F'][i % 3],
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          <h1 className="font-['Baloo_2'] text-3xl font-bold text-gray-900 dark:text-white">
            Order Placed!
          </h1>
          <p className="mt-2 font-['Nunito'] text-gray-600 dark:text-gray-400">
            Your order has been confirmed and is being processed.
          </p>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500">Order Number</p>
            <p className="font-['Baloo_2'] text-xl font-bold text-[#FF6B35]">
              {orderNumber}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Truck className="h-4 w-4 text-[#06D6A0]" />
              <span>Estimated delivery: 3-7 business days</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/orders">
              <Button className="flex w-full items-center justify-center gap-2 bg-[#FF6B35] px-6 py-3 font-semibold text-white hover:bg-[#e55a2b] sm:w-auto">
                <Package className="h-4 w-4" />
                Track My Order
              </Button>
            </Link>
            <Link to="/browse">
              <Button className="w-full border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 sm:w-auto">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!items.length) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                      step === s.num
                        ? 'bg-[#FF6B35] text-white'
                        : step > s.num
                        ? 'bg-[#06D6A0] text-white'
                        : 'bg-gray-200 text-gray-500 dark:bg-gray-700'
                    }`}
                  >
                    {step > s.num ? <Check className="h-4 w-4" /> : s.num}
                  </div>
                  <span
                    className={`text-sm font-['Nunito'] font-semibold ${
                      step === s.num ? 'text-[#FF6B35]' : step > s.num ? 'text-[#06D6A0]' : 'text-gray-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-4 h-px w-12 ${
                      step > s.num ? 'bg-[#06D6A0]' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {/* Step 1: Review */}
          {step === 1 && (
            <div>
              <h2 className="mb-4 font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
                Review Your Order
              </h2>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3">
                    <img
                      src={item.image || item.images?.[0] || '/placeholder.png'}
                      alt={item.title}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-['Nunito'] font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity || 1}</p>
                    </div>
                    <span className="font-['Nunito'] font-bold text-gray-900 dark:text-white">
                      ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 text-sm dark:border-gray-700">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Shipping</span>
                  <span>${shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Platform fee ({PLATFORM_FEE_PERCENT}%)</span>
                  <span>${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                  <span className="font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="font-['Baloo_2'] text-lg font-bold text-[#FF6B35]">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Shipping */}
          {step === 2 && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#FF6B35]" />
                <h2 className="font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
                  Shipping Address
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Full Name *
                  </label>
                  <Input
                    value={shipping.name}
                    onChange={(e) => updateShipping('name', e.target.value)}
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Street Address *
                  </label>
                  <Input
                    value={shipping.street}
                    onChange={(e) => updateShipping('street', e.target.value)}
                    placeholder="123 Main Street, Apt 4B"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      City *
                    </label>
                    <Input
                      value={shipping.city}
                      onChange={(e) => updateShipping('city', e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      State *
                    </label>
                    <Input
                      value={shipping.state}
                      onChange={(e) => updateShipping('state', e.target.value)}
                      placeholder="State"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Postcode *
                    </label>
                    <Input
                      value={shipping.postcode}
                      onChange={(e) => updateShipping('postcode', e.target.value)}
                      placeholder="Postcode"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Country
                    </label>
                    <Input
                      value={shipping.country}
                      onChange={(e) => updateShipping('country', e.target.value)}
                      placeholder="Country"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Save this address for future orders
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#FF6B35]" />
                <h2 className="font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
                  Payment
                </h2>
              </div>

              {/* Stripe placeholder card */}
              <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <CreditCard className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="mt-4 font-['Baloo_2'] text-lg font-bold text-gray-500 dark:text-gray-400">
                  Payment integration coming soon
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  Stripe Elements will be integrated here for secure card payments.
                </p>
                <div className="mx-auto mt-6 max-w-sm space-y-3">
                  <div className="h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              </div>

              {/* Order total */}
              <div className="mt-6 rounded-xl bg-[#FF6B35]/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-['Nunito'] font-bold text-gray-900 dark:text-white">
                    Total to pay
                  </span>
                  <span className="font-['Baloo_2'] text-2xl font-bold text-[#FF6B35]">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handlePlaceOrder}
                disabled={isPlacing}
                className="mt-6 flex w-full items-center justify-center gap-2 bg-[#06D6A0] py-3.5 text-base font-bold text-white hover:bg-[#05c090] disabled:opacity-60"
              >
                <Lock className="h-4 w-4" />
                {isPlacing ? 'Placing Order...' : 'Place Order (Demo)'}
              </Button>

              <p className="mt-3 flex items-center justify-center gap-1 text-xs text-gray-400">
                <Lock className="h-3 w-3" />
                Your payment information is secure and encrypted
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          {step > 1 ? (
            <Button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <Link to="/cart">
              <Button className="flex items-center gap-2 border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                <ChevronLeft className="h-4 w-4" />
                Cart
              </Button>
            </Link>
          )}

          {step < 3 && (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && !shippingValid}
              className="flex items-center gap-2 bg-[#FF6B35] px-6 py-3 font-semibold text-white hover:bg-[#e55a2b] disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
