import type { Variants } from 'framer-motion'
import type { MotionProps } from 'framer-motion'
import { ANIMATION_DURATIONS } from './config'

type AnimProps = Pick<MotionProps, 'animate' | 'transition'>

export type PulseSpeed = 'slow' | 'normal' | 'fast'

export function bodyPulse(speed: PulseSpeed): AnimProps {
  const duration = ANIMATION_DURATIONS.pulse[speed]
  return {
    animate: { opacity: [0.91, 1, 0.91] },
    transition: { duration, repeat: Infinity, ease: 'easeInOut' },
  }
}

export function systemGlow(intensity: number): AnimProps {
  const dur = ANIMATION_DURATIONS.glow
  const lo = 0.28 + intensity * 0.22
  const hi = 0.56 + intensity * 0.22
  return {
    animate: { opacity: [lo, hi, lo] },
    transition: { duration: dur, repeat: Infinity, ease: 'easeInOut' },
  }
}

export const bodyVariants: Variants = {
  initial: { opacity: 0, scale: 0.97 },
  enter:   { opacity: 1, scale: 1, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, scale: 0.97, transition: { duration: 0.4 } },
}

export const systemVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.4 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 22 } },
  exit:    { opacity: 0, scale: 0.4, transition: { duration: 0.25 } },
}

export const ambientTransition = {
  duration: ANIMATION_DURATIONS.transition,
  ease: 'easeInOut',
} as const
