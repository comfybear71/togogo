import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-brand text-white hover:bg-brand/90 active:bg-brand/80',
  secondary: 'bg-teal text-white hover:bg-teal/90 active:bg-teal/80',
  outline: 'border-2 border-brand text-brand hover:bg-brand/5 active:bg-brand/10',
  ghost: 'text-brand hover:bg-brand/5 active:bg-brand/10',
}

const sizes = {
  sm: 'px-4 py-2 text-sm min-h-[44px] min-w-[44px]',
  md: 'px-6 py-3 text-base min-h-[44px] min-w-[44px]',
  lg: 'px-8 py-4 text-lg min-h-[44px] min-w-[44px]',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  loading = false,
  disabled = false,
  ...rest
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[12px] font-semibold transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-5 w-5 animate-spin" />}
      {children}
    </button>
  )
}
