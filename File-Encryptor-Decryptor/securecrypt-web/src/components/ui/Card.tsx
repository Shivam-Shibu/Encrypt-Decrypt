import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '../../lib/utils'
import { useRef, type ReactNode, type MouseEvent } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  glow?: boolean
  tilt?: boolean
}

export function Card({ children, className, glow = false, tilt = true }: CardProps) {
  const ref = useRef<HTMLDivElement>(null)
  
  // Mouse position values (0 to 1, centered at 0.5)
  const x = useMotionValue(0.5)
  const y = useMotionValue(0.5)
  
  // Springs for smooth movement
  const xSpring = useSpring(x, { stiffness: 150, damping: 22 })
  const ySpring = useSpring(y, { stiffness: 150, damping: 22 })
  
  // Rotate values (max tilt of 6 degrees)
  const rotateX = useTransform(ySpring, [0, 1], [6, -6])
  const rotateY = useTransform(xSpring, [0, 1], [-6, 6])
  
  // Glow spotlight coordinates in percent
  const glowX = useTransform(xSpring, [0, 1], [0, 100])
  const glowY = useTransform(ySpring, [0, 1], [0, 100])

  // Radial gradient style for dynamic sheen spotlight
  const backgroundSpotlight = useTransform(
    [glowX, glowY],
    ([gx, gy]) => `radial-gradient(circle 240px at ${gx}% ${gy}%, rgba(255, 255, 255, 0.05) 0%, rgba(99, 102, 241, 0.02) 50%, transparent 100%)`
  )

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!tilt || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    x.set(mouseX / rect.width)
    y.set(mouseY / rect.height)
  }

  function handleMouseLeave() {
    x.set(0.5)
    y.set(0.5)
  }

  return (
    <div className="perspective-container">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: tilt ? rotateX : 0,
          rotateY: tilt ? rotateY : 0,
          transformStyle: 'preserve-3d',
        }}
        className={cn(
          'glass rounded-2xl p-6 relative overflow-hidden preserve-3d glow-border-3d',
          'transition-shadow duration-300 group',
          glow && 'glow-brand',
          className
        )}
      >
        {/* Dynamic Sheen Spotlight */}
        {tilt && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: backgroundSpotlight }}
          />
        )}

        {/* Subtle top highlight line */}
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-brand-400/30 to-transparent z-20 pointer-events-none" />

        {/* Card Content wrapper to ensure children are correctly layered in 3D */}
        <div className="relative z-20" style={{ transform: 'translateZ(20px)' }}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}

interface CardHeaderProps {
  icon: ReactNode
  title: string
  description?: string
}

export function CardHeader({ icon, title, description }: CardHeaderProps) {
  return (
    <div className="flex items-start gap-3 mb-5 pb-4 border-b border-white/[0.06]">
      <div className="w-9 h-9 rounded-lg bg-brand-500/15 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description && <p className="text-xs text-white/44 mt-0.5">{description}</p>}
      </div>
    </div>
  )
}
