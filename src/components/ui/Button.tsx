import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'success' | 'outline' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
  fullWidth?: boolean
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 hover:brightness-110 border-transparent',
  success: 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 hover:brightness-110 border-transparent',
  outline: 'bg-white/[0.02] text-slate-200 border-white/[0.06] hover:bg-white/[0.06] hover:text-white hover:border-white/[0.12]',
  ghost:   'bg-transparent text-slate-400 border-transparent hover:bg-white/[0.03] hover:text-slate-100',
  danger:  'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-8  px-3  text-xs  gap-1.5 rounded-lg',
  md: 'h-10 px-4  text-sm  gap-2   rounded-xl',
  lg: 'h-12 px-6  text-sm  gap-2.5 rounded-xl font-semibold',
}

export function Button({
  variant = 'outline',
  size    = 'md',
  loading = false,
  disabled,
  children,
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: (disabled || loading) ? 1 : 1.02, y: (disabled || loading) ? 0 : -2 }}
      whileTap={{   scale: (disabled || loading) ? 1 : 0.96, y: (disabled || loading) ? 0 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium border transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        'select-none relative overflow-hidden button-3d-active',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {loading && (
        <svg
          className="absolute left-3 h-4 w-4 animate-spin text-current"
          viewBox="0 0 24 24" fill="none"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="30" strokeLinecap="round" className="opacity-30" />
          <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      <span className={cn('flex items-center gap-inherit', loading && 'opacity-0')}>
        {children}
      </span>
    </motion.button>
  )
}
