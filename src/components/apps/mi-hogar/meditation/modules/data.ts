// =====================================================================
// TÉCNICAS DE RESPIRACIÓN
// Patrón: [inhalación, retener inhalación, exhalación, retener exhalación] en segundos
// =====================================================================

export type BreathingTechnique = {
    id: string
    name: string
    description: string
    pattern: [number, number, number, number] // in-hold-out-hold
    cycles: number
    benefit: string
    color: string
    bg: string
}

export const TECHNIQUES: BreathingTechnique[] = [
    {
        id: 'natural',
        name: 'Natural Quioba',
        description: 'Ritmo suave para empezar',
        pattern: [5, 3, 4, 0],
        cycles: 10,
        benefit: 'Ideal para iniciarse en la meditación.',
        color: 'text-emerald-700',
        bg: 'from-emerald-50 to-teal-50'
    },
    {
        id: '4-7-8',
        name: '4-7-8 Relajación',
        description: 'Inhala 4s, sostén 7s, exhala 8s',
        pattern: [4, 7, 8, 0],
        cycles: 4,
        benefit: 'Reduce ansiedad, ayuda a conciliar el sueño (Dr. Andrew Weil).',
        color: 'text-indigo-700',
        bg: 'from-indigo-50 to-purple-50'
    },
    {
        id: 'box',
        name: 'Caja (Box)',
        description: 'Cuatro fases iguales de 4 segundos',
        pattern: [4, 4, 4, 4],
        cycles: 8,
        benefit: 'Usada por Navy SEALs. Mejora foco y reduce estrés.',
        color: 'text-sky-700',
        bg: 'from-sky-50 to-blue-50'
    },
    {
        id: 'coherence',
        name: 'Coherencia cardíaca',
        description: '5 inhalando, 5 exhalando',
        pattern: [5, 0, 5, 0],
        cycles: 12,
        benefit: 'Sincroniza ritmo cardíaco. Baja cortisol en 5 minutos.',
        color: 'text-rose-700',
        bg: 'from-rose-50 to-pink-50'
    },
    {
        id: 'wim-hof',
        name: 'Wim Hof energizante',
        description: 'Respiración rápida + retención',
        pattern: [2, 0, 2, 0],
        cycles: 30,
        benefit: 'Activa el sistema nervioso simpático. Energía y resistencia.',
        color: 'text-amber-700',
        bg: 'from-amber-50 to-orange-50'
    },
    {
        id: 'triangle',
        name: 'Triángulo',
        description: 'Inhala 4, sostén 4, exhala 4',
        pattern: [4, 4, 4, 0],
        cycles: 8,
        benefit: 'Equilibrio entre activación y calma.',
        color: 'text-purple-700',
        bg: 'from-purple-50 to-violet-50'
    }
]

// =====================================================================
// MEDITACIONES GUIADAS POR TEMA (YouTube en español)
// =====================================================================

export type GuidedMeditation = {
    id: string
    title: string
    category: 'stress' | 'sleep' | 'anxiety' | 'focus' | 'gratitude' | 'pain' | 'bodyscan' | 'nidra' | 'sleep-story'
    duration: string
    youtubeId: string
    description: string
}

