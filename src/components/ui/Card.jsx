import { Link } from 'react-router-dom'
import { Eye, MapPin } from 'lucide-react'
import Badge from './Badge'
import Avatar from './Avatar'

export default function Card({ product }) {
  const {
    id,
    title,
    price,
    original_price,
    images,
    condition,
    seller,
    views_count,
    location,
  } = product

  const hasDiscount = original_price && original_price !== price

  return (
    <Link
      to={`/product/${id}`}
      className="group block rounded-[16px] bg-white shadow-card hover:shadow-card-hover transition-shadow duration-300 overflow-hidden"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {images?.[0] ? (
          <img
            src={images[0]}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.parentElement.innerHTML = '<div class="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 text-xs font-medium">No Image</div>'
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            No Image
          </div>
        )}
        {condition && (
          <div className="absolute top-2 left-2">
            <Badge variant="brand">{condition}</Badge>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2">
        <h3 className="font-heading font-bold text-gray-900 text-sm leading-tight line-clamp-2">
          {title}
        </h3>

        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-brand">
            ${typeof price === 'number' ? price.toFixed(2) : price}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              ${typeof original_price === 'number' ? original_price.toFixed(2) : original_price}
            </span>
          )}
        </div>

        {seller && (
          <div className="flex items-center gap-2">
            <Avatar src={seller.avatar} name={seller.name} size="sm" />
            <span className="text-xs text-gray-600 truncate">{seller.name}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400">
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {location}
            </span>
          )}
          {views_count != null && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {views_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
