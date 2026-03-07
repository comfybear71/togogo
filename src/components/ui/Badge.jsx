const variants = {
  brand: 'bg-brand/10 text-brand',
  teal: 'bg-teal/10 text-teal',
  accent: 'bg-accent/20 text-amber-700',
  danger: 'bg-red-100 text-red-600',
  neutral: 'bg-gray-100 text-gray-600',
}

export default function Badge({
  variant = 'brand',
  children,
  className = '',
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
