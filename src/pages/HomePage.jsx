import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ArrowRight, Tag, Eye, ShoppingBag } from 'lucide-react'
import Button from '../components/ui/Button'
import { useDailyDeals } from '../hooks/useProducts'
import { useAuthStore } from '../stores/authStore'
import { CATEGORIES } from '../lib/constants'

const MOCK_DEALS = [
  { id: '1', product: { name: 'Apple AirPods Pro 2', image_url: '', category: 'electronics', brand: 'Apple' }, price: 189.99, original_price: 249.99, deal_score: 95, retailer: { name: 'Amazon', domain: 'amazon.com' } },
  { id: '2', product: { name: 'Dyson V15 Vacuum', image_url: '', category: 'home', brand: 'Dyson' }, price: 449.00, original_price: 749.99, deal_score: 90, retailer: { name: 'eBay', domain: 'ebay.com' } },
  { id: '3', product: { name: 'Samsung 65" 4K TV', image_url: '', category: 'electronics', brand: 'Samsung' }, price: 597.00, original_price: 999.99, deal_score: 88, retailer: { name: 'Best Buy', domain: 'bestbuy.com' } },
  { id: '4', product: { name: 'Nike Air Max 90', image_url: '', category: 'fashion', brand: 'Nike' }, price: 89.97, original_price: 130.00, deal_score: 85, retailer: { name: 'Nike', domain: 'nike.com' } },
  { id: '5', product: { name: 'Pampers Size 4 (150pk)', image_url: '', category: 'baby', brand: 'Pampers' }, price: 32.99, original_price: 54.99, deal_score: 92, retailer: { name: 'Walmart', domain: 'walmart.com' } },
  { id: '6', product: { name: 'Organic Whole Milk 2L', image_url: '', category: 'groceries', brand: 'Various' }, price: 3.49, original_price: 5.99, deal_score: 82, retailer: { name: 'Woolworths', domain: 'woolworths.com.au' } },
  { id: '7', product: { name: 'Sydney → Bali Return', image_url: '', category: 'travel', brand: 'Jetstar' }, price: 299.00, original_price: 599.00, deal_score: 96, retailer: { name: 'Skyscanner', domain: 'skyscanner.com' } },
  { id: '8', product: { name: 'Hilton Hotel 3 Nights', image_url: '', category: 'travel', brand: 'Hilton' }, price: 450.00, original_price: 890.00, deal_score: 91, retailer: { name: 'Booking.com', domain: 'booking.com' } },
]

const QUICK_SEARCHES = [
  { label: '🥛 Milk', query: 'Milk' },
  { label: '👶 Nappies', query: 'Nappies' },
  { label: '📺 TV', query: 'TV' },
  { label: '✈️ Flights', query: 'Flights' },
  { label: '🏨 Hotels', query: 'Hotels' },
]

const CATEGORY_EMOJI_MAP = {
  electronics: '📱',
  fashion: '👕',
  home: '🏠',
  groceries: '🛒',
  health: '💊',
  sports: '⚽',
  travel: '✈️',
  automotive: '🚗',
  baby: '👶',
  books: '📚',
  pets: '🐾',
  food: '🍕',
}

