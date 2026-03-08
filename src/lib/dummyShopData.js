// ============================================
// DUMMY SHOP DATA
// Simulates a real store experience with products and suppliers
// Free users: 1 product at a time
// Paid users: full catalog + all suppliers
// ============================================

export const DUMMY_SUPPLIERS = [
  {
    id: 'cj',
    name: 'CJ Dropshipping',
    logo: '📦',
    color: '#FF6B35',
    productCount: 400000,
    shippingDays: '7-15',
    rating: 4.5,
    tier: 'free', // available to free users
  },
  {
    id: 'aliexpress',
    name: 'AliExpress',
    logo: '🛒',
    color: '#E53238',
    productCount: 10000000,
    shippingDays: '10-20',
    rating: 4.2,
    tier: 'free',
  },
  {
    id: 'printful',
    name: 'Printful',
    logo: '🎨',
    color: '#2E2E2E',
    productCount: 350,
    shippingDays: '3-7',
    rating: 4.7,
    tier: 'paid',
  },
  {
    id: 'printify',
    name: 'Printify',
    logo: '🖨️',
    color: '#39B54A',
    productCount: 900,
    shippingDays: '3-8',
    rating: 4.5,
    tier: 'paid',
  },
  {
    id: 'gooten',
    name: 'Gooten',
    logo: '🏭',
    color: '#00B4D8',
    productCount: 250,
    shippingDays: '4-10',
    rating: 4.3,
    tier: 'paid',
  },
]

