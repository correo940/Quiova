'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { categories } from '@/lib/data';
import { ArticleCategory } from '@/types';
import ArticleCard from '@/components/article-card';
import { ArticlesSkeleton } from '@/components/ui/skeleton-loaders';
import { getApiUrl } from '@/lib/api-utils';
import Image from 'next/image';

// ─── Pillar data ───────────────────────────────────────────────────────────────
const PILLARS = [
    {
        key: 'salud física',
        label: 'Cuerpo',
        tagline: 'Bienestar físico',
        description: 'Ejercicio, nutrición y hábitos para una vida activa, energética y plena.',
        logo: '/images/logo-cuerpo.png',
        color: '#1a5c2e',
        colorLight: '#e8f5ec',
        colorMid: '#3d8b55',
        gradient: 'from-[#1a5c2e] to-[#3d8b55]',
        bgClass: 'bg-[#e8f5ec]',
        textClass: 'text-[#1a5c2e]',
        borderClass: 'border-[#9fd6b0]',
        icon: '🌿',
        accentHex: '#1a5c2e',
    },
    {
        key: 'salud mental',
        label: 'Mente',
        tagline: 'Bienestar mental',
        description: 'Meditación, mindfulness y técnicas para reducir el estrés y vivir con claridad.',
        logo: '/images/logo-mente.png',
        color: '#1558a8',
        colorLight: '#e6f0fa',
        colorMid: '#2e78d4',
        gradient: 'from-[#1558a8] to-[#2e78d4]',
        bgClass: 'bg-[#e6f0fa]',
        textClass: 'text-[#1558a8]',
        borderClass: 'border-[#90bbf0]',
        icon: '🧠',
        accentHex: '#1558a8',
    },
    {
        key: 'finanzas familiares',
        label: 'Finanzas',
        tagline: 'Finanzas familiares',
        description: 'Presupuestos, ahorro e inversiones para la estabilidad financiera de tu familia.',
        logo: '/images/logo-finanzas.png',
        color: '#b87514',
        colorLight: '#fdf3e0',
        colorMid: '#e8961a',
        gradient: 'from-[#b87514] to-[#e8961a]',
        bgClass: 'bg-[#fdf3e0]',
        textClass: 'text-[#b87514]',
        borderClass: 'border-[#f0c56a]',
        icon: '💛',
        accentHex: '#b87514',
    },
];

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                let start = 0;
                const duration = 1200;
                const step = (timestamp: number) => {
                    if (!start) start = timestamp;
                    const progress = Math.min((timestamp - start) / duration, 1);
                    setCount(Math.floor(progress * target));
                    if (progress < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
                observer.disconnect();
            }
        });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [target]);

    return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Hero slides ──────────────────────────────────────────────────────────────
