'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const APPS = [
  { name: 'Mi Hogar',          desc: 'Tu base de operaciones del día a día',        emoji: '🏠', cat: 'cuerpo' },
  { name: 'Pausas Activas',    desc: 'Descansos inteligentes en tu jornada',        emoji: '🧘', cat: 'cuerpo' },
  { name: 'Salud Ocupacional', desc: 'Bienestar en el trabajo',                     emoji: '💪', cat: 'cuerpo' },
  { name: 'Huerto',            desc: 'Cultiva tu propio espacio verde',              emoji: '🌱', cat: 'cuerpo' },
  { name: 'El Campus',         desc: 'Aprendizaje continuo para toda la familia',   emoji: '📚', cat: 'mente'  },
  { name: 'Debate',            desc: 'Desarrolla tu pensamiento crítico',            emoji: '🗣️', cat: 'mente'  },
  { name: 'Cuadrante',         desc: 'Prioriza lo que realmente importa',           emoji: '🎯', cat: 'mente'  },
  { name: 'Resumen Diario',    desc: 'Revisa tu día con claridad',                  emoji: '📋', cat: 'mente'  },
  { name: 'Oficina',           desc: 'Gestión profesional integrada',               emoji: '🏢', cat: 'org'    },
  { name: 'Organizador',       desc: 'Tareas y proyectos bajo control',             emoji: '📅', cat: 'org'    },
  { name: 'Organizador Vital', desc: 'Tu vida organizada de un vistazo',            emoji: '✨', cat: 'org'    },
  { name: 'Watermark Remover', desc: 'Herramienta rápida para tus imágenes',        emoji: '🖼️', cat: 'org'    },
];

const COMING_SOON = [
  { name: 'Finanzas Familiar', emoji: '💰', desc: 'Control de gastos en familia' },
  { name: 'Recetas & Nutrición', emoji: '🥗', desc: 'Come mejor cada día' },
  { name: 'Meditación', emoji: '🧠', desc: 'Cuida tu salud mental' },
  { name: 'Viajes', emoji: '✈️', desc: 'Planifica tus escapadas' },
];

