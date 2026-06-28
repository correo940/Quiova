'use client'

import { useId, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import type { CuerpoVivoProps } from './types'
import { SYSTEM_CONFIG, GLOW_BLUR, SVG_VIEWBOX } from './config'
import { deriveBodyState, normalizeSize } from './utils'
import {
  bodyPulse, systemGlow, bodyVariants, systemVariants, ambientTransition,
} from './animations'

export function CuerpoVivo(props: CuerpoVivoProps) {
  const {
    timeOfDay, energyLevel, alertness, melatonin, cortisol, bodyTemperature,
    highlightedSystems = [],
    size,
    variant = 'light',
    animated = true,
    className,
    style,
  } = props

  // React 18 useId generates `:r0:` — colons are invalid in SVG id references
  const rawId = useId()
  const uid = rawId.replace(/:/g, '_')
  const filterId = `${uid}_glow`

  const state = useMemo(
    () => deriveBodyState({ timeOfDay, energyLevel, alertness, melatonin, cortisol, bodyTemperature }),
    [timeOfDay, energyLevel, alertness, melatonin, cortisol, bodyTemperature]
  )

  const px       = normalizeSize(size)
  const { width: vw, height: vh } = SVG_VIEWBOX
  const ratio    = vh / vw
  const isDark   = variant === 'dark'

  const ambientColor = `hsl(${state.ambientHue}, ${state.ambientSaturation}%, ${state.ambientLightness}%)`
  const bodyFill     = state.bodyTone
  const stroke       = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)'

  const activeSystems = highlightedSystems.filter(s => s !== 'skin')
  const hasSkin       = highlightedSystems.includes('skin')

  return (
    <motion.div
      className={className}
      style={{ width: px, height: px * ratio, display: 'inline-block', ...style }}
      variants={bodyVariants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        width={px}
        height={px * ratio}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Representación visual del cuerpo"
        role="img"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <filter id={filterId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation={GLOW_BLUR.system} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient circadian glow */}
        <motion.ellipse
          cx={vw / 2}
          cy={vh * 0.44}
          rx={vw * 0.52}
          ry={vh * 0.41}
          initial={{ opacity: 0, fill: ambientColor }}
          animate={{
            fill: ambientColor,
            opacity: 0.14 + state.glowIntensity * 0.10,
          }}
          transition={ambientTransition}
        />

        {/* Body silhouette with breathing pulse */}
        <motion.g {...(animated ? bodyPulse(state.pulseSpeed) : {})}>
          {/* Head */}
          <circle cx={100} cy={52} r={36} fill={bodyFill} stroke={stroke} strokeWidth={1.5} />
          {/* Neck */}
          <rect x={89} y={86} width={22} height={22} rx={8} fill={bodyFill} />
          {/* Torso */}
          <rect x={60} y={104} width={80} height={164} rx={16} fill={bodyFill} stroke={stroke} strokeWidth={1.5} />
          {/* Left arm */}
          <rect
            x={22} y={108} width={34} height={96} rx={14}
            fill={bodyFill} stroke={stroke} strokeWidth={1}
            transform="rotate(-4, 39, 156)"
          />
          {/* Right arm */}
          <rect
            x={144} y={108} width={34} height={96} rx={14}
            fill={bodyFill} stroke={stroke} strokeWidth={1}
            transform="rotate(4, 161, 156)"
          />
          {/* Left leg */}
          <rect
            x={63} y={263} width={34} height={143} rx={14}
            fill={bodyFill} stroke={stroke} strokeWidth={1.5}
            transform="rotate(-1.5, 80, 334)"
          />
          {/* Right leg */}
          <rect
            x={103} y={263} width={34} height={143} rx={14}
            fill={bodyFill} stroke={stroke} strokeWidth={1.5}
            transform="rotate(1.5, 120, 334)"
          />
        </motion.g>

        {/* Skin: temperature overlay across the full body */}
        <AnimatePresence>
          {hasSkin && (
            <motion.rect
              key="skin-overlay"
              x={0} y={0} width={vw} height={vh}
              fill={SYSTEM_CONFIG.skin.color}
              variants={systemVariants}
              initial="hidden"
              animate={{ opacity: 0.05 + state.glowIntensity * 0.06 }}
              exit="exit"
              transition={ambientTransition}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </AnimatePresence>

        {/* System dots */}
        <AnimatePresence>
          {activeSystems.map(system => {
            const cfg = SYSTEM_CONFIG[system]
            return (
              <motion.g key={system}>
                {/* Halo glow */}
                <motion.circle
                  cx={cfg.cx}
                  cy={cfg.cy}
                  r={cfg.r * 2.8}
                  fill={cfg.color}
                  filter={`url(#${filterId})`}
                  {...(animated ? systemGlow(state.glowIntensity) : { animate: { opacity: 0.3 } })}
                />
                {/* Core dot */}
                <motion.circle
                  cx={cfg.cx}
                  cy={cfg.cy}
                  r={cfg.r}
                  fill={cfg.color}
                  variants={systemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                />
              </motion.g>
            )
          })}
        </AnimatePresence>
      </svg>
    </motion.div>
  )
}
