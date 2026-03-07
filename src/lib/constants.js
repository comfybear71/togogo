export const CATEGORIES = [
  { id: 'electronics', label: 'Electronics', icon: 'Smartphone' },
  { id: 'fashion', label: 'Fashion', icon: 'Shirt' },
  { id: 'home', label: 'Home', icon: 'Home' },
  { id: 'garden', label: 'Garden', icon: 'Flower2' },
  { id: 'sports', label: 'Sports', icon: 'Dumbbell' },
  { id: 'toys', label: 'Toys', icon: 'Gamepad2' },
  { id: 'health', label: 'Health', icon: 'Heart' },
  { id: 'automotive', label: 'Automotive', icon: 'Car' },
  { id: 'books', label: 'Books', icon: 'BookOpen' },
  { id: 'food', label: 'Food', icon: 'UtensilsCrossed' },
]

export const CONDITIONS = ['New', 'Like New', 'Good', 'Fair']

export const SHIPPING_TYPES = [
  { id: 'free', label: 'Free Shipping', cost: 0 },
  { id: 'small', label: 'Small ($5)', cost: 5 },
  { id: 'medium', label: 'Medium ($10)', cost: 10 },
  { id: 'large', label: 'Large ($20)', cost: 20 },
  { id: 'pickup', label: 'Local Pickup', cost: 0 },
]

export const PLATFORM_FEE_PERCENT = 8

export const USER_ROLES = ['buyer', 'seller', 'both', 'admin']

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'disputed', 'refunded']

export const VERIFICATION_LEVELS = [
  { level: 1, label: 'Email Verified', icon: 'Mail' },
  { level: 2, label: 'Phone Verified', icon: 'Phone' },
  { level: 3, label: 'ID Verified', icon: 'ShieldCheck' },
]