const SLIDES = [
    {
        title: 'Tu bienestar integral',
        highlight: 'empieza aquí',
        description: 'Cuerpo, mente y finanzas: las tres áreas que más impactan tu vida, en un solo lugar.',
        pillar: null,
        gradient: 'from-[#0d2e18] via-[#1a5c2e] to-[#0d2e18]',
    },
    {
        title: 'Cuida tu',
        highlight: 'cuerpo',
        description: 'Ejercicio, nutrición y hábitos para una vida activa y saludable.',
        pillar: 'salud física',
        gradient: 'from-[#0d2e18] via-[#1a5c2e] to-[#163d22]',
    },
    {
        title: 'Fortalece tu',
        highlight: 'mente',
        description: 'Meditación, mindfulness y herramientas para vivir con calma y claridad.',
        pillar: 'salud mental',
        gradient: 'from-[#071e3d] via-[#1558a8] to-[#0e2f5c]',
    },
    {
        title: 'Domina tus',
        highlight: 'finanzas',
        description: 'Estrategias reales para ahorrar, invertir y dar estabilidad a tu familia.',
        pillar: 'finanzas familiares',
        gradient: 'from-[#3d2100] via-[#b87514] to-[#4a2900]',
    },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function BlogContent() {
    const [selectedCategory, setSelectedCategory] = useState<ArticleCategory | 'all'>('all');
    const [currentSlide, setCurrentSlide] = useState(0);
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activePillar, setActivePillar] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const searchQuery = searchParams?.get('search')?.toLowerCase() || '';
    const articlesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function loadArticles() {
            try {
                const response = await fetch(getApiUrl('api/articles'));
                if (response.ok) {
                    const data = await response.json();
                    setArticles(data);
                }
            } catch (error) {
                console.error('❌ Error:', error);
            } finally {
                setLoading(false);
            }
        }
        loadArticles();
        const timer = setTimeout(() => setLoading(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
        }, 4500);
        return () => clearInterval(interval);
    }, []);

    const featuredArticles = useMemo(() => articles.filter((a) => a.featured), [articles]);

    const filteredArticles = useMemo(() => {
        let filtered = articles;
        if (searchQuery) {
            filtered = filtered.filter((a) =>
                (a.title?.toLowerCase() || '').includes(searchQuery) ||
                (a.description?.toLowerCase() || '').includes(searchQuery) ||
                (a.category?.toLowerCase() || '').includes(searchQuery)
            );
        }
        const cat = activePillar || (selectedCategory !== 'all' ? selectedCategory : null);
        if (cat) {
            return filtered.filter((a) => (a.category || '').toLowerCase().trim() === cat.toLowerCase().trim());
        }
        return filtered;
    }, [selectedCategory, activePillar, articles, searchQuery]);

    function scrollToArticles(pillarKey: string | null) {
        setActivePillar(pillarKey);
        setSelectedCategory(pillarKey ? (pillarKey as ArticleCategory) : 'all');
        setTimeout(() => {
            articlesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    const slide = SLIDES[currentSlide];
    const activePillarData = PILLARS.find((p) => p.key === activePillar);

    if (loading && articles.length === 0) return <ArticlesSkeleton />;

    return (
        <div className="w-full font-sans">

            {/* ── HERO ──────────────────────────────────────────────────────── */}
            <section className="relative w-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-center overflow-hidden">
                {/* Video de fondo */}
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ zIndex: 0 }}
                >
                    <source src="/fondo.mp4" type="video/mp4" />
                </video>

                {/* Overlay negro para garantizar legibilidad */}
                <div 
                    className="absolute inset-0 bg-black/60" 
                    style={{ zIndex: 0 }}
                />

                {/* Animated gradient background con opacidad para mezclar con el video */}
                <div
                    className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} opacity-40 transition-all duration-1000`}
                    style={{ zIndex: 0 }}
                />

                {/* Decorative circles */}
                <div className="absolute top-[-60px] right-[-60px] w-72 h-72 rounded-full opacity-10 bg-white" style={{ zIndex: 1 }} />
                <div className="absolute bottom-[-80px] left-[-40px] w-56 h-56 rounded-full opacity-10 bg-white" style={{ zIndex: 1 }} />

                {/* Grid dot pattern */}
                <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                    zIndex: 1,
                }} />

                {/* Content */}
                <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
                    {/* Pillar logo badge */}
                    {slide.pillar && (
                        <div className="flex justify-center mb-6">
                            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
                                <Image
                                    src={PILLARS.find(p => p.key === slide.pillar)?.logo || '/images/logo.png'}
                                    alt="Pillar logo"
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                />
                                <span className="text-white/90 text-sm font-medium">
                                    Quioba {PILLARS.find(p => p.key === slide.pillar)?.label}
                                </span>
                            </div>
                        </div>
                    )}

                    {!slide.pillar && (
                        <div className="flex justify-center mb-6">
                            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2">
                                <Image src="/images/logo.png" alt="Quioba" width={22} height={22} className="object-contain" />
                                <span className="text-white/90 text-sm font-medium">Quioba — Bienestar integral</span>
                            </div>
                        </div>
                    )}

                    <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight mb-4 transition-all duration-700">
                        {slide.title}{' '}
                        <span className="italic font-black text-white/80">{slide.highlight}</span>
                    </h1>
                    <p className="text-lg md:text-xl text-white/75 mb-10 max-w-xl mx-auto leading-relaxed transition-all duration-700">
                        {slide.description}
                    </p>

                    <div className="flex flex-wrap gap-3 justify-center">
                        <button
                            onClick={() => scrollToArticles(null)}
                            className="bg-white text-gray-900 font-bold px-8 py-3 rounded-full text-sm hover:bg-white/90 transition-all hover:scale-105 active:scale-95"
                        >
                            Empieza a crecer ↗
                        </button>
                        <button
                            onClick={() => scrollToArticles(null)}
                            className="bg-white/10 border border-white/25 text-white font-medium px-8 py-3 rounded-full text-sm hover:bg-white/20 transition-all backdrop-blur-sm"
                        >
                            Ver artículos
                        </button>
                    </div>
                </div>

                {/* Slide dots */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {SLIDES.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentSlide(i)}
                            className={`rounded-full transition-all duration-300 ${
                                i === currentSlide ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40'
                            }`}
                        />
                    ))}
                </div>
            </section>



            {/* ── THREE PILLARS ─────────────────────────────────────────────── */}
            <section className="bg-gray-50 py-16 px-4">
                <div className="max-w-5xl mx-auto">
                    <p className="text-center text-xs uppercase tracking-widest text-gray-400 mb-2 font-medium">Las tres áreas</p>
                    <h2 className="text-center text-3xl md:text-4xl font-black text-gray-900 mb-3">
                        ¿Qué quieres mejorar hoy?
                    </h2>
                    <p className="text-center text-gray-500 text-base mb-12 max-w-md mx-auto">
                        Cada pilar tiene su propio universo de contenido especializado.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {PILLARS.map((p) => (
                            <button
                                key={p.key}
                                onClick={() => scrollToArticles(p.key)}
                                className={`group text-left rounded-2xl border-2 bg-white overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] ${
                                    activePillar === p.key ? `border-[${p.color}]` : 'border-transparent'
                                }`}
                                style={{ boxShadow: activePillar === p.key ? `0 0 0 2px ${p.color}` : undefined }}
                            >
                                {/* Card header with gradient */}
                                <div className={`bg-gradient-to-br ${p.gradient} p-8 flex items-center justify-between`}>
                                    <div>
                                        <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">
                                            {p.tagline}
                                        </span>
                                        <h3 className="text-white text-2xl font-black mt-1">
                                            Quioba {p.label}
                                        </h3>
                                    </div>
                                    <div className="w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-md p-1.5 border-2 border-white/80">
                                        <Image
                                            src={p.logo}
                                            alt={`Logo ${p.label}`}
                                            width={48}
                                            height={48}
                                            className="object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-300"
                                        />
                                    </div>
                                </div>

                                {/* Card body */}
                                <div className="p-6">
                                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{p.description}</p>
                                    <div className="flex items-center gap-1 font-bold text-sm" style={{ color: p.color }}>
                                        Explorar artículos
                                        <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FEATURED ARTICLES ─────────────────────────────────────────── */}
            {featuredArticles.length > 0 && (
                <section className="bg-white py-16 px-4">
                    <div className="max-w-5xl mx-auto">
                        <p className="text-center text-xs uppercase tracking-widest text-gray-400 mb-2 font-medium">Lo más destacado</p>
                        <h2 className="text-center text-3xl font-black text-gray-900 mb-12">
                            Artículos destacados
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {featuredArticles.slice(0, 3).map((article) => {
                                const pillar = PILLARS.find((p) => p.key === (article.category || '').toLowerCase().trim());
                                return (
                                    <div
                                        key={article.id}
                                        className="relative rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group"
                                    >
                                        {pillar && (
                                            <div
                                                className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                                                style={{ background: pillar.colorLight, color: pillar.color }}
                                            >
                                                <Image src={pillar.logo} alt={pillar.label} width={14} height={14} className="object-contain" />
                                                {pillar.label}
                                            </div>
                                        )}
                                        <ArticleCard article={article} className="h-full border-0" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* ── EXPLORE ALL ───────────────────────────────────────────────── */}
            <section ref={articlesRef} className="bg-gray-50 py-16 px-4">
                <div className="max-w-5xl mx-auto">
                    {/* Header with active pillar indicator */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                        <div>
                            {activePillarData ? (
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{ background: activePillarData.colorLight }}
                                    >
                                        <Image src={activePillarData.logo} alt={activePillarData.label} width={28} height={28} className="object-contain" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: activePillarData.color }}>
                                            {activePillarData.tagline}
                                        </p>
                                        <h2 className="text-2xl font-black text-gray-900">Quioba {activePillarData.label}</h2>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-1">Todos los artículos</p>
                                    <h2 className="text-2xl font-black text-gray-900">Explorar todo</h2>
                                </div>
                            )}
                        </div>

                        {/* Filter pills */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => { setActivePillar(null); setSelectedCategory('all'); }}
                                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                                    !activePillar && selectedCategory === 'all'
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
                                }`}
                            >
                                Todos
                            </button>
                            {PILLARS.map((p) => (
                                <button
                                    key={p.key}
                                    onClick={() => scrollToArticles(p.key)}
                                    className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5"
                                    style={
                                        activePillar === p.key
                                            ? { background: p.color, color: 'white' }
                                            : { background: 'white', border: `1px solid ${p.color}40`, color: p.color }
                                    }
                                >
                                    <Image src={p.logo} alt={p.label} width={12} height={12} className="object-contain" />
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Articles grid */}
                    {filteredArticles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredArticles.map((article) => (
                                <ArticleCard key={article.id} article={article} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                            <p className="text-4xl mb-3">🔍</p>
                            <p className="text-gray-500 text-sm">No se encontraron artículos en esta categoría.</p>
                            <button
                                onClick={() => { setActivePillar(null); setSelectedCategory('all'); }}
                                className="mt-4 text-sm font-semibold underline text-gray-700"
                            >
                                Ver todos los artículos
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* ── CTA FINAL ─────────────────────────────────────────────────── */}
            <section className="relative bg-[#0d2e18] py-20 px-4 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#1a5c2e] opacity-20 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-[#1558a8] opacity-15 blur-3xl" />
                <div className="relative z-10 max-w-2xl mx-auto text-center">
                    <Image src="/images/logo.png" alt="Quioba" width={64} height={64} className="mx-auto mb-6 object-contain" />
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                        Todo lo que necesitas,<br />en un solo lugar
                    </h2>
                    <p className="text-white/60 text-base mb-10 max-w-md mx-auto">
                        Sin suscripciones. Sin complicaciones. Solo contenido de calidad para mejorar tu cuerpo, tu mente y tus finanzas.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <button
                            onClick={() => scrollToArticles(null)}
                            className="bg-white text-gray-900 font-bold px-10 py-4 rounded-full text-sm hover:bg-white/90 transition-all hover:scale-105 active:scale-95"
                        >
                            Empieza a crecer ↗
                        </button>
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-10">
                        {PILLARS.map((p) => (
                            <button
                                key={p.key}
                                onClick={() => scrollToArticles(p.key)}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div
                                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md p-1"
                                >
                                    <Image src={p.logo} alt={p.label} width={32} height={32} className="object-contain" />
                                </div>
                                <span className="text-white/50 text-xs group-hover:text-white/80 transition-colors">{p.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
