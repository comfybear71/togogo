export const CATEGORIES = [
  { id: 'electronics', label: 'Electronics', icon: 'Smartphone', emoji: '📱' },
  { id: 'fashion', label: 'Fashion', icon: 'Shirt', emoji: '👕' },
  { id: 'home', label: 'Home & Garden', icon: 'Home', emoji: '🏠' },
  { id: 'groceries', label: 'Groceries', icon: 'ShoppingBasket', emoji: '🛒' },
  { id: 'health', label: 'Health & Beauty', icon: 'Heart', emoji: '💊' },
  { id: 'sports', label: 'Sports', icon: 'Dumbbell', emoji: '⚽' },
  { id: 'travel', label: 'Travel & Hotels', icon: 'Plane', emoji: '✈️' },
  { id: 'automotive', label: 'Automotive', icon: 'Car', emoji: '🚗' },
  { id: 'baby', label: 'Baby & Kids', icon: 'Baby', emoji: '👶' },
  { id: 'books', label: 'Books & Media', icon: 'BookOpen', emoji: '📚' },
  { id: 'pets', label: 'Pets', icon: 'PawPrint', emoji: '🐾' },
  { id: 'food', label: 'Food & Drink', icon: 'UtensilsCrossed', emoji: '🍕' },
]

export const SUBSCRIPTION_PLANS = [
  {
    id: 'togogo',
    label: 'ToGoGo',
    price: 19.99,
    features: [
      'Every product in the world',
      'Every platform in the world',
      'Every type of marketing',
      'Unlimited listings',
      'AI assistant',
      'AliExpress wholesale prices',
      'Millions of products',
      'Advanced analytics',
    ],
  },
]

export const SELLING_PLANS = [
  {
    id: 'togogo',
    label: 'ToGoGo',
    price: 19.99,
    productLimit: Infinity,
    features: [
      'Every product in the world',
      'Every platform in the world',
      'Every type of marketing',
      'Unlimited listings',
      'AliExpress wholesale prices',
      'Millions of products',
      'Advanced analytics',
    ],
  },
]

export const SORT_OPTIONS = [
  { id: 'price_low', label: 'Price: Low to High' },
  { id: 'price_high', label: 'Price: High to Low' },
  { id: 'deal_score', label: 'Best Deal' },
  { id: 'newest', label: 'Newest First' },
  { id: 'popular', label: 'Most Popular' },
]

export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'NZD', symbol: 'NZ$', label: 'New Zealand Dollar' },
]

export const RETAILERS = [
  'Amazon', 'eBay', 'Walmart', 'Target', 'AliExpress', 'Temu',
  'Best Buy', 'Costco', 'Kmart', 'Big W', 'Woolworths', 'Coles',
]
