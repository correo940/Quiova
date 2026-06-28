'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { BlockRenderer } from './BlockRenderer'
import { AuthGate } from './AuthGate'
import { PILLAR_THEME, type PillarTheme } from './theme'
import type { GuiaBundle, Section, BlockComponent } from './types'

// ── Fade-in on scroll ──────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react'

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fallback = setTimeout(() => setVisible(true), delay * 1000 + 800)
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { clearTimeout(fallback); setVisible(true); obs.disconnect() } },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    )
    obs.observe(el)
    return () => { obs.disconnect(); clearTimeout(fallback) }
  }, [delay])

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

// ── Section renderer ───────────────────────────────────────────────────────────
function SectionBlocks({
  section,
  components,
  theme,
}: {
  section: Section
  components: Record<string, BlockComponent>
  theme: PillarTheme
}) {
  const inner = (
    <div className="space-y-8">
      {section.blocks.map((block, i) => (
        <FadeIn key={block.id} delay={i * 0.07}>
          <BlockRenderer block={block} components={components} theme={theme} />
        </FadeIn>
      ))}
    </div>
  )

  if (section.requiresAuth) {
    return <AuthGate theme={theme}>{inner}</AuthGate>
  }
  return inner
}

// ── Main page shell ────────────────────────────────────────────────────────────
export function GuiaPage({ bundle }: { bundle: GuiaBundle }) {
  const { config, components = {} } = bundle
  const theme = PILLAR_THEME[config.pillar]
  const [activeId, setActiveId] = useState(config.sections[0].id)
  const activeSection = config.sections.find(s => s.id === activeId)!

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>

      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6">
        <Link
          href={theme.href}
          className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: theme.color }}
        >
          <ArrowLeft size={15} />
          {theme.label}
        </Link>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header className="relative px-6 py-16 md:py-24 max-w-4xl mx-auto">
        <FadeIn>
          <p
            className="text-xs font-black tracking-[0.2em] uppercase mb-4"
            style={{ color: theme.color }}
          >
            {theme.label} · {config.readingMinutes ? `${config.readingMinutes} min` : 'Guía'}
          </p>
          <h1 className="font-black text-4xl md:text-6xl leading-tight mb-4" style={{ color: '#0f172a' }}>
            {config.title}
          </h1>
          <p className="text-lg md:text-xl leading-relaxed max-w-2xl" style={{ color: '#475569' }}>
            {config.subtitle}
          </p>
        </FadeIn>

        {config.heroImage && (
          <FadeIn delay={0.15}>
            <div className="mt-10 rounded-3xl overflow-hidden aspect-[16/7] relative">
              <Image
                src={config.heroImage}
                alt={config.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </FadeIn>
        )}
      </header>

      {/* ── Tabs (only when > 1 section) ──────────────────────────────────── */}
      {config.sections.length > 1 && (
        <div
          className="sticky top-0 z-20 border-b"
          style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
        >
          <nav className="max-w-4xl mx-auto px-6 flex gap-1 overflow-x-auto no-scrollbar">
            {config.sections.map(s => {
              const isActive = s.id === activeId
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors"
                  style={{
                    borderColor: isActive ? theme.color : 'transparent',
                    color: isActive ? theme.color : '#64748b',
                  }}
                >
                  {s.icon && <span>{s.icon}</span>}
                  {s.label}
                </button>
              )
            })}
          </nav>
        </div>
      )}

      {/* ── Section content ────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-6 py-12 pb-24">
        <SectionBlocks
          key={activeId}
          section={activeSection}
          components={components}
          theme={theme}
        />
      </main>

    </div>
  )
}
