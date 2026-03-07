const variants = {
  brand: 'bg-[#FF6B35]/10 text-[#FF6B35]',
  teal: 'bg-[#06D6A0]/10 text-[#06D6A0]',
  accent: 'bg-[#FFD23F]/10 text-[#FFD23F]',
  danger: 'bg-red-500/10 text-red-400',
  neutral: 'bg-white/5 text-zinc-400',
}

export default function Badge({
  variant = 'brand',
  children,
  className = '',
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
