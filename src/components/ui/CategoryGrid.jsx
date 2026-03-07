import { Link } from 'react-router-dom'
import {
  Smartphone,
  Shirt,
  Home,
  Flower2,
  Dumbbell,
  Gamepad2,
  Heart,
  Car,
  BookOpen,
  UtensilsCrossed,
} from 'lucide-react'
import { CATEGORIES } from '../../lib/constants'

const iconMap = {
  Smartphone,
  Shirt,
  Home,
  Flower2,
  Dumbbell,
  Gamepad2,
  Heart,
  Car,
  BookOpen,
  UtensilsCrossed,
}

export default function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {CATEGORIES.map((category) => {
        const Icon = iconMap[category.icon]
        return (
          <Link
            key={category.id}
            to={`/browse?category=${category.id}`}
            className="flex flex-col items-center gap-2 rounded-[16px] bg-white p-4 shadow-sm hover:shadow-card transition-shadow duration-200"
          >
            {Icon && <Icon className="h-8 w-8 text-brand" />}
            <span className="text-sm font-semibold text-gray-700 text-center">
              {category.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
