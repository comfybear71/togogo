import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-[#FF6B35] text-white hover:bg-[#e55a2b] active:bg-[#d04f22]',
  secondary: 'bg-[#06D6A0] text-black hover:bg-[#05c494] active:bg-[#04b386]',
  outline: 'border border-white/10 text-zinc-300 hover:bg-white/5 active:bg-white/10',
  ghost: 'text-zinc-400 hover:bg-white/5 active:bg-white/10',
}

const sizes = {
  sm: 'px-4 py-2 text-sm min-h-[40px]',
  md: 'px-5 py-2.5 text-base min-h-[44px]',
  lg: 'px-8 py-3.5 text-lg min-h-[48px]',
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-5 w-5 animate-spin" />}
      {children}
    </button>
  )
}
