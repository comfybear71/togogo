import { Link } from 'react-router-dom'
import { MapPin, Home } from 'lucide-react'
import Button from '../components/ui/Button'
import Logo from '../components/layout/Logo'

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-[#FFD23F]/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-12 h-12 text-[#FF6B35]" />
        </div>
        <h1 className="font-heading text-4xl font-bold mb-2">404</h1>
        <h2 className="font-heading text-xl font-bold text-gray-600 mb-3">Oops! This page went on a GoGo adventure</h2>
        <p className="text-gray-500 mb-8">We looked everywhere but couldn't find what you're looking for. It might have been moved, deleted, or perhaps it never existed.</p>
        <Link to="/">
          <Button variant="primary" size="lg">
            <Home className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        </Link>
        <div className="mt-8 opacity-50">
          <Logo size="sm" />
        </div>
      </div>
    </div>
  )
}