const CATS = [
  {
    key: 'cuerpo', label: 'Cuerpo', color: '#1a5c2e',
    gradientFrom: '#1a5c2e', gradientTo: '#0d3318',
    desc: 'Cuida tu salud física, tu hogar y tu bienestar',
    emoji: '💚',
  },
  {
    key: 'mente', label: 'Mente', color: '#1558a8',
    gradientFrom: '#1558a8', gradientTo: '#0b3470',
    desc: 'Aprende, piensa mejor y crece cada día',
    emoji: '💙',
  },
  {
    key: 'org', label: 'Organización', color: '#b87514',
    gradientFrom: '#b87514', gradientTo: '#7a4d0d',
    desc: 'Gestiona tu tiempo, proyectos y vida profesional',
    emoji: '🧡',
  },
];

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
  } as const;
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white font-body overflow-x-hidden">

      {/* ─────────────────────────── HERO ─────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden bg-[#060d0a]">
        {/* Blobs de fondo */}
        <div className="absolute top-[-80px] left-[-80px] w-[500px] h-[500px] rounded-full blur-[160px] opacity-25 pointer-events-none" style={{ backgroundColor: '#1a5c2e' }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-[480px] h-[480px] rounded-full blur-[160px] opacity-20 pointer-events-none" style={{ backgroundColor: '#1558a8' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-30 pointer-events-none" style={{ backgroundColor: '#0d3318' }} />

        {/* Grid decorativa */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center gap-6 max-w-3xl"
        >
          {/* Badge */}
          <motion.span
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="inline-flex items-center gap-2 text-sm px-5 py-2 rounded-full backdrop-blur-sm border"
            style={{ backgroundColor: 'rgba(26,92,46,0.2)', borderColor: 'rgba(26,92,46,0.4)', color: '#6ee7a0' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#4ade80' }} />
            Beta abierto — consigue acceso anticipado
          </motion.span>

          {/* Título */}
          <h1 className="text-7xl sm:text-8xl md:text-[108px] font-black text-white tracking-tighter leading-none">
            Quioba
          </h1>

          {/* Tagline con gradiente */}
          <p className="text-2xl md:text-3xl font-semibold italic bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #6ee7a0, #93c5fd)' }}>
            "te sienta bien quererte"
          </p>

          <p className="text-base md:text-lg text-white/50 max-w-md leading-relaxed">
            Una plataforma de apps conectadas para cuidar tu cuerpo, tu mente y tu vida — todo desde un solo lugar.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-4 mt-3">
            <Link
              href="/beta"
              className="group relative inline-flex items-center gap-2 text-white px-8 py-3.5 rounded-full font-bold text-lg transition-all duration-300 hover:-translate-y-0.5"
              style={{ backgroundColor: '#1a5c2e' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 40px rgba(26,92,46,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              Unirme al Beta
              <span className="text-xl">✨</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/20 text-white/80 hover:text-white px-8 py-3.5 rounded-full font-bold text-lg transition-all duration-300 backdrop-blur-sm"
            >
              Ya tengo cuenta →
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-4 text-white/30 text-sm">
            <span>12 apps</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>3 categorías</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Beta abierto</span>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="absolute bottom-10 flex flex-col items-center gap-3 text-white/25"
        >
          <span className="text-[10px] tracking-[0.3em] uppercase">Scroll</span>
          <motion.div
            animate={{ scaleY: [1, 0.3, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent origin-top"
          />
        </motion.div>
      </section>

      {/* ───────────────────────── PILLARS ───────────────────────── */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              Todo lo que necesitas,{' '}
              <span style={{ color: '#1a5c2e' }}>en un lugar</span>
            </h2>
            <p className="text-slate-400 text-lg mt-4 max-w-xl mx-auto">
              Tres pilares que cubren cada aspecto de tu bienestar
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CATS.map((cat, i) => (
              <motion.div
                key={cat.key}
                {...fadeUp(i * 0.12)}
                className="rounded-3xl p-8 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
                    style={{ background: `linear-gradient(135deg, ${cat.gradientFrom}, ${cat.gradientTo})` }}
              >
                <div className="absolute -bottom-8 -right-8 text-[120px] opacity-10 pointer-events-none select-none group-hover:opacity-20 transition-opacity">
                  {cat.emoji}
                </div>
                <span className="text-5xl block mb-5">{cat.emoji}</span>
                <h3 className="text-2xl font-bold mb-2">{cat.label}</h3>
                <p className="text-white/70 leading-relaxed text-sm">{cat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── APPS ───────────────────────── */}
      {CATS.map((cat, ci) => {
        const apps = APPS.filter(a => a.cat === cat.key);
        return (
          <section key={cat.key} className={`py-24 px-6 ${ci % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
            <div className="max-w-5xl mx-auto">
              <motion.div {...fadeUp()} className="mb-12 flex items-center gap-4">
                <div className="w-1.5 h-14 rounded-full" style={{ background: `linear-gradient(to bottom, ${cat.color}, transparent)` }} />
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: cat.color }}>
                    {cat.label}
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-0.5">
                    Apps de {cat.label}
                  </h2>
                </div>
              </motion.div>

              {/* Bento grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {apps.map((app, i) => (
                  <motion.div
                    key={app.name}
                    {...fadeUp(i * 0.07)}
                    className={`${i === 0 ? 'sm:col-span-2 lg:col-span-2' : ''} group relative bg-white rounded-2xl p-7 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden cursor-default`}
                  >
                    {/* Hover glow */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity rounded-2xl"
                      style={{ backgroundColor: cat.color }}
                    />
                    {/* Big emoji bg */}
                    <div className="absolute -bottom-4 -right-4 text-[90px] opacity-[0.06] pointer-events-none select-none group-hover:opacity-[0.12] transition-opacity">
                      {app.emoji}
                    </div>

                    <span className="text-4xl block mb-4">{app.emoji}</span>
                    <h3 className="text-xl font-bold text-slate-800">{app.name}</h3>
                    <p className="text-slate-400 mt-1.5 text-sm leading-relaxed">{app.desc}</p>

                    {/* Accent line */}
                    <div
                      className="mt-5 h-0.5 w-8 rounded-full group-hover:w-14 transition-all duration-500"
                      style={{ backgroundColor: cat.color }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* ───────────────────── PRÓXIMAMENTE ───────────────────── */}
      <section className="py-28 px-6 bg-[#060d0a] text-white relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full blur-[180px] opacity-15 pointer-events-none" style={{ backgroundColor: '#1a5c2e' }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-700 rounded-full blur-[180px] opacity-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <span className="inline-block text-xs font-black tracking-[0.2em] uppercase mb-4" style={{ color: '#6ee7a0' }}>
              El futuro
            </span>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Y esto es solo el principio
            </h2>
            <p className="text-white/50 text-lg">El ecosistema de Quioba sigue creciendo</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {COMING_SOON.map((app, i) => (
              <motion.div
                key={app.name}
                {...fadeUp(i * 0.1)}
                className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-7 text-center transition-all duration-300 hover:-translate-y-1"
              >
                <span className="text-4xl block mb-4">{app.emoji}</span>
                <h3 className="font-bold text-base">{app.name}</h3>
                <p className="text-white/40 text-xs mt-1.5 leading-relaxed">{app.desc}</p>
                <span className="mt-4 inline-block text-[11px] bg-white/10 border border-white/20 px-3 py-1 rounded-full text-white/60">
                  Próximamente
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────── CTA FINAL ─────────────────────── */}
      <section className="relative py-36 px-6 text-center overflow-hidden">
        {/* Fondo degradado suave */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, white, #e8f5ee, white)' }} />

        <motion.div
          {...fadeUp()}
          className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-6"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
            className="text-7xl"
          >
            🌿
          </motion.div>

          <h2 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight">
            ¿Listo para<br />
            <span style={{ color: '#1a5c2e' }}>quererte más?</span>
          </h2>

          <p className="text-slate-400 text-xl max-w-md leading-relaxed">
            Únete al programa beta y sé de los primeros en vivir con Quioba.
          </p>

          <Link
            href="/beta"
            className="mt-2 inline-flex items-center gap-3 text-white px-12 py-5 rounded-full font-black text-xl transition-all duration-300 hover:-translate-y-1"
            style={{ backgroundColor: '#1a5c2e' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 20px 60px rgba(26,92,46,0.4)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            Quiero acceso anticipado
            <span className="text-2xl">✨</span>
          </Link>

          <p className="text-slate-300 text-sm mt-2">
            Gratis durante el beta · Sin tarjeta de crédito
          </p>
        </motion.div>
      </section>

      {/* ─────────────────────── FOOTER ─────────────────────── */}
      <footer className="py-10 text-center text-slate-300 text-sm border-t border-slate-100 bg-white">
        <p className="mb-2">
          <span className="font-semibold text-slate-500">Quioba</span> — te sienta bien quererte
        </p>
        <Link href="/login" className="font-medium transition-colors" style={{ color: '#1a5c2e' }}>
          Entrar a la app →
        </Link>
      </footer>
    </main>
  );
}
