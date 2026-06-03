'use client'

import React from 'react'

/**
 * Animaciones SVG para cada ejercicio.
 * Todas usan keyframes CSS inline para no depender de tailwind config.
 */

const STYLES = `
@keyframes pa-tilt-lr { 0%,100% { transform: rotate(-18deg); } 50% { transform: rotate(18deg); } }
@keyframes pa-tilt-diag { 0%,100% { transform: rotate(-25deg) translateX(-2px); } 50% { transform: rotate(25deg) translateX(2px); } }
@keyframes pa-retract { 0%,100% { transform: translateX(8px); } 50% { transform: translateX(-4px); } }
@keyframes pa-blink { 0%,40%,60%,100% { transform: scaleY(1); } 50% { transform: scaleY(0.05); } }
@keyframes pa-look-far { 0%,100% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }
@keyframes pa-circle { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes pa-zoom-thumb { 0%,100% { transform: translateX(0) scale(1); } 50% { transform: translateX(-20px) scale(0.6); } }
@keyframes pa-palm-cover { 0%,100% { transform: translateX(-30px); opacity: 0.3; } 50% { transform: translateX(-2px); opacity: 1; } }
@keyframes pa-shrug { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes pa-twist { 0%,100% { transform: rotate(-20deg); } 50% { transform: rotate(20deg); } }
@keyframes pa-catcow { 0%,100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-3px) scaleY(0.9); } }
@keyframes pa-walk-leg { 0%,100% { transform: rotate(-20deg); } 50% { transform: rotate(20deg); } }
@keyframes pa-walk-leg-r { 0%,100% { transform: rotate(20deg); } 50% { transform: rotate(-20deg); } }
@keyframes pa-heel { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes pa-lunge { 0%,100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(4px) translateX(-4px); } }
@keyframes pa-wrist { 0%,100% { transform: rotate(-30deg); } 50% { transform: rotate(40deg); } }
@keyframes pa-fist { 0%,100% { transform: scale(0.7); } 50% { transform: scale(1); } }
@keyframes pa-drink { 0%,100% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(-30deg) translateY(-4px); } }
@keyframes pa-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.7; } }
@keyframes pa-arrow { 0%,100% { transform: translateX(-10px); opacity: 0; } 50% { transform: translateX(10px); opacity: 1; } }
.pa-svg { width: 100%; height: 100%; }
.pa-tilt-lr { animation: pa-tilt-lr 3s ease-in-out infinite; transform-origin: center bottom; }
.pa-tilt-diag { animation: pa-tilt-diag 3s ease-in-out infinite; transform-origin: center bottom; }
.pa-retract { animation: pa-retract 2s ease-in-out infinite; }
.pa-blink { animation: pa-blink 2.5s ease-in-out infinite; transform-origin: center; }
.pa-look-far { animation: pa-look-far 3s ease-in-out infinite; }
.pa-circle { animation: pa-circle 3s linear infinite; transform-origin: center; transform-box: fill-box; }
.pa-zoom-thumb { animation: pa-zoom-thumb 3s ease-in-out infinite; }
.pa-palm-cover { animation: pa-palm-cover 3s ease-in-out infinite; }
.pa-shrug { animation: pa-shrug 2s ease-in-out infinite; }
.pa-twist { animation: pa-twist 3s ease-in-out infinite; transform-origin: center bottom; }
.pa-catcow { animation: pa-catcow 3s ease-in-out infinite; transform-origin: center; }
.pa-walk-leg { animation: pa-walk-leg 1s ease-in-out infinite; transform-origin: top center; transform-box: fill-box; }
.pa-walk-leg-r { animation: pa-walk-leg-r 1s ease-in-out infinite; transform-origin: top center; transform-box: fill-box; }
.pa-heel { animation: pa-heel 2s ease-in-out infinite; }
.pa-lunge { animation: pa-lunge 3s ease-in-out infinite; }
.pa-wrist { animation: pa-wrist 2.5s ease-in-out infinite; transform-origin: left center; transform-box: fill-box; }
.pa-fist { animation: pa-fist 1.8s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
.pa-drink { animation: pa-drink 3s ease-in-out infinite; transform-origin: bottom center; transform-box: fill-box; }
.pa-pulse { animation: pa-pulse 1.5s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
.pa-arrow { animation: pa-arrow 2s ease-in-out infinite; }
`

// =====================================================================
// Pieza: cabeza esquemática
// =====================================================================
const Head = ({ className = '' }: { className?: string }) => (
    <g className={className}>
        <circle cx="60" cy="35" r="18" fill="currentColor" opacity="0.15" />
        <circle cx="60" cy="35" r="18" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="54" cy="33" r="2" fill="currentColor" />
        <circle cx="66" cy="33" r="2" fill="currentColor" />
        <path d="M 54 42 Q 60 46 66 42" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </g>
)

const Torso = () => (
    <g>
        <line x1="60" y1="53" x2="60" y2="95" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="60" y1="62" x2="42" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="60" y1="62" x2="78" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </g>
)