export const DUMMY_PRODUCTS = [
  // ── ELECTRONICS ──
  {
    id: 'dp-1',
    title: 'Wireless Bluetooth Earbuds TWS',
    image: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&h=400&fit=crop',
    category: 'electronics',
    supplier: 'CJ Dropshipping',
    supplierId: 'cj',
    supplierLogo: '📦',
    cost: 8.50,
    suggestedPrice: 29.99,
    deliveryDays: 10,
    rating: 4.6,
    sold: 12400,
  },
  {
    id: 'dp-2',
    title: 'LED Strip Lights 5M RGB Remote',
    image: 'https://images.unsplash.com/photo-1615796153287-98eacf0abb13?w=400&h=400&fit=crop',
    category: 'electronics',
    supplier: 'AliExpress',
    supplierId: 'aliexpress',
    supplierLogo: '🛒',
    cost: 3.20,
    suggestedPrice: 14.99,
    deliveryDays: 14,
    rating: 4.3,
    sold: 45000,
  },
  {
    id: 'dp-3',
    title: 'Phone Case Shockproof Clear',
    image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=400&fit=crop',
    category: 'electronics',
    supplier: 'CJ Dropshipping',
    supplierId: 'cj',
    supplierLogo: '📦',
    cost: 1.20,
    suggestedPrice: 9.99,
    deliveryDays: 8,
    rating: 4.4,
    sold: 89000,
  },
  {
    id: 'dp-4',
    title: 'Portable Bluetooth Speaker Mini',
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop',
    category: 'electronics',
    supplier: 'CJ Dropshipping',
    supplierId: 'cj',
    supplierLogo: '📦',
    cost: 6.80,
    suggestedPrice: 24.99,
    deliveryDays: 10,
    rating: 4.5,
    sold: 8700,
  },

  // ── FASHION ──
  {
    id: 'dp-5',
    title: 'Custom Print T-Shirt Unisex',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
    category: 'fashion',
    supplier: 'Printful',
    supplierId: 'printful',
    supplierLogo: '🎨',
    cost: 12.50,
    suggestedPrice: 34.99,
    deliveryDays: 5,
    rating: 4.8,
    sold: 23000,
  },
  {
    id: 'dp-6',
    title: 'Oversized Hoodie Streetwear',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop',
    category: 'fashion',
    supplier: 'Printify',
    supplierId: 'printify',
    supplierLogo: '🖨️',
    cost: 18.00,
    suggestedPrice: 49.99,
    deliveryDays: 6,
    rating: 4.6,
    sold: 15600,
  },
  {
    id: 'dp-7',
    title: 'Minimalist Stainless Steel Watch',
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop',
    category: 'fashion',
    supplier: 'AliExpress',
    supplierId: 'aliexpress',
    supplierLogo: '🛒',
    cost: 5.40,
    suggestedPrice: 29.99,
    deliveryDays: 15,
    rating: 4.2,
    sold: 34000,
  },
  {
    id: 'dp-8',
    title: 'Crossbody Bag Vegan Leather',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
    category: 'fashion',
    supplier: 'CJ Dropshipping',
    supplierId: 'cj',
    supplierLogo: '📦',
    cost: 7.20,
    suggestedPrice: 24.99,
    deliveryDays: 12,
    rating: 4.4,
    sold: 19200,
  },

  // ── HOME ──
  {
    id: 'dp-9',
    title: 'Custom Photo Mug 11oz',
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop',
    category: 'home',
    supplier: 'Printful',
    supplierId: 'printful',
    supplierLogo: '🎨',
    cost: 6.50,
    suggestedPrice: 19.99,
    deliveryDays: 5,
    rating: 4.7,
    sold: 41000,
    customisable: true,
  },
  {
    id: 'dp-10',
    title: 'Aroma Diffuser LED Night Light',
    image: 'https://images.unsplash.com/photo-1602928321679-560bb453f190?w=400&h=400&fit=crop',
    category: 'home',
    supplier: 'CJ Dropshipping',
    supplierId: 'cj',
    supplierLogo: '📦',
    cost: 4.80,
    suggestedPrice: 19.99,
    deliveryDays: 10,
    rating: 4.5,
    sold: 27000,
  },
  {
    id: 'dp-11',
    title: 'Custom Canvas Print Wall Art',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&h=400&fit=crop',
    category: 'home',
    supplier: 'Gooten',
    supplierId: 'gooten',
    supplierLogo: '🏭',
    cost: 14.00,
    suggestedPrice: 44.99,
    deliveryDays: 7,
    rating: 4.6,
    sold: 11000,
    customisable: true,
  },
  {
    id: 'dp-12',
    title: 'Sunset Lamp Projector',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    category: 'home',
    supplier: 'AliExpress',
    supplierId: 'aliexpress',
    supplierLogo: '🛒',
    cost: 4.50,
    suggestedPrice: 18.99,
    deliveryDays: 14,
    rating: 4.3,
    sold: 56000,
  },

  // ── HEALTH & BEAUTY ──
  {
    id: 'dp-13',
    title: 'Jade Roller & Gua Sha Set',
    image: 'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=400&h=400&fit=crop',
    category: 'health',
    supplier: 'CJ Dropshipping',
    supplierId: 'cj',
    supplierLogo: '📦',
    cost: 2.80,
    suggestedPrice: 14.99,
    deliveryDays: 9,
    rating: 4.5,
    sold: 67000,
  },
  {
    id: 'dp-14',
    title: 'Electric Scalp Massager',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop',
    category: 'health',
    supplier: 'AliExpress',
    supplierId: 'aliexpress',
    supplierLogo: '🛒',
    cost: 5.60,
    suggestedPrice: 22.99,
    deliveryDays: 12,
    rating: 4.4,
    sold: 31000,
  },

  // ── BABY & KIDS ──
  {
    id: 'dp-15',
    title: 'Baby Milestone Blanket Custom',
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=400&fit=crop',
    category: 'baby',
    supplier: 'Printify',
    supplierId: 'printify',
    supplierLogo: '🖨️',
    cost: 11.00,
    suggestedPrice: 34.99,
    deliveryDays: 6,
    rating: 4.7,
    sold: 8400,
    customisable: true,
  },
  {
    id: 'dp-16',
    title: 'Silicone Baby Feeding Set',
    image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&h=400&fit=crop',
    category: 'baby',
    supplier: 'CJ Dropshipping',
    supplierId: 'cj',
    supplierLogo: '📦',
    cost: 4.20,
    suggestedPrice: 16.99,
    deliveryDays: 10,
    rating: 4.6,
    sold: 22000,
  },

  // ── SPORTS ──
  {
    id: 'dp-17',
    title: 'Resistance Bands Set 5-Pack',
    image: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400&h=400&fit=crop',
    category: 'sports',
    supplier: 'CJ Dropshipping',
    supplierId: 'cj',
    supplierLogo: '📦',
    cost: 3.50,
    suggestedPrice: 14.99,
    deliveryDays: 10,
    rating: 4.5,
    sold: 54000,
  },
  {
    id: 'dp-18',
    title: 'Custom Gym Water Bottle 750ml',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop',
    category: 'sports',
    supplier: 'Gooten',
    supplierId: 'gooten',
    supplierLogo: '🏭',
    cost: 8.00,
    suggestedPrice: 24.99,
    deliveryDays: 7,
    rating: 4.4,
    sold: 13000,
    customisable: true,
  },

  // ── PETS ──
  {
    id: 'dp-19',
    title: 'Custom Pet Portrait Canvas',
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop',
    category: 'pets',
    supplier: 'Printful',
    supplierId: 'printful',
    supplierLogo: '🎨',
    cost: 15.00,
    suggestedPrice: 49.99,
    deliveryDays: 5,
    rating: 4.8,
    sold: 9200,
    customisable: true,
  },
  {
    id: 'dp-20',
    title: 'Dog Harness No-Pull Adjustable',
    image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop',
    category: 'pets',
    supplier: 'CJ Dropshipping',
    supplierId: 'cj',
    supplierLogo: '📦',
    cost: 4.80,
    suggestedPrice: 19.99,
    deliveryDays: 10,
    rating: 4.5,
    sold: 38000,
  },
]

// Helper: compute margin info for a product
export function enrichProduct(p) {
  const margin = p.suggestedPrice - p.cost
  const marginPct = Math.round((margin / p.suggestedPrice) * 100)
  return {
    ...p,
    margin,
    marginPct,
    totalCost: p.cost,
    suggestedMargin: margin,
  }
}

// Get products filtered by tier
export function getProductsForTier(tier = 'free') {
  const enriched = DUMMY_PRODUCTS.map(enrichProduct)
  if (tier === 'paid' || tier === 'basic' || tier === 'premium') {
    return enriched
  }
  // Free users: only products from free-tier suppliers
  const freeSupplierIds = DUMMY_SUPPLIERS.filter(s => s.tier === 'free').map(s => s.id)
  return enriched.filter(p => freeSupplierIds.includes(p.supplierId))
}

// Get suppliers filtered by tier
export function getSuppliersForTier(tier = 'free') {
  if (tier === 'paid' || tier === 'basic' || tier === 'premium') {
    return DUMMY_SUPPLIERS
  }
  return DUMMY_SUPPLIERS.filter(s => s.tier === 'free')
}
