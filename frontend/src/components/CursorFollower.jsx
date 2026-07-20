import { useEffect, useState } from 'react'
import { motion, useSpring, useReducedMotion } from 'framer-motion'

export default function CursorFollower() {
  const prefersReducedMotion = useReducedMotion()
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  const springX = useSpring(0, { damping: 25, stiffness: 150, mass: 0.5 })
  const springY = useSpring(0, { damping: 25, stiffness: 150, mass: 0.5 })

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  useEffect(() => {
    if (isTouchDevice || prefersReducedMotion) return

    const handleMouseMove = (e) => {
      springX.set(e.clientX)
      springY.set(e.clientY)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isTouchDevice, prefersReducedMotion, springX, springY])

  if (isTouchDevice || prefersReducedMotion) return null

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-50"
      style={{
        x: springX,
        y: springY,
      }}
    >
      <div
        className="-translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 20,
          height: 20,
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)',
          mixBlendMode: 'overlay',
        }}
      />
    </motion.div>
  )
}
