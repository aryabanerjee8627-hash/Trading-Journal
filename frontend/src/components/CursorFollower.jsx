import { useEffect, useState } from 'react'
import { motion, useSpring, useReducedMotion } from 'framer-motion'

export default function CursorFollower() {
  const prefersReducedMotion = useReducedMotion()
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  const dotX = useSpring(0, { damping: 30, stiffness: 300, mass: 0.2 })
  const dotY = useSpring(0, { damping: 30, stiffness: 300, mass: 0.2 })
  const ringX = useSpring(0, { damping: 40, stiffness: 120, mass: 0.6 })
  const ringY = useSpring(0, { damping: 40, stiffness: 120, mass: 0.6 })

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  useEffect(() => {
    if (isTouchDevice || prefersReducedMotion) return

    const handleMouseMove = (e) => {
      dotX.set(e.clientX)
      dotY.set(e.clientY)
      ringX.set(e.clientX)
      ringY.set(e.clientY)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isTouchDevice, prefersReducedMotion, dotX, dotY, ringX, ringY])

  if (isTouchDevice || prefersReducedMotion) return null

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-50"
        style={{ x: ringX, y: ringY }}
      >
        <div
          className="-translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 36,
            height: 36,
            border: '1px solid oklch(0.65 0.14 165 / 0.25)',
            background: 'radial-gradient(circle, oklch(0.65 0.14 165 / 0.06) 0%, transparent 70%)',
          }}
        />
      </motion.div>
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-50"
        style={{ x: dotX, y: dotY }}
      >
        <div
          className="-translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 4,
            height: 4,
            background: 'oklch(0.65 0.14 165 / 0.5)',
          }}
        />
      </motion.div>
    </>
  )
}
