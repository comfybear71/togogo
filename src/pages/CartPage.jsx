import { Link } from 'react-router-dom';
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { useCartStore } from '../stores/cartStore';
import { PLATFORM_FEE_PERCENT } from '../lib/constants';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCartStore();

  const subtotal = typeof getTotal === 'function' ? getTotal() : items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  const shippingEstimate = items.length > 0 ? 5.99 : 0;
  const total = subtotal + shippingEstimate;

  if (!items.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <EmptyState
          icon="shopping-cart"
          title="Your cart is empty"
          description="Looks like you haven't added anything to your cart yet. Start exploring!"
          action={
            <Link to="/browse">
              <Button className="bg-[#FF6B35] px-6 py-3 font-semibold text-white hover:bg-[#e55a2b]">
                Start Shopping
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-['Baloo_2'] text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
            Shopping Cart
          </h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                >
                  {/* Product Image */}
                  <Link to={`/product/${item.id}`} className="flex-shrink-0">
                    <img
                      src={item.image || item.images?.[0] || '/placeholder.png'}
                      alt={item.title}
                      className="h-24 w-24 rounded-lg object-cover sm:h-28 sm:w-28"
                    />
                  </Link>

                  {/* Product Details */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <Link
                        to={`/product/${item.id}`}
                        className="font-['Nunito'] font-bold text-gray-900 hover:text-[#FF6B35] dark:text-white"
                      >
                        {item.title}
                      </Link>
                      {item.condition && (
                        <p className="mt-0.5 text-xs text-gray-500 capitalize">
                          {item.condition}
                        </p>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, Math.max(1, (item.quantity || 1) - 1))
                          }
                          className="px-2.5 py-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[2.5rem] px-2 py-1.5 text-center font-['Nunito'] text-sm font-bold text-gray-900 dark:text-white">
                          {item.quantity || 1}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, (item.quantity || 1) + 1)
                          }
                          className="px-2.5 py-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Price */}
                      <span className="font-['Baloo_2'] text-lg font-bold text-[#FF6B35]">
                        ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="flex-shrink-0 self-start p-1 text-gray-400 transition-colors hover:text-red-500"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <Link
              to="/browse"
              className="mt-4 inline-flex items-center gap-2 font-['Nunito'] text-sm font-semibold text-[#FF6B35] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Link>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 font-['Baloo_2'] text-lg font-bold text-gray-900 dark:text-white">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm font-['Nunito']">
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal ({items.length} items)</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                  <span>Shipping estimate</span>
                  <span className="font-semibold">${shippingEstimate.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Info className="h-3 w-3" />
                  <span>Platform fee calculated at checkout</span>
                </div>

                <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-white">Total</span>
                    <span className="font-['Baloo_2'] text-xl font-bold text-[#FF6B35]">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <Link to="/checkout">
                <Button className="mt-6 flex w-full items-center justify-center gap-2 bg-[#FF6B35] py-3 text-base font-semibold text-white hover:bg-[#e55a2b]">
                  <ShoppingBag className="h-5 w-5" />
                  Checkout
                </Button>
              </Link>

              <p className="mt-3 text-center text-xs text-gray-400">
                Secure checkout powered by ToGoGo
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