function formatPrice(price) {
  return price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function savingsPercent(original, current) {
  return Math.round(((original - current) / original) * 100)
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: deals } = useDailyDeals()
  const [searchQuery, setSearchQuery] = useState('')
  const scrollRef = useRef(null)

  const displayDeals = deals?.length ? deals : MOCK_DEALS

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="min-h-screen bg-orange-50/30">
      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-100 via-white to-green-50">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-yellow-200/40 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-green-200/40 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:py-24 lg:py-28 text-center">
          <h1 className="font-['Baloo_2'] text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl leading-tight">
            Find the <span className="text-[#FF6B35]">Best Prices</span>, Everywhere
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-['Nunito'] text-lg sm:text-xl text-gray-600 leading-relaxed">
            We search thousands of stores worldwide so you don't have to.
          </p>

          {/* Big Search Bar */}
          <form onSubmit={handleSearch} className="mx-auto mt-10 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 h-6 w-6 sm:h-7 sm:w-7 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What are you looking for?"
                className="w-full rounded-2xl border-2 border-orange-200 bg-white py-5 pl-14 pr-36 text-lg sm:text-xl text-gray-900 placeholder:text-gray-400 shadow-lg shadow-orange-100/50 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-orange-200 focus:border-[#FF6B35]"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-[#FF6B35] px-6 py-3 text-lg font-semibold text-white shadow-md hover:bg-[#e55a2b] active:bg-[#d04f22] transition-colors min-h-[48px] cursor-pointer"
              >
                Search
              </button>
            </div>
          </form>

          {/* Quick Search Chips */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="text-lg text-gray-500 font-medium">Popular:</span>
            {QUICK_SEARCHES.map((item) => (
              <Link
                key={item.query}
                to={`/browse?q=${encodeURIComponent(item.query)}`}
                className="rounded-full border-2 border-orange-200 bg-white px-5 py-2.5 text-lg font-medium text-gray-700 shadow-sm transition-all hover:border-[#FF6B35] hover:text-[#FF6B35] hover:shadow-md min-h-[48px] inline-flex items-center"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TODAY'S BEST DEALS ===== */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-['Baloo_2'] text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">🔥</span> Today's Best Deals
          </h2>
          <Link
            to="/deals"
            className="flex items-center gap-1 text-lg font-semibold text-[#FF6B35] hover:underline min-h-[48px]"
          >
            See all <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        {/* Horizontal Scrollable Deals Row */}
        <div
          ref={scrollRef}
          className="scrollbar-hide -mx-4 flex gap-5 overflow-x-auto px-4 pb-4 snap-x snap-mandatory"
        >
          {displayDeals.map((deal) => {
            const savings = savingsPercent(deal.original_price, deal.price)
            return (
              <div
                key={deal.id}
                className="w-72 sm:w-80 flex-shrink-0 snap-start rounded-2xl border border-gray-100 bg-white shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden flex flex-col"
              >
                {/* Product Image Placeholder */}
                <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                  {deal.product.image_url ? (
                    <img src={deal.product.image_url} alt={deal.product.name} className="h-full w-full object-cover" />
                  ) : (
                    <ShoppingBag className="h-16 w-16 text-gray-300" />
                  )}
                  {/* Savings Badge */}
                  <div className="absolute top-3 right-3 rounded-full bg-red-500 px-3 py-1.5 text-sm font-bold text-white shadow">
                    -{savings}%
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    {deal.product.brand}
                  </p>
                  <h3 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2 mb-3">
                    {deal.product.name}
                  </h3>

                  {/* Price */}
                  <div className="mb-3">
                    <span className="text-2xl font-bold text-green-600">
                      {formatPrice(deal.price)}
                    </span>
                    <span className="ml-2 text-base text-gray-400 line-through">
                      {formatPrice(deal.original_price)}
                    </span>
                  </div>

                  {/* Retailer */}
                  <div className="flex items-center gap-1.5 text-base text-gray-500 mb-4">
                    <Tag className="h-4 w-4" />
                    <span>{deal.retailer.name}</span>
                  </div>

                  {/* View Deal Button */}
                  <Link
                    to={`/product/${deal.id}`}
                    className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-5 py-3 text-lg font-semibold text-white hover:bg-[#e55a2b] active:bg-[#d04f22] transition-colors min-h-[48px]"
                  >
                    <Eye className="h-5 w-5" />
                    View Deal
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ===== BROWSE BY CATEGORY ===== */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-['Baloo_2'] text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
          Browse by Category
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/browse?category=${cat.id}`}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-gray-100 bg-white p-6 sm:p-8 shadow-sm hover:shadow-lg hover:border-[#FF6B35]/30 transition-all duration-200 min-h-[120px] group"
            >
              <span className="text-4xl sm:text-5xl group-hover:scale-110 transition-transform duration-200">
                {CATEGORY_EMOJI_MAP[cat.id] || cat.emoji}
              </span>
              <span className="text-lg sm:text-xl font-semibold text-gray-800 text-center">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-['Baloo_2'] text-2xl sm:text-3xl font-bold text-gray-900 mb-12 text-center">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
            {[
              {
                emoji: '🔍',
                title: 'Search for anything',
                desc: 'Type what you need and we\'ll find it',
              },
              {
                emoji: '📊',
                title: 'Compare prices',
                desc: 'See prices from stores worldwide',
              },
              {
                emoji: '💰',
                title: 'Save money',
                desc: 'Click to buy from the cheapest store',
              },
            ].map((step, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center rounded-2xl bg-orange-50/60 p-8 sm:p-10"
              >
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md">
                  <span className="text-4xl">{step.emoji}</span>
                </div>
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6B35] text-white font-bold text-lg">
                  {i + 1}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SUBSCRIBE CTA (non-logged-in only) ===== */}
      {!user && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF6B35] to-[#FFB347] p-10 sm:p-14 text-center">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <h2 className="font-['Baloo_2'] text-3xl sm:text-4xl font-bold text-white mb-3">
                Never miss a deal!
              </h2>
              <p className="font-['Nunito'] text-xl text-white/90 mb-8 max-w-lg mx-auto">
                Sign up FREE to get price drop alerts and never overpay again.
              </p>
              <Link to="/auth?tab=signup">
                <Button
                  size="lg"
                  className="bg-white text-[#FF6B35] px-10 py-4 text-xl font-bold shadow-xl hover:bg-gray-50 min-h-[56px] rounded-2xl"
                >
                  Sign Up Free
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