// =====================================================================
// Eye component
// =====================================================================
const EyeShape = ({ pupilClass = '', lidClass = '' }: { pupilClass?: string; lidClass?: string }) => (
    <g>
        <ellipse cx="60" cy="60" rx="40" ry="22" fill="currentColor" opacity="0.1" />
        <ellipse cx="60" cy="60" rx="40" ry="22" stroke="currentColor" strokeWidth="2.5" fill="white" />
        <g className={lidClass} style={{ transformOrigin: '60px 60px' }}>
            <circle className={pupilClass} cx="60" cy="60" r="12" fill="currentColor" />
            <circle cx="63" cy="57" r="3" fill="white" />
        </g>
    </g>
)

// =====================================================================
// Animations per exercise id
// =====================================================================

const Animations: Record<string, React.ReactNode> = {
    // ============ OJOS ============
    'eye-20-20-20': (
        <svg viewBox="0 0 120 120" className="pa-svg text-sky-600">
            <EyeShape pupilClass="pa-look-far" />
            <text x="60" y="105" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.6">mira lejos →</text>
        </svg>
    ),
    'eye-palming': (
        <svg viewBox="0 0 120 120" className="pa-svg text-sky-600">
            <EyeShape />
            <g className="pa-palm-cover">
                <path d="M 20 50 Q 30 35 45 40 L 60 55 L 60 75 L 30 75 Z" fill="currentColor" opacity="0.4" />
                <path d="M 20 50 Q 30 35 45 40 L 60 55" stroke="currentColor" strokeWidth="2" fill="none" />
            </g>
            <g className="pa-palm-cover" style={{ animationDelay: '0s' }}>
                <path d="M 100 50 Q 90 35 75 40 L 60 55 L 60 75 L 90 75 Z" fill="currentColor" opacity="0.4" transform="translate(-30,0)" />
            </g>
        </svg>
    ),
    'eye-blink': (
        <svg viewBox="0 0 120 120" className="pa-svg text-sky-600">
            <EyeShape lidClass="pa-blink" />
        </svg>
    ),
    'eye-massage': (
        <svg viewBox="0 0 120 120" className="pa-svg text-sky-600">
            <EyeShape />
            <circle cx="25" cy="60" r="5" fill="currentColor" className="pa-circle" />
            <circle cx="95" cy="60" r="5" fill="currentColor" className="pa-circle" style={{ animationDirection: 'reverse' }} />
        </svg>
    ),
    'eye-focus': (
        <svg viewBox="0 0 120 120" className="pa-svg text-sky-600">
            <EyeShape />
            <g className="pa-zoom-thumb">
                <circle cx="100" cy="60" r="8" fill="currentColor" />
                <text x="100" y="64" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">👍</text>
            </g>
        </svg>
    ),

    // ============ CUELLO ============
    'neck-tilt': (
        <svg viewBox="0 0 120 120" className="pa-svg text-rose-600">
            <g className="pa-tilt-lr">
                <Head />
            </g>
            <Torso />
        </svg>
    ),
    'neck-retraction': (
        <svg viewBox="0 0 120 120" className="pa-svg text-rose-600">
            <g className="pa-retract">
                <Head />
            </g>
            <Torso />
            <g className="pa-arrow">
                <path d="M 85 35 L 95 35 M 92 32 L 95 35 L 92 38" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>
        </svg>
    ),
    'neck-diagonal': (
        <svg viewBox="0 0 120 120" className="pa-svg text-rose-600">
            <g className="pa-tilt-diag">
                <Head />
            </g>
            <Torso />
        </svg>
    ),

    // ============ HOMBROS ============
    'shoulder-rolls': (
        <svg viewBox="0 0 120 120" className="pa-svg text-purple-600">
            <Head />
            <g className="pa-shrug">
                <line x1="60" y1="53" x2="60" y2="95" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="60" y1="62" x2="42" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="60" y1="62" x2="78" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="42" cy="62" r="4" fill="currentColor" />
                <circle cx="78" cy="62" r="4" fill="currentColor" />
            </g>
        </svg>
    ),
    'shoulder-clasp': (
        <svg viewBox="0 0 120 120" className="pa-svg text-purple-600">
            <Head />
            <line x1="60" y1="53" x2="60" y2="95" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 60 62 Q 35 70 40 95" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 60 62 Q 85 70 80 95" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <g className="pa-pulse">
                <circle cx="60" cy="95" r="6" fill="currentColor" opacity="0.6" />
            </g>
        </svg>
    ),
    'shoulder-doorway': (
        <svg viewBox="0 0 120 120" className="pa-svg text-purple-600">
            <rect x="15" y="10" width="90" height="100" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.4" />
            <Head />
            <line x1="60" y1="53" x2="60" y2="95" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="60" y1="62" x2="25" y2="62" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="60" y1="62" x2="95" y2="62" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="25" y1="62" x2="25" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="95" y1="62" x2="95" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    ),

    // ============ ESPALDA ============
    'back-twist': (
        <svg viewBox="0 0 120 120" className="pa-svg text-amber-600">
            <Head />
            <g className="pa-twist">
                <line x1="60" y1="53" x2="60" y2="95" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="60" y1="62" x2="42" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="60" y1="62" x2="78" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </g>
        </svg>
    ),
    'back-catcow': (
        <svg viewBox="0 0 120 120" className="pa-svg text-amber-600">
            <g className="pa-catcow">
                <path d="M 20 80 Q 60 50 100 80" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                <circle cx="100" cy="80" r="10" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2" />
                <line x1="25" y1="80" x2="25" y2="105" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="40" y1="80" x2="40" y2="105" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="80" y1="80" x2="80" y2="105" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="95" y1="80" x2="95" y2="105" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </g>
        </svg>
    ),

    // ============ PIERNAS ============
    'legs-walk': (
        <svg viewBox="0 0 120 120" className="pa-svg text-emerald-600">
            <Head />
            <line x1="60" y1="53" x2="60" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="60" y1="62" x2="42" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="60" y1="62" x2="78" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line className="pa-walk-leg" x1="60" y1="80" x2="50" y2="110" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line className="pa-walk-leg-r" x1="60" y1="80" x2="70" y2="110" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    ),
    'legs-calf': (
        <svg viewBox="0 0 120 120" className="pa-svg text-emerald-600">
            <g className="pa-heel">
                <Head />
                <line x1="60" y1="53" x2="60" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="60" y1="62" x2="42" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="60" y1="62" x2="78" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="60" y1="80" x2="50" y2="105" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="60" y1="80" x2="70" y2="105" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </g>
            <line x1="35" y1="110" x2="85" y2="110" stroke="currentColor" strokeWidth="2" opacity="0.4" />
        </svg>
    ),
    'legs-hip': (
        <svg viewBox="0 0 120 120" className="pa-svg text-emerald-600">
            <g className="pa-lunge">
                <Head />
                <line x1="60" y1="53" x2="60" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="60" y1="62" x2="42" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="60" y1="62" x2="78" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="60" y1="80" x2="35" y2="100" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="35" y1="100" x2="35" y2="110" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="60" y1="80" x2="90" y2="110" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </g>
            <line x1="20" y1="110" x2="100" y2="110" stroke="currentColor" strokeWidth="2" opacity="0.4" />
        </svg>
    ),

    // ============ MANOS ============
    'hands-wrist': (
        <svg viewBox="0 0 120 120" className="pa-svg text-indigo-600">
            <line x1="20" y1="60" x2="55" y2="60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <g className="pa-wrist" style={{ transformOrigin: '55px 60px' }}>
                <rect x="55" y="50" width="35" height="20" rx="6" fill="currentColor" opacity="0.3" />
                <rect x="55" y="50" width="35" height="20" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
                <line x1="88" y1="52" x2="98" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="88" y1="58" x2="100" y2="58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="88" y1="64" x2="100" y2="65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="88" y1="68" x2="98" y2="70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </g>
        </svg>
    ),
    'hands-fist': (
        <svg viewBox="0 0 120 120" className="pa-svg text-indigo-600">
            <g className="pa-fist">
                <circle cx="60" cy="60" r="25" fill="currentColor" opacity="0.25" />
                <circle cx="60" cy="60" r="25" stroke="currentColor" strokeWidth="2.5" fill="none" />
                <line x1="48" y1="50" x2="48" y2="35" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <line x1="56" y1="48" x2="56" y2="30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <line x1="64" y1="48" x2="64" y2="30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <line x1="72" y1="50" x2="72" y2="35" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </g>
        </svg>
    ),

    // ============ AGUA ============
    'water-glass': (
        <svg viewBox="0 0 120 120" className="pa-svg text-teal-600">
            <Head />
            <line x1="60" y1="53" x2="60" y2="95" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="60" y1="62" x2="42" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <g className="pa-drink">
                <line x1="60" y1="62" x2="78" y2="50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 73 35 L 88 35 L 86 55 L 75 55 Z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
                <path d="M 75 45 L 86 45" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
            </g>
        </svg>
    ),
}

// Fallback genérico
const Fallback = (
    <svg viewBox="0 0 120 120" className="pa-svg text-muted-foreground">
        <circle cx="60" cy="60" r="40" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" className="pa-pulse" />
        <circle cx="60" cy="60" r="20" fill="currentColor" opacity="0.3" />
    </svg>
)

export default function ExerciseAnimation({ id, size = 'md' }: { id: string; size?: 'sm' | 'md' | 'lg' }) {
    const sizeClass = size === 'sm' ? 'w-16 h-16' : size === 'lg' ? 'w-48 h-48' : 'w-32 h-32'
    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: STYLES }} />
            <div className={sizeClass}>
                {Animations[id] || Fallback}
            </div>
        </>
    )
}
