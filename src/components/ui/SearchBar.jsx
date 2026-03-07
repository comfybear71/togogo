import { Search, X } from 'lucide-react'

export default function SearchBar({
  value = '',
  onChange,
  onSubmit,
  placeholder = 'Search...',
}) {
  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit?.(value)
  }

  const handleClear = () => {
    onChange?.('')
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-gray-200 bg-white py-3 pl-12 pr-10 text-base text-gray-900 placeholder:text-gray-400 transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  )
}
