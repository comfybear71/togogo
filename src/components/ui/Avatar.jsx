const sizes = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

export default function Avatar({ src, name = '', size = 'md' }) {
  const initial = name.charAt(0).toUpperCase()

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${sizes[size]}`}
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-brand text-white font-bold ${sizes[size]}`}
    >
      {initial}
    </div>
  )
}
