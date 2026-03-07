import { Package } from 'lucide-react'
import Card from '../ui/Card'
import Skeleton from '../ui/Skeleton'
import EmptyState from '../ui/EmptyState'

export default function ProductGrid({
  products = [],
  loading = false,
  emptyMessage = 'No products found',
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (!products.length) {
    return (
      <EmptyState
        icon={Package}
        title={emptyMessage}
        description="Try adjusting your search or filters to find what you're looking for."
      />
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <Card key={product.id} product={product} />
      ))}
    </div>
  )
}
