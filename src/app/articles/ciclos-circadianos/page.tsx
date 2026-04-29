'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Sun, Moon, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';

// ── Parallax hook ──────────────────────────────────────────────────────────────
function useParallax(speed = 0.3) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const onScroll = () => {
            const rect = el.getBoundingClientRect();
            const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
            el.style.transform = `translateY(${offset}px)`;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [speed]);
    return ref;
}

// ── Fade-in on scroll (with guaranteed fallback) ───────────────────────────────
function FadeIn({
    children,
    delay = 0,
    className = '',
}: {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // Always show after delay + 700 ms even if observer never fires
        const fallback = setTimeout(() => setVisible(true), delay * 1000 + 700);

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    clearTimeout(fallback);
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
        );
        observer.observe(el);

        return () => {
            observer.disconnect();
            clearTimeout(fallback);
        };
    }, [delay]);

    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(30px)',
                transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
            }}
        >
            {children}
        </div>
    );
}

// ── Section divider ────────────────────────────────────────────────────────────
function SectionDivider({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
    return (
        <div
            className={`h-20 ${variant === 'dark'
                    ? 'bg-gradient-to-b from-transparent to-slate-900'
                    : 'bg-gradient-to-b from-transparent to-slate-50'
                }`}
        />
    );
}

export default function CiclosCircadianosPage() {
    const heroParallax = useParallax(0.4);

    return (
        <div className="min-h-screen font-sans">
            {/* ── HERO ── */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900">
                <div
                    ref={heroParallax}
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(99,102,241,0.35) 0%, rgba(15,23,42,0) 70%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(251,146,60,0.2) 0%, transparent 60%)',
                    }}
                />

                {/* Clock rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-10">
                    {[320, 420, 520, 620].map((size, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full border border-white"
                            style={{
                                width: size,
                                height: size,
                                animation: `spin ${20 + i * 8}s linear infinite ${i % 2 === 0 ? '' : 'reverse'}`,
                            }}
                        />
                    ))}
                </div>

                <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
                    <Link
                        href="/articles"
                        className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-10 transition-colors text-sm"
                    >
                        <ArrowLeft size={14} /> Volver a artículos
                    </Link>

                    <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-300 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-orange-500/30">
                        <Clock size={12} /> SALUD FÍSICA · BIENESTAR
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] mb-6">
                        Tu Cuerpo Tiene{' '}
                        <span
                            className="block"
                            style={{
                                background: 'linear-gradient(135deg, #f97316, #a855f7)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Un Reloj Maestro
                        </span>
                    </h1>

                    <p className="text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-10">
                        Los ciclos circadianos organizan prácticamente todo lo que ocurre en tu cuerpo.
                        No es solo estar despierto o dormido — es decidir{' '}
                        <strong className="text-white">cuándo</strong> ejecutar tus funciones vitales.
                    </p>

                    <div className="flex flex-wrap justify-center gap-4 text-sm text-white/50">
                        <span className="flex items-center gap-1">
                            <Sun size={14} className="text-orange-400" /> Rendimiento y Defensa
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                            <Moon size={14} className="text-indigo-400" /> Reparación y Limpieza
                        </span>
                    </div>
                </div>

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 text-xs animate-bounce">
                    <div className="w-px h-10 bg-gradient-to-b from-white/0 to-white/40" />
                    <span>Scroll</span>
                </div>

                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </section>

            {/* ── SLIDE 1: ¿Qué son? ── */}
            <section className="bg-slate-50 py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <FadeIn>
                        <p className="text-indigo-600 font-semibold text-sm tracking-widest uppercase mb-3">Concepto base</p>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
                            ¿Qué son los<br />Ciclos Circadianos?
                        </h2>
                        <p className="text-xl text-slate-600 max-w-3xl leading-relaxed mb-16">
                            El sistema biológico de 24 horas que organiza prácticamente todo lo que ocurre en tu cuerpo.
                            No es solo estar despierto o dormido; es decidir cuándo tu cuerpo ejecuta sus funciones vitales.
                        </p>
                    </FadeIn>

                    <div className="grid md:grid-cols-2 gap-6">
                        {[
                            {
                                icon: '🌅',
                                title: 'Rendimiento y Defensa',
                                color: 'from-orange-50 to-amber-50',
                                border: 'border-orange-200',
                                items: ['Digestión activa', 'Alta concentración', 'Respuesta inmune de alerta'],
                            },
                            {
                                icon: '🌙',
                                title: 'Reparación y Limpieza',
                                color: 'from-indigo-50 to-purple-50',
                                border: 'border-indigo-200',
                                items: ['Regeneración celular', 'Consolidación de memoria', 'Limpieza de residuos cerebrales'],
                            },
                        ].map((card, i) => (
                            <FadeIn key={card.title} delay={i * 0.15}>
                                <div className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-2xl p-8`}>
                                    <div className="text-4xl mb-4">{card.icon}</div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-4">{card.title}</h3>
                                    <ul className="space-y-2">
                                        {card.items.map((item) => (
                                            <li key={item} className="flex items-center gap-3 text-slate-700">
                                                <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            <SectionDivider variant="dark" />

            {/* ── SLIDE 2: El Problema ── */}
            <section className="bg-slate-900 py-24 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <FadeIn>
                        <p className="text-orange-400 font-semibold text-sm tracking-widest uppercase mb-6">
                            ¿Por qué te sientes mal?
                        </p>
                    </FadeIn>

                    <div className="grid md:grid-cols-3 gap-4 mb-16">
                        {[
                            { icon: '🔋', q: '¿Te levantas cansado sin importar cuánto duermas?' },
                            { icon: '👁️', q: '¿Sufres de insomnio o te cuesta conciliar el sueño?' },
                            { icon: '🍎', q: '¿Sientes un hambre incontrolable a deshoras?' },
                        ].map((item, i) => (
                            <FadeIn key={item.q} delay={i * 0.1}>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left">
                                    <div className="text-3xl mb-3">{item.icon}</div>
                                    <p className="text-white/80 text-sm leading-relaxed">{item.q}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>

                    <FadeIn>
                        <div
                            className="rounded-3xl p-10 mb-8"
                            style={{
                                background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(168,85,247,0.15))',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <p className="text-3xl md:text-4xl font-black text-white leading-tight mb-4">
                                No es falta de disciplina.<br />
                                <span
                                    style={{
                                        background: 'linear-gradient(90deg, #f97316, #a855f7)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    Es tu reloj interno desajustado.
                                </span>
                            </p>
                            <p className="text-white/60 text-lg">
                                Este desajuste no solo drena tu energía hoy; altera tu{' '}
                                <strong className="text-white">metabolismo</strong>, tus{' '}
                                <strong className="text-white">hormonas</strong> y tu{' '}
                                <strong className="text-white">salud</strong> a largo plazo.
                            </p>
                        </div>
                    </FadeIn>
                </div>
            </section>

            <SectionDivider variant="light" />

            {/* ── SLIDE 3: El Reloj Maestro ── */}
            <section className="bg-slate-50 py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <FadeIn className="max-w-3xl">
                        <p className="text-indigo-600 font-semibold text-sm tracking-widest uppercase mb-3">La arquitectura</p>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
                            No tienes un solo reloj.<br />
                            <span className="text-indigo-600">Tienes millones.</span>
                        </h2>
                        <p className="text-xl text-slate-600 mb-12">
                            Tu salud depende de que todos estos órganos estén sincronizados entre sí y con tu entorno.
                        </p>
                    </FadeIn>

                    <div className="grid md:grid-cols-5 gap-6 items-center">
                        <FadeIn delay={0} className="md:col-span-2">
                            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-8 text-white text-center shadow-2xl">
                                <div className="text-5xl mb-4">🧠</div>
                                <h3 className="text-xl font-bold mb-2">El Reloj Maestro</h3>
                                <p className="text-indigo-200 text-sm">
                                    Núcleo Supraquiasmático — actúa como el director de orquesta.
                                </p>
                            </div>
                        </FadeIn>

                        <div className="hidden md:flex justify-center text-4xl text-slate-400">→</div>

                        <FadeIn delay={0.2} className="md:col-span-2 grid grid-cols-2 gap-4">
                            {[
                                { emoji: '🫀', name: 'Hígado', sub: 'Metabolismo' },
                                { emoji: '🛡️', name: 'Sistema Inmune', sub: 'Defensas' },
                                { emoji: '💪', name: 'Músculos', sub: 'Rendimiento' },
                                { emoji: '🏮', name: 'Tejido Adiposo', sub: 'Almacenamiento' },
                            ].map((organ) => (
                                <div
                                    key={organ.name}
                                    className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="text-2xl mb-1">{organ.emoji}</div>
                                    <p className="font-semibold text-slate-900 text-sm">{organ.name}</p>
                                    <p className="text-slate-500 text-xs">{organ.sub}</p>
                                </div>
                            ))}
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ── SLIDE 4: La Luz ── */}
            <section
                className="relative py-24 px-6 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #fff7ed, #fef3c7)' }}
            >
                <div className="max-w-5xl mx-auto">
                    <FadeIn>
                        <p className="text-orange-600 font-semibold text-sm tracking-widest uppercase mb-3">
                            El interruptor principal
                        </p>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
                            La Luz: El Director<br />
                            <span className="text-orange-500">de la Orquesta Biológica</span>
                        </h2>
                        <p className="text-xl text-slate-700 max-w-2xl mb-12">
                            La retina contiene células sensibles a la luz azul que envían señales directas al reloj maestro en el cerebro.
                        </p>
                    </FadeIn>

                    <FadeIn delay={0.1}>
                        <div className="flex items-center justify-center gap-4 md:gap-8 mb-12">
                            <div className="bg-white rounded-2xl p-6 shadow-md text-center border border-orange-100">
                                <span className="text-5xl">👁️</span>
                                <p className="text-xs text-slate-500 mt-2">Retina</p>
                            </div>
                            <div className="flex-1 border-t-2 border-dashed border-orange-300 max-w-24" />
                            <div className="text-orange-400 text-2xl">→</div>
                            <div className="flex-1 border-t-2 border-dashed border-indigo-300 max-w-24" />
                            <div className="bg-white rounded-2xl p-6 shadow-md text-center border border-indigo-100">
                                <span className="text-5xl">🧠</span>
                                <p className="text-xs text-slate-500 mt-2">Reloj Maestro</p>
                            </div>
                        </div>
                    </FadeIn>

                    <div className="grid md:grid-cols-2 gap-6">
                        <FadeIn delay={0.2}>
                            <div className="bg-white rounded-2xl p-8 border border-orange-200 shadow-md">
                                <div className="text-4xl mb-4">🌅</div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Luz Natural AM</h3>
                                <p className="text-green-600 font-semibold mb-2">Efecto: Activación.</p>
                                <p className="text-slate-600">Sincroniza el cuerpo para el día.</p>
                            </div>
                        </FadeIn>
                        <FadeIn delay={0.3}>
                            <div className="bg-white rounded-2xl p-8 border border-indigo-200 shadow-md">
                                <div className="text-4xl mb-4">📱</div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Luz Artificial / Pantallas PM</h3>
                                <p className="text-red-500 font-semibold mb-2">Efecto: Confusión.</p>
                                <p className="text-slate-600">
                                    Engaña al cerebro haciéndole creer que es de día, deteniendo la preparación para el sueño.
                                </p>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            <SectionDivider variant="dark" />

            {/* ── SLIDE 5: Sinfonía Hormonal ── */}
            <section className="bg-slate-900 py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <FadeIn>
                        <p className="text-purple-400 font-semibold text-sm tracking-widest uppercase mb-3">Tu química interna</p>
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                            La Sinfonía Hormonal<br />de 24 Horas
                        </h2>
                        <p className="text-white/60 mb-12">Cada hormona tiene su ventana horaria óptima. Respetarla lo cambia todo.</p>
                    </FadeIn>

                    <FadeIn delay={0.1}>
                        <div className="relative mb-12">
                            <div
                                className="h-4 rounded-full mb-8"
                                style={{
                                    background:
                                        'linear-gradient(90deg, #f97316 0%, #fbbf24 25%, #3b82f6 55%, #6366f1 75%, #a855f7 90%, #f97316 100%)',
                                }}
                            />
                            <div className="flex justify-between text-white/50 text-sm">
                                {['6 AM', '9 AM', '12 PM', '6 PM', '12 AM', '6 AM'].map((t) => (
                                    <span key={t}>{t}</span>
                                ))}
                            </div>
                        </div>
                    </FadeIn>

                    <div className="grid md:grid-cols-2 gap-6">
                        {[
                            {
                                gradient: 'from-orange-500/20 to-amber-500/20',
                                border: 'border-orange-500/30',
                                badge: '☀️ Hormonas de Activación',
                                hormones: [
                                    { name: 'Cortisol', time: '6–12 AM', desc: 'Te despierta y activa.' },
                                    { name: 'Insulina', time: '12–18 PM', desc: 'Máxima eficiencia para procesar alimentos.' },
                                ],
                            },
                            {
                                gradient: 'from-indigo-500/20 to-purple-500/20',
                                border: 'border-indigo-500/30',
                                badge: '🌙 Hormonas de Recuperación',
                                hormones: [
                                    { name: 'Melatonina', time: '19–23 PM', desc: 'Induce el sueño.' },
                                    {
                                        name: 'Hormona del Crecimiento',
                                        time: '0–3 AM',
                                        desc: 'Repara tejidos durante el sueño profundo.',
                                    },
                                ],
                            },
                        ].map((group, i) => (
                            <FadeIn key={group.badge} delay={i * 0.15}>
                                <div
                                    className={`bg-gradient-to-br ${group.gradient} border ${group.border} rounded-2xl p-6`}
                                >
                                    <p className="text-white font-semibold mb-4">{group.badge}</p>
                                    <div className="space-y-4">
                                        {group.hormones.map((h) => (
                                            <div key={h.name} className="bg-white/5 rounded-xl p-4">
                                                <div className="flex items-baseline justify-between mb-1">
                                                    <h4 className="text-white font-bold">{h.name}</h4>
                                                    <span className="text-white/40 text-xs">{h.time}</span>
                                                </div>
                                                <p className="text-white/60 text-sm">{h.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </FadeIn>
                        ))}
                    </div>

                    <FadeIn delay={0.3}>
                        <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-6">
                            <p className="text-white font-semibold mb-2">🍽️ El Control del Apetito</p>
                            <p className="text-white/60">
                                Las hormonas del hambre (Grelina) y saciedad (Leptina) también siguen este ritmo. Por eso, no
                                procesas igual la comida por la mañana que por la noche.
                            </p>
                        </div>
                    </FadeIn>
                </div>
            </section>

            <SectionDivider variant="light" />

            {/* ── SLIDE 6: Relojes Secundarios ── */}
            <section className="bg-slate-50 py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <FadeIn>
                        <p className="text-indigo-600 font-semibold text-sm tracking-widest uppercase mb-3">La comida importa</p>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
                            Comida y Movimiento:<br />Los Relojes Secundarios
                        </h2>
                        <p className="text-xl text-slate-600 max-w-3xl mb-4">
                            La luz no es el único interruptor. Si comes a deshoras, puedes desajustar órganos como el hígado
                            hasta <strong>12 horas</strong> respecto a tu cerebro.
                        </p>
                        <p className="text-slate-500 italic mb-12">
                            Es como si cada parte de tu cuerpo viviera en una zona horaria distinta.
                        </p>
                    </FadeIn>

                    <div className="grid md:grid-cols-2 gap-8 mb-10">
                        <FadeIn delay={0.1}>
                            <div className="flex gap-6 items-start">
                                <div className="bg-indigo-100 rounded-2xl p-4 text-center shrink-0">
                                    <div className="text-3xl">🧠</div>
                                    <p className="text-indigo-700 font-bold text-sm mt-1">10 PM</p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 mb-1">Cerebro → En modo noche</h3>
                                    <p className="text-slate-600 text-sm">
                                        El reloj maestro indica que es hora de recuperar y descansar.
                                    </p>
                                </div>
                            </div>
                        </FadeIn>
                        <FadeIn delay={0.15}>
                            <div className="flex gap-6 items-start">
                                <div className="bg-orange-100 rounded-2xl p-4 text-center shrink-0">
                                    <div className="text-3xl">🫀</div>
                                    <p className="text-orange-700 font-bold text-sm mt-1">10 AM</p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 mb-1">Hígado → En modo día</h3>
                                    <p className="text-slate-600 text-sm">
                                        Si comes tarde, el hígado recibe señales de que aún es de día.
                                    </p>
                                </div>
                            </div>
                        </FadeIn>
                    </div>

                    <FadeIn delay={0.25}>
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                            <p className="text-red-700 font-semibold mb-3 flex items-center gap-2">
                                <AlertCircle size={16} /> Comer tarde (cuando la melatonina está alta) favorece:
                            </p>
                            <ul className="space-y-2 text-red-600">
                                <li className="flex items-center gap-2">🔴 Mayor almacenamiento de grasa.</li>
                                <li className="flex items-center gap-2">🔴 Peor control del azúcar en la sangre.</li>
                            </ul>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ── SLIDE 7: El Precio ── */}
            <section
                className="relative py-24 px-6 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }}
            >
                <div className="max-w-5xl mx-auto">
                    <FadeIn>
                        <p className="text-purple-300 font-semibold text-sm tracking-widest uppercase mb-3">Las consecuencias</p>
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-3">
                            El Precio de la Desincronización
                        </h2>
                        <p className="text-purple-300 mb-12 text-lg italic">Un estrés silencioso y constante en el cuerpo.</p>
                    </FadeIn>

                    <div className="grid md:grid-cols-2 gap-6">
                        <FadeIn delay={0.1}>
                            <div className="bg-white/5 border border-orange-500/30 rounded-2xl p-8">
                                <p className="text-orange-400 font-bold mb-4 flex items-center gap-2">
                                    <Zap size={16} /> Corto Plazo — Impacto Inmediato
                                </p>
                                <ul className="space-y-3">
                                    {[
                                        'Cansancio crónico y fatiga.',
                                        'Insomnio y mala calidad de sueño.',
                                        'Mala concentración (niebla mental).',
                                        'Alteración de la microbiota intestinal.',
                                    ].map((item) => (
                                        <li key={item} className="flex items-start gap-3 text-orange-200/80">
                                            <div className="w-2 h-2 rounded-full bg-orange-400 mt-2 shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </FadeIn>
                        <FadeIn delay={0.2}>
                            <div className="bg-white/5 border border-red-500/30 rounded-2xl p-8">
                                <p className="text-red-400 font-bold mb-4 flex items-center gap-2">
                                    <AlertCircle size={16} /> Largo Plazo — Riesgos Sistémicos
                                </p>
                                <ul className="space-y-3">
                                    {[
                                        'Obesidad y Diabetes.',
                                        'Hipertensión y problemas cardiovasculares.',
                                        'Impacto en salud mental y neurodegeneración.',
                                        'Mayor riesgo de ciertos cánceres en exposiciones prolongadas.',
                                    ].map((item) => (
                                        <li key={item} className="flex items-start gap-3 text-red-200/80">
                                            <div className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            <SectionDivider variant="light" />

            {/* ── PROTOCOLOS: Día y Noche ── */}
            <section className="bg-slate-50 py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <FadeIn>
                        <p className="text-green-600 font-semibold text-sm tracking-widest uppercase mb-3">El plan de acción</p>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
                            Protocolo de Sincronización
                        </h2>
                        <p className="text-xl text-slate-600 mb-16">
                            6 hábitos basados en evidencia para alinear tu reloj biológico.
                        </p>
                    </FadeIn>

                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Día */}
                        <div>
                            <FadeIn>
                                <div className="flex items-center gap-3 mb-8">
                                    <Sun className="text-orange-500" size={24} />
                                    <h3 className="text-2xl font-black text-slate-900">El Día</h3>
                                </div>
                            </FadeIn>
                            <div className="space-y-6">
                                {[
                                    {
                                        n: 1,
                                        title: 'Luz Matutina',
                                        action: 'Sal al exterior 20–30 minutos al despertar.',
                                        why: 'Recibir luz natural (incluso nublado) detiene la melatonina y activa el reloj maestro.',
                                    },
                                    {
                                        n: 2,
                                        title: 'Ventana de Alimentación',
                                        action: 'Consume tus comidas en una ventana de 8 a 10 horas.',
                                        why: 'Alinea tu digestión con las horas de mayor eficiencia metabólica e insulínica.',
                                    },
                                    {
                                        n: 3,
                                        title: 'Movimiento',
                                        action: 'Haz ejercicio físico.',
                                        why: 'El movimiento ayuda a sincronizar el sistema periférico muscular y garantiza un sueño más profundo por la noche.',
                                    },
                                ].map((step, i) => (
                                    <FadeIn key={step.n} delay={i * 0.1}>
                                        <div className="flex gap-5">
                                            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700 font-black text-xl shrink-0">
                                                {step.n}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 mb-1">{step.title}</h4>
                                                <p className="text-slate-700 text-sm mb-2">{step.action}</p>
                                                <p className="text-slate-500 text-xs">
                                                    <strong>Por qué:</strong> {step.why}
                                                </p>
                                            </div>
                                        </div>
                                    </FadeIn>
                                ))}
                            </div>
                        </div>

                        {/* Noche */}
                        <div>
                            <FadeIn>
                                <div className="flex items-center gap-3 mb-8">
                                    <Moon className="text-indigo-500" size={24} />
                                    <h3 className="text-2xl font-black text-slate-900">La Noche</h3>
                                </div>
                            </FadeIn>
                            <div className="space-y-6">
                                {[
                                    {
                                        n: 4,
                                        title: 'Toque de Queda Digital',
                                        action: 'Reduce pantallas y luz azul 2–3 horas antes de dormir.',
                                        why: 'Asegura la oscuridad necesaria para la liberación de melatonina.',
                                    },
                                    {
                                        n: 5,
                                        title: 'Ayuno Nocturno',
                                        action: 'Evita cenar muy tarde.',
                                        why: 'Evita que el hígado trabaje durante las horas de reparación, previniendo el almacenamiento de grasa.',
                                    },
                                    {
                                        n: 6,
                                        title: 'Entorno y Consistencia',
                                        action: 'Mantén horarios estables en una habitación oscura y fresca.',
                                        why: 'La consistencia térmica y lumínica regula todo tu sistema sin interrupciones.',
                                    },
                                ].map((step, i) => (
                                    <FadeIn key={step.n} delay={i * 0.1}>
                                        <div className="flex gap-5">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xl shrink-0">
                                                {step.n}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 mb-1">{step.title}</h4>
                                                <p className="text-slate-700 text-sm mb-2">{step.action}</p>
                                                <p className="text-slate-500 text-xs">
                                                    <strong>Por qué:</strong> {step.why}
                                                </p>
                                            </div>
                                        </div>
                                    </FadeIn>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SLIDE 10: Biología = Estilo de Vida ── */}
            <section
                className="relative py-24 px-6 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)' }}
            >
                <div className="max-w-4xl mx-auto text-center">
                    <FadeIn>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
                            Tu Biología no es Genética,<br />
                            <span className="text-indigo-600">es tu Estilo de Vida.</span>
                        </h2>
                    </FadeIn>
                    <FadeIn delay={0.1}>
                        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-lg inline-block max-w-xl mb-10">
                            <p className="text-2xl font-black text-slate-900 mb-3">No necesitas hacer más cosas.</p>
                            <p className="text-xl text-slate-700">
                                Necesitas hacerlas{' '}
                                <strong className="text-indigo-600">en el momento correcto.</strong>
                            </p>
                        </div>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                            Los ciclos circadianos le dicen a cada célula cuándo hacer su trabajo. Respetarlos no es una moda:
                            es una de las bases más potentes de la salud.
                        </p>
                    </FadeIn>
                </div>
            </section>

            {/* ── CTA Final ── */}
            <section className="relative py-32 px-6 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-30 pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 70%)' }}
                />
                <div
                    className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full opacity-20 pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.6) 0%, transparent 70%)' }}
                />

                <div className="relative z-10 max-w-3xl mx-auto text-center">
                    <FadeIn>
                        <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
                            Sincroniza<br />tu Vida
                        </h2>
                    </FadeIn>

                    <FadeIn delay={0.1}>
                        <p className="text-white/70 text-xl mb-10 max-w-xl mx-auto">
                            El secreto de la energía inagotable y la salud metabólica no es trabajar en contra de tu cuerpo,
                            sino rotar en perfecta sincronía con él.
                        </p>
                    </FadeIn>

                    <FadeIn delay={0.2}>
                        <div className="flex flex-wrap justify-center gap-4 mb-12">
                            {[
                                { icon: '☀️', label: 'Luz AM' },
                                { icon: '🍽️', label: 'Ventana de Alimentación' },
                                { icon: '📵', label: 'Bloqueo Digital' },
                                { icon: '🛌', label: 'Sueño Profundo' },
                            ].map((pillar) => (
                                <div
                                    key={pillar.label}
                                    className="bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-center backdrop-blur-sm"
                                >
                                    <div className="text-2xl mb-1">{pillar.icon}</div>
                                    <p className="text-white/80 text-sm font-semibold">{pillar.label}</p>
                                </div>
                            ))}
                        </div>
                    </FadeIn>

                    <FadeIn delay={0.3}>
                        <blockquote
                            className="text-2xl font-black text-white mb-10 px-8 py-5 rounded-2xl"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                        >
                            "El cuándo es tu mayor ventaja biológica."
                        </blockquote>
                    </FadeIn>

                    <FadeIn delay={0.4}>
                        <Link
                            href="/articles"
                            className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-8 py-4 rounded-2xl hover:bg-white/90 transition-all"
                        >
                            <ArrowLeft size={16} /> Explorar más artículos
                        </Link>
                    </FadeIn>
                </div>
            </section>
        </div>
    );
}
