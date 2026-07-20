import { motion, useReducedMotion } from 'framer-motion'

const ORBS = [
  {
    size: 700,
    color: 'oklch(0.65 0.14 165)',
    initialX: -300,
    initialY: -200,
    animate: {
      x: [0, 140, -100, 80, 0],
      y: [0, -120, 100, -80, 0],
      scale: [1, 1.2, 0.85, 1.1, 1],
    },
  },
  {
    size: 500,
    color: 'oklch(0.6 0.12 220)',
    initialX: 400,
    initialY: 100,
    animate: {
      x: [0, -100, 120, -60, 0],
      y: [0, 80, -140, 100, 0],
      scale: [1, 0.8, 1.15, 0.9, 1],
    },
  },
  {
    size: 400,
    color: 'oklch(0.7 0.1 30)',
    initialX: -100,
    initialY: 500,
    animate: {
      x: [0, 80, -120, 60, 0],
      y: [0, -100, 80, -60, 0],
      scale: [1, 1.15, 0.9, 1.05, 1],
    },
  },
]

export default function AnimatedBackground() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {ORBS.map((orb, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            left: `calc(50% + ${orb.initialX}px)`,
            top: `calc(50% + ${orb.initialY}px)`,
            opacity: prefersReducedMotion ? 0.03 : 0.07,
            transform: 'translate(-50%, -50%)',
          }}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  x: orb.animate.x,
                  y: orb.animate.y,
                  scale: orb.animate.scale,
                }
          }
          transition={{
            duration: 25 + index * 8,
            repeat: Infinity,
            ease: 'linear',
            repeatType: 'reverse',
          }}
        />
      ))}
    </div>
  )
}
