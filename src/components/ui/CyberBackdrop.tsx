import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  char?: string
  charAge?: number
}

export function CyberBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Particle pool
    const particles: Particle[] = []
    const particleCount = Math.min(60, Math.floor((width * height) / 20000))

    // Initialize regular connection nodes
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.15,
      })
    }

    // Matrix characters pool
    const matrixChars: Particle[] = []
    const matrixCount = Math.min(25, Math.floor(width / 60))
    const charsList = '01ABCDEF#$@&%XØ'

    for (let i = 0; i < matrixCount; i++) {
      matrixChars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: Math.random() * 0.6 + 0.3,
        size: Math.random() * 4 + 9, // Font size
        alpha: Math.random() * 0.2 + 0.05,
        char: charsList[Math.floor(Math.random() * charsList.length)],
        charAge: Math.random() * 100,
      })
    }

    // Mouse coordinates tracking
    const mouse = { x: -1000, y: -1000, active: false }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.active = true
    }

    const handleMouseLeave = () => {
      mouse.x = -1000
      mouse.y = -1000
      mouse.active = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)

    // Main render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // Draw connection grid lines (nodes)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // Update position
        p.x += p.vx
        p.y += p.vy

        // Bound collision checks
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        // Mouse attraction/magnetic pull
        if (mouse.active) {
          const dx = mouse.x - p.x
          const dy = mouse.y - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            p.x += dx * 0.005
            p.y += dy * 0.005
          }
        }

        // Draw particle node
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(16, 185, 129, ${p.alpha})`
        ctx.fill()
      }

      // Draw interactive connections (lines)
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 100) {
            const lineAlpha = (1 - dist / 100) * 0.08
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(16, 185, 129, ${lineAlpha})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }

        // Mouse connection lines
        if (mouse.active) {
          const dx = mouse.x - p1.x
          const dy = mouse.y - p1.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            const mouseAlpha = (1 - dist / 150) * 0.15
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.strokeStyle = `rgba(52, 211, 153, ${mouseAlpha})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      // Draw subtle matrix digital streams
      ctx.font = '500 11px var(--font-mono)'
      for (let i = 0; i < matrixChars.length; i++) {
        const mc = matrixChars[i]

        // Update position
        mc.y += mc.vy
        mc.charAge = (mc.charAge ?? 0) + 1

        // Swap character occasionally to look active
        if (mc.charAge % 30 === 0) {
          mc.char = charsList[Math.floor(Math.random() * charsList.length)]
        }

        // Reset if offscreen
        if (mc.y > height) {
          mc.y = -20
          mc.x = Math.random() * width
          mc.vy = Math.random() * 0.6 + 0.3
        }

        // Draw character
        ctx.fillStyle = `rgba(16, 185, 129, ${mc.alpha})`
        ctx.fillText(mc.char ?? '', mc.x, mc.y)

        // Draw fade trail
        ctx.fillStyle = `rgba(16, 185, 129, ${mc.alpha * 0.4})`
        ctx.fillText(charsList[Math.floor(Math.random() * charsList.length)], mc.x, mc.y - 12)
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}
