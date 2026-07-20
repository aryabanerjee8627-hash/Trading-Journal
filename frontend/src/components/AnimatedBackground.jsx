import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const ORBS = [
  {
    size: 600,
    color: 'var(--primary)',
    initialX: -200,
    initialY: -200,
    animate: {
      x: [0, 120, -80, 60, 0],
      y: [0, -100, 80, -60, 0],
      scale: [1, 1.15, 0.9, 1.1, 1],
    },
    opacity: 0.04,
  },
  {
    size: 450,
    color: 'var(--chart-2)',
    initialX: 400,
    initialY: 300,
    animate: {
      x: [0, -80, 100, -40, 0],
      y: [0, 60, -120, 80, 0],
      scale: [1, 0.85, 1.1, 0.95, 1],
    },
    opacity: 0.035,
  },
  {
    size: 350,
    color: 'var(--muted-foreground)',
    initialX: -100,
    initialY: 500,
    animate: {
      x: [0, 60, -100, 40, 0],
      y: [0, -80, 60, -40, 0],
      scale: [1, 1.1, 0.95, 1.05, 1],
    },
    opacity: 0.03,
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
            opacity: prefersReducedMotion ? 0.02 : orb.opacity,
            transform: 'translate(-50%, -50%)',
            willChange: prefersReducedMotion ? 'auto' : 'transform',
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
            duration: 20 + index * 5,
            repeat: Infinity,
            ease: 'linear',
            repeatType: 'reverse',
          }}
        />
      ))}
    </div>
  )
}