export const GUIDED_MEDITATIONS: GuidedMeditation[] = [
    // ESTRÉS
    { id: 's1', title: 'Meditación para liberar el estrés', category: 'stress', duration: '10 min', youtubeId: 'XBjxAvuy_uw', description: 'Suelta la tensión acumulada del día.' },
    { id: 's2', title: 'Calma profunda en 5 minutos', category: 'stress', duration: '5 min', youtubeId: 'BLM41g3KiNI', description: 'Pausa rápida para bajar revoluciones.' },

    // SUEÑO
    { id: 'sl1', title: 'Meditación para dormir profundamente', category: 'sleep', duration: '20 min', youtubeId: 'LMVoyTifeu0', description: 'Te lleva al sueño con voz suave.' },
    { id: 'sl2', title: 'Relajación guiada antes de dormir', category: 'sleep', duration: '15 min', youtubeId: 'XAhWLKwgEfA', description: 'Prepara cuerpo y mente para el descanso.' },

    // ANSIEDAD
    { id: 'a1', title: 'Calmar la ansiedad ahora', category: 'anxiety', duration: '10 min', youtubeId: 'q5wcrugRXdc', description: 'Recupera la sensación de seguridad.' },
    { id: 'a2', title: 'Anclaje contra los ataques de pánico', category: 'anxiety', duration: '8 min', youtubeId: 'wIqXgEpO_Hk', description: 'Técnica 5-4-3-2-1 guiada.' },

    // FOCO
    { id: 'f1', title: 'Meditación para el enfoque', category: 'focus', duration: '10 min', youtubeId: 'Pgs5N7q3HOg', description: 'Antes de una tarea importante.' },
    { id: 'f2', title: 'Mindfulness para concentrarse', category: 'focus', duration: '7 min', youtubeId: 'jw7mFc1ZGCw', description: 'Vuelve al presente.' },

    // GRATITUD
    { id: 'g1', title: 'Meditación de gratitud', category: 'gratitude', duration: '10 min', youtubeId: 'OCorElLKFQE', description: 'Cultiva el agradecimiento diario.' },

    // DOLOR
    { id: 'p1', title: 'Meditación para aliviar el dolor', category: 'pain', duration: '15 min', youtubeId: 'qzWGS5HjQzM', description: 'Cambia tu relación con la sensación dolorosa.' },

    // BODY SCAN
    { id: 'bs1', title: 'Body Scan completo', category: 'bodyscan', duration: '20 min', youtubeId: 'C9w0KGEqdf4', description: 'Recorrido consciente por todo el cuerpo.' },
    { id: 'bs2', title: 'Escaneo corporal breve', category: 'bodyscan', duration: '10 min', youtubeId: 'D3vDxLfxMTM', description: 'Versión corta del body scan.' },

    // YOGA NIDRA
    { id: 'yn1', title: 'Yoga Nidra para dormir', category: 'nidra', duration: '30 min', youtubeId: 'AHfvSEUTl_g', description: 'Sueño consciente. Una sesión equivale a 2-3h de sueño.' },
    { id: 'yn2', title: 'Yoga Nidra restaurador', category: 'nidra', duration: '20 min', youtubeId: '6LFENPmDtkc', description: 'Recarga energía sin dormirte.' },

    // SLEEP STORIES
    { id: 'st1', title: 'Cuento relajante: El bosque', category: 'sleep-story', duration: '25 min', youtubeId: 'oWGsFjqYG7Y', description: 'Narración suave para conciliar el sueño.' },
    { id: 'st2', title: 'Visualización: Playa al atardecer', category: 'sleep-story', duration: '20 min', youtubeId: 'I5ZBgB5_9DI', description: 'Te transporta a un lugar de paz.' }
]

export const CATEGORY_LABELS: Record<GuidedMeditation['category'], { label: string; emoji: string; color: string }> = {
    stress: { label: 'Estrés', emoji: '😮‍💨', color: 'bg-rose-100 text-rose-700' },
    sleep: { label: 'Dormir', emoji: '😴', color: 'bg-indigo-100 text-indigo-700' },
    anxiety: { label: 'Ansiedad', emoji: '🌊', color: 'bg-sky-100 text-sky-700' },
    focus: { label: 'Foco', emoji: '🎯', color: 'bg-amber-100 text-amber-700' },
    gratitude: { label: 'Gratitud', emoji: '🙏', color: 'bg-emerald-100 text-emerald-700' },
    pain: { label: 'Dolor', emoji: '💚', color: 'bg-teal-100 text-teal-700' },
    bodyscan: { label: 'Body scan', emoji: '🧘', color: 'bg-purple-100 text-purple-700' },
    nidra: { label: 'Yoga Nidra', emoji: '🌙', color: 'bg-violet-100 text-violet-700' },
    'sleep-story': { label: 'Cuentos', emoji: '📖', color: 'bg-blue-100 text-blue-700' }
}

// =====================================================================
// SONIDOS AMBIENTE (YouTube loops)
// =====================================================================

export type AmbientSound = {
    id: string
    name: string
    emoji: string
    youtubeId: string
}

export const AMBIENT_SOUNDS: AmbientSound[] = [
    { id: 'rain', name: 'Lluvia', emoji: '🌧️', youtubeId: 'mPZkdNFkNps' },
    { id: 'ocean', name: 'Mar', emoji: '🌊', youtubeId: 'WHPEKLQID4U' },
    { id: 'forest', name: 'Bosque', emoji: '🌲', youtubeId: 'xNN7iTA57jM' },
    { id: 'fire', name: 'Chimenea', emoji: '🔥', youtubeId: 'L_LUpnjgPso' },
    { id: 'wind', name: 'Viento', emoji: '💨', youtubeId: 'FjHGZj2IjBk' },
    { id: 'birds', name: 'Pájaros', emoji: '🐦', youtubeId: 'CHb_lyflW3I' },
    { id: 'white-noise', name: 'Ruido blanco', emoji: '⚪', youtubeId: 'nMfPqeZjc2c' },
    { id: 'binaural', name: 'Binaural 432Hz', emoji: '🎵', youtubeId: 'GMxQc6BRBkw' }
]

// =====================================================================
// LOGROS / BADGES
// =====================================================================

export type Achievement = {
    id: string
    name: string
    description: string
    emoji: string
    check: (stats: { sessions: number; totalMinutes: number; streak: number }) => boolean
}

export const ACHIEVEMENTS: Achievement[] = [
    { id: 'first', name: 'Primer respiro', description: 'Tu primera sesión', emoji: '🌱', check: s => s.sessions >= 1 },
    { id: 'five', name: 'Constancia inicial', description: '5 sesiones', emoji: '🌿', check: s => s.sessions >= 5 },
    { id: 'twenty', name: 'Hábito en formación', description: '20 sesiones', emoji: '🌳', check: s => s.sessions >= 20 },
    { id: 'fifty', name: 'Práctica viva', description: '50 sesiones', emoji: '🏔️', check: s => s.sessions >= 50 },
    { id: 'hundred', name: 'Maestría serena', description: '100 sesiones', emoji: '🧘', check: s => s.sessions >= 100 },
    { id: 'streak-3', name: 'Tres días seguidos', description: 'Racha de 3 días', emoji: '🔥', check: s => s.streak >= 3 },
    { id: 'streak-7', name: 'Semana zen', description: 'Racha de 7 días', emoji: '⭐', check: s => s.streak >= 7 },
    { id: 'streak-30', name: 'Mes consciente', description: 'Racha de 30 días', emoji: '🌟', check: s => s.streak >= 30 },
    { id: 'min-60', name: 'Una hora respirada', description: '60 minutos totales', emoji: '⏱️', check: s => s.totalMinutes >= 60 },
    { id: 'min-300', name: 'Cinco horas de calma', description: '5 horas totales', emoji: '💎', check: s => s.totalMinutes >= 300 },
    { id: 'min-1000', name: 'Profundidad', description: '1000 minutos totales', emoji: '👑', check: s => s.totalMinutes >= 1000 }
]

// =====================================================================
// MANTRAS / INTENCIONES
// =====================================================================

export const MANTRAS = [
    'Soy suficiente en este momento.',
    'Inhalo paz, exhalo tensión.',
    'Aquí y ahora es donde está mi vida.',
    'Confío en el ritmo de mi respiración.',
    'Hay espacio dentro de mí para todo lo que siento.',
    'Mi presencia es mi mejor regalo.',
    'Soltar también es avanzar.',
    'Esta pausa me devuelve a mí.',
    'No tengo que ser nadie ahora, solo respirar.',
    'Estoy a salvo en mi cuerpo.'
]
