'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    Play, Pause, RotateCcw, Bell, BellOff, Settings, X, CheckCircle2,
    Eye, Droplet, Footprints, StretchHorizontal, Hand, Activity,
    Timer, Sparkles, ChevronRight, Volume2, VolumeX
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import ExerciseAnimation from '@/components/apps/pausas-activas/exercise-animation'
import ExerciseVideo from '@/components/apps/pausas-activas/exercise-video'

// =====================================================================
// EJERCICIOS (basados en recomendaciones de fisioterapeutas y oftalmólogos)
// Fuentes: AOA 20-20-20, Healthline, Anchor PT, Bynocs, Natural Eye Care
// =====================================================================

type Exercise = {
    id: string
    title: string
    category: 'eyes' | 'neck' | 'shoulders' | 'back' | 'legs' | 'hands' | 'water'
    duration: number // segundos
    steps: string[]
    benefit: string
}

const EXERCISES: Exercise[] = [
    // OJOS
    {
        id: 'eye-20-20-20',
        title: 'Regla 20-20-20',
        category: 'eyes',
        duration: 20,
        steps: [
            'Aparta la mirada de la pantalla.',
            'Fija la vista en un objeto a 6 metros (20 pies).',
            'Mantén la mirada relajada durante 20 segundos.',
            'Parpadea suavemente varias veces al terminar.'
        ],
        benefit: 'Relaja el músculo ciliar y previene la fatiga visual digital.'
    },
    {
        id: 'eye-palming',
        title: 'Palming ocular',
        category: 'eyes',
        duration: 60,
        steps: [
            'Frota las palmas hasta que se calienten.',
            'Cierra los ojos suavemente.',
            'Cubre los ojos con las palmas sin tocarlos (oscuridad total).',
            'Respira hondo y relaja la musculatura periorbital 1 minuto.'
        ],
        benefit: 'El calor relaja la musculatura del ojo, ideal contra dolor de cabeza tensional.'
    },
    {
        id: 'eye-blink',
        title: 'Parpadeo consciente',
        category: 'eyes',
        duration: 30,
        steps: [
            'Parpadea rápido durante 5 segundos.',
            'Cierra los ojos con suavidad 5 segundos.',
            'Repite 3 veces.',
            'Termina con un par de bostezos provocados.'
        ],
        benefit: 'Re-hidrata la córnea y combate el ojo seco por mirar la pantalla.'
    },
    {
        id: 'eye-massage',
        title: 'Masaje y acupresión ocular',
        category: 'eyes',
        duration: 90,
        steps: [
            'Con los pulgares, presiona suavemente debajo de las cejas (junto al puente nasal).',
            'Haz pequeños círculos en las sienes durante 20 segundos.',
            'Masajea con dos dedos los pómulos bajo los ojos.',
            'Termina presionando puntos junto al lagrimal 5 segundos.'
        ],
        benefit: 'Mejora circulación, reduce tensión y alivia presión sinusal.'
    },
    {
        id: 'eye-focus',
        title: 'Cambio de enfoque (cerca-lejos)',
        category: 'eyes',
        duration: 30,
        steps: [
            'Sujeta el pulgar a 25 cm de la cara.',
            'Enfoca el pulgar 5 segundos.',
            'Cambia el enfoque a un objeto lejano 5 segundos.',
            'Repite 5 veces seguidas.'
        ],
        benefit: 'Entrena el cristalino y reduce la rigidez de enfoque por trabajo cercano.'
    },

    // CUELLO
    {
        id: 'neck-tilt',
        title: 'Inclinación lateral de cuello',
        category: 'neck',
        duration: 40,
        steps: [
            'Siéntate recto, hombros relajados.',
            'Inclina la cabeza llevando la oreja al hombro derecho 20 s.',
            'Ayúdate con la mano suavemente — sin forzar.',
            'Cambia al lado izquierdo 20 s.'
        ],
        benefit: 'Estira el trapecio superior, principal foco de "tech neck".'
    },
    {
        id: 'neck-retraction',
        title: 'Retracción de barbilla',
        category: 'neck',
        duration: 30,
        steps: [
            'Mira al frente.',
            'Lleva el mentón hacia atrás como si hicieras papada.',
            'Mantén 5 segundos, relaja.',
            'Repite 6 veces.'
        ],
        benefit: 'Corrige la postura adelantada de cabeza típica frente al PC.'
    },
    {
        id: 'neck-diagonal',
        title: 'Estiramiento diagonal',
        category: 'neck',
        duration: 40,
        steps: [
            'Apunta la barbilla al hombro derecho, ligeramente abajo.',
            'Con la mano derecha presiona suave la nuca.',
            'Mantén 20 s sintiendo el estiramiento en la zona izquierda.',
            'Cambia de lado.'
        ],
        benefit: 'Libera tensión profunda en cuello y parte alta de la espalda.'
    },

    // HOMBROS Y ESPALDA ALTA
    {
        id: 'shoulder-rolls',
        title: 'Círculos de hombros',
        category: 'shoulders',
        duration: 30,
        steps: [
            'Eleva los hombros hacia las orejas.',
            'Llévalos hacia atrás y luego abajo, dibujando círculos.',
            'Hazlo 10 veces hacia atrás.',
            'Luego 10 veces hacia adelante.'
        ],
        benefit: 'Activa circulación en deltoides y deshace contracturas leves.'
    },
    {
        id: 'shoulder-clasp',
        title: 'Apertura de pecho',
        category: 'shoulders',
        duration: 30,
        steps: [
            'De pie o en el borde de la silla, espalda recta.',
            'Entrelaza las manos por detrás de la espalda.',
            'Presiona las palmas y baja los hombros lejos de las orejas.',
            'Mantén 30 segundos respirando profundo.'
        ],
        benefit: 'Contrarresta la postura cerrada de hombros del trabajo de oficina.'
    },
    {
        id: 'shoulder-doorway',
        title: 'Estiramiento de pectoral en marco',
        category: 'shoulders',
        duration: 40,
        steps: [
            'Ponte en un marco de puerta.',
            'Apoya los antebrazos en ambos lados del marco (codos a 90°).',
            'Adelanta un pie y deja caer el peso hacia adelante.',
            'Mantén 30-40 segundos.'
        ],
        benefit: 'Abre el pectoral acortado por horas tecleando.'
    },

    // ESPALDA
    {
        id: 'back-twist',
        title: 'Torsión sentado',
        category: 'back',
        duration: 40,
        steps: [
            'Sentado, pies apoyados al suelo.',
            'Gira el torso hacia la derecha agarrando el respaldo.',
            'Mantén 20 segundos respirando.',
            'Repite hacia el lado izquierdo.'
        ],
        benefit: 'Movilidad de columna torácica y descompresión de discos.'
    },
    {
        id: 'back-catcow',
        title: 'Gato-vaca sentado',
        category: 'back',
        duration: 60,
        steps: [
            'Manos sobre las rodillas.',
            'Inhala arqueando la espalda y mirando arriba (vaca).',
            'Exhala redondeando la espalda y metiendo el mentón (gato).',
            'Repite 8 ciclos lentos.'
        ],
        benefit: 'Moviliza toda la columna y libera tensión lumbar.'
    },

    // PIERNAS / CIRCULACIÓN
    {
        id: 'legs-walk',
        title: 'Caminar 2 minutos',
        category: 'legs',
        duration: 120,
        steps: [
            'Levántate de la silla.',
            'Camina por la habitación o pasillo.',
            'Sube y baja escaleras si puedes.',
            'Vuelve solo cuando hayan pasado 2 minutos completos.'
        ],
        benefit: 'Reactiva circulación y reduce presión en discos lumbares.'
    },
    {
        id: 'legs-calf',
        title: 'Elevación de talones',
        category: 'legs',
        duration: 45,
        steps: [
            'De pie, apóyate en la mesa si necesitas equilibrio.',
            'Sube de puntillas elevando los talones.',
            'Baja lentamente.',
            'Repite 20 veces.'
        ],
        benefit: 'Activa la bomba muscular venosa de las pantorrillas.'
    },
    {
        id: 'legs-hip',
        title: 'Estiramiento de flexores de cadera',
        category: 'legs',
        duration: 60,
        steps: [
            'De pie, da un paso largo adelante (zancada).',
            'Mantén el torso recto, baja la cadera del lado de atrás.',
            'Mantén 30 segundos.',
            'Cambia de pierna.'
        ],
        benefit: 'Compensa el acortamiento por estar sentado muchas horas.'
    },

    // MANOS / MUÑECAS
    {
        id: 'hands-wrist',
        title: 'Estiramiento de muñeca',
        category: 'hands',
        duration: 40,
        steps: [
            'Estira el brazo al frente con la palma hacia arriba.',
            'Con la otra mano, tira de los dedos hacia abajo.',
            'Mantén 15 segundos.',
            'Repite con la palma hacia abajo y cambia de mano.'
        ],
        benefit: 'Previene síndrome del túnel carpiano y tendinitis.'
    },
    {
        id: 'hands-fist',
        title: 'Apertura y cierre de mano',
        category: 'hands',
        duration: 30,
        steps: [
            'Cierra el puño con fuerza moderada.',
            'Abre la mano extendiendo los dedos al máximo.',
            'Repite 15 veces por mano.',
            'Termina sacudiendo las manos sueltas.'
        ],
        benefit: 'Activa circulación en dedos y libera tensión de teclear.'
    },

    // AGUA
    {
        id: 'water-glass',
        title: 'Bebe un vaso de agua',
        category: 'water',
        duration: 30,
        steps: [
            'Levántate y ve a por agua fresca.',
            'Bebe un vaso completo (250 ml).',
            'Aprovecha para mirar por la ventana 20 segundos.',
            'Vuelve con la botella llena al escritorio.'
        ],
        benefit: 'La hidratación mantiene la concentración y nutre los discos vertebrales.'
    }
]

// =====================================================================
// CONFIG
// =====================================================================

const CATEGORY_META: Record<Exercise['category'], { label: string; color: string; bg: string; icon: any }> = {
    eyes: { label: 'Ojos', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900/30', icon: Eye },
    neck: { label: 'Cuello', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30', icon: Activity },
    shoulders: { label: 'Hombros', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: StretchHorizontal },
    back: { label: 'Espalda', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: StretchHorizontal },
    legs: { label: 'Piernas', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: Footprints },
    hands: { label: 'Manos', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30', icon: Hand },
    water: { label: 'Agua', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/30', icon: Droplet }
}

const STORAGE_KEY = 'pausas-activas-settings'
const STATS_KEY = 'pausas-activas-stats'

type Settings = {
    eyeIntervalMin: number      // pausa corta visual
    bodyIntervalMin: number     // pausa larga de cuerpo
    waterIntervalMin: number    // recordatorio de agua
    soundEnabled: boolean
    notificationsEnabled: boolean
}

const DEFAULT_SETTINGS: Settings = {
    eyeIntervalMin: 20,
    bodyIntervalMin: 50,
    waterIntervalMin: 60,
    soundEnabled: true,
    notificationsEnabled: true
}

// =====================================================================
// COMPONENT
// =====================================================================

export default function PausasActivasPage() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
    const [showSettings, setShowSettings] = useState(false)
    const [isRunning, setIsRunning] = useState(false)
    const [elapsedSec, setElapsedSec] = useState(0)
    const [activeExercise, setActiveExercise] = useState<Exercise | null>(null)
    const [exerciseTimer, setExerciseTimer] = useState(0)
    const [stats, setStats] = useState({ eyes: 0, body: 0, water: 0, total: 0, date: '' })
    const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default')

    const lastEyeTriggerRef = useRef(0)
    const lastBodyTriggerRef = useRef(0)
    const lastWaterTriggerRef = useRef(0)

    // Cargar config y stats
    useEffect(() => {
        try {
            const s = localStorage.getItem(STORAGE_KEY)
            if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) })
            const st = localStorage.getItem(STATS_KEY)
            const today = new Date().toDateString()
            if (st) {
                const parsed = JSON.parse(st)
                if (parsed.date === today) setStats(parsed)
                else setStats({ eyes: 0, body: 0, water: 0, total: 0, date: today })
            } else {
                setStats({ eyes: 0, body: 0, water: 0, total: 0, date: today })
            }
        } catch {}
        if (typeof Notification !== 'undefined') setBrowserPermission(Notification.permission)
    }, [])

    // Persistir
    useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) }, [settings])
    useEffect(() => { if (stats.date) localStorage.setItem(STATS_KEY, JSON.stringify(stats)) }, [stats])

    // Timer principal de sesión
    useEffect(() => {
        if (!isRunning) return
        const id = setInterval(() => setElapsedSec(s => s + 1), 1000)
        return () => clearInterval(id)
    }, [isRunning])

    // Timer del ejercicio activo
    useEffect(() => {
        if (!activeExercise) return
        if (exerciseTimer <= 0) return
        const id = setInterval(() => setExerciseTimer(t => Math.max(0, t - 1)), 1000)
        return () => clearInterval(id)
    }, [activeExercise, exerciseTimer])

    // Disparador de pausas
    useEffect(() => {
        if (!isRunning) return
        const elapsedMin = elapsedSec / 60

        if (elapsedMin - lastEyeTriggerRef.current >= settings.eyeIntervalMin) {
            lastEyeTriggerRef.current = elapsedMin
            triggerBreak('eyes')
        }
        if (elapsedMin - lastBodyTriggerRef.current >= settings.bodyIntervalMin) {
            lastBodyTriggerRef.current = elapsedMin
            triggerBreak('body')
        }
        if (elapsedMin - lastWaterTriggerRef.current >= settings.waterIntervalMin) {
            lastWaterTriggerRef.current = elapsedMin
            triggerBreak('water')
        }
    }, [elapsedSec, isRunning, settings])

    const playBeep = () => {
        if (!settings.soundEnabled) return
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain); gain.connect(ctx.destination)
            osc.frequency.value = 880
            gain.gain.setValueAtTime(0.001, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
            osc.start(); osc.stop(ctx.currentTime + 0.6)
        } catch {}
    }

    const sendNotification = (title: string, body: string) => {
        if (!settings.notificationsEnabled) return
        if (typeof Notification === 'undefined') return
        if (Notification.permission !== 'granted') return
        try {
            new Notification(title, { body, icon: '/favicon.ico', tag: 'pausas-activas' })
        } catch {}
    }

    const triggerBreak = (type: 'eyes' | 'body' | 'water') => {
        playBeep()
        let pool: Exercise[] = []
        let title = ''
        if (type === 'eyes') { pool = EXERCISES.filter(e => e.category === 'eyes'); title = '👀 Pausa visual' }
        else if (type === 'water') { pool = EXERCISES.filter(e => e.category === 'water'); title = '💧 Bebe agua' }
        else { pool = EXERCISES.filter(e => ['neck','shoulders','back','legs','hands'].includes(e.category)); title = '🧘 Pausa activa' }
        const ex = pool[Math.floor(Math.random() * pool.length)]
        sendNotification(title, ex.title)
        toast(title, { description: ex.title, action: { label: 'Hacer ahora', onClick: () => startExercise(ex) } })
    }

    const startExercise = (ex: Exercise) => {
        setActiveExercise(ex)
        setExerciseTimer(ex.duration)
    }

    const completeExercise = () => {
        if (!activeExercise) return
        const cat = activeExercise.category
        setStats(prev => {
            const next = { ...prev, total: prev.total + 1 }
            if (cat === 'eyes') next.eyes = prev.eyes + 1
            else if (cat === 'water') next.water = prev.water + 1
            else next.body = prev.body + 1
            return next
        })
        toast.success('¡Hecho!', { description: 'Sigue así, tu cuerpo te lo agradece.' })
        setActiveExercise(null)
        setExerciseTimer(0)
    }

    const handleStartStop = () => {
        if (!isRunning) {
            // Solicitar permiso de notificaciones la primera vez
            if (settings.notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
                Notification.requestPermission().then(p => setBrowserPermission(p))
            }
            lastEyeTriggerRef.current = elapsedSec / 60
            lastBodyTriggerRef.current = elapsedSec / 60
            lastWaterTriggerRef.current = elapsedSec / 60
        }
        setIsRunning(r => !r)
    }

    const handleReset = () => {
        setIsRunning(false)
        setElapsedSec(0)
        lastEyeTriggerRef.current = 0
        lastBodyTriggerRef.current = 0
        lastWaterTriggerRef.current = 0
    }

    const formatTime = (sec: number) => {
        const h = Math.floor(sec / 3600)
        const m = Math.floor((sec % 3600) / 60)
        const s = sec % 60
        return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` : `${m}:${s.toString().padStart(2,'0')}`
    }

    const nextEyeIn = useMemo(() => {
        if (!isRunning) return null
        const remaining = settings.eyeIntervalMin * 60 - (elapsedSec - lastEyeTriggerRef.current * 60)
        return Math.max(0, Math.floor(remaining))
    }, [elapsedSec, isRunning, settings.eyeIntervalMin])

    const nextBodyIn = useMemo(() => {
        if (!isRunning) return null
        const remaining = settings.bodyIntervalMin * 60 - (elapsedSec - lastBodyTriggerRef.current * 60)
        return Math.max(0, Math.floor(remaining))
    }, [elapsedSec, isRunning, settings.bodyIntervalMin])

    const exercisesByCategory = useMemo(() => {
        const grouped: Record<string, Exercise[]> = {}
        EXERCISES.forEach(e => {
            if (!grouped[e.category]) grouped[e.category] = []
            grouped[e.category].push(e)
        })
        return grouped
    }, [])

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24 space-y-8 animate-in fade-in duration-500">
            {/* HEADER */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 rounded-2xl shadow-lg shadow-emerald-500/20">
                        <Sparkles className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Pausas Activas</h1>
                        <p className="text-muted-foreground">Micro-descansos guiados para tu cuerpo y vista</p>
                    </div>
                </div>
                <Button variant="outline" size="icon" onClick={() => setShowSettings(true)} className="rounded-full shrink-0">
                    <Settings className="w-5 h-5" />
                </Button>
            </header>

            {/* PANEL PRINCIPAL */}
            <Card className="overflow-hidden border-border/50">
                <div className={cn(
                    "p-6 sm:p-8 transition-colors",
                    isRunning ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40" : "bg-muted/30"
                )}>
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            <Timer className="w-3.5 h-3.5" />
                            {isRunning ? 'Sesión en curso' : 'Inactivo'}
                        </div>
                        <div className="text-6xl md:text-7xl font-mono font-bold tabular-nums">
                            {formatTime(elapsedSec)}
                        </div>
                        {isRunning && (
                            <div className="grid grid-cols-2 gap-3 w-full max-w-md text-sm">
                                <div className="bg-background/60 rounded-xl p-3 backdrop-blur-sm">
                                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-center"><Eye className="w-3 h-3" /> Próx. vista</div>
                                    <div className="font-mono font-bold text-sky-600 dark:text-sky-400">{formatTime(nextEyeIn ?? 0)}</div>
                                </div>
                                <div className="bg-background/60 rounded-xl p-3 backdrop-blur-sm">
                                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-center"><StretchHorizontal className="w-3 h-3" /> Próx. cuerpo</div>
                                    <div className="font-mono font-bold text-rose-600 dark:text-rose-400">{formatTime(nextBodyIn ?? 0)}</div>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <Button
                                size="lg"
                                onClick={handleStartStop}
                                className={cn(
                                    "rounded-full px-8 h-12 text-base shadow-lg",
                                    isRunning ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                                )}
                            >
                                {isRunning ? <><Pause className="w-5 h-5 mr-2" /> Pausar</> : <><Play className="w-5 h-5 mr-2" /> Empezar</>}
                            </Button>
                            <Button variant="outline" size="lg" onClick={handleReset} className="rounded-full h-12">
                                <RotateCcw className="w-5 h-5" />
                            </Button>
                        </div>
                        {browserPermission === 'denied' && settings.notificationsEnabled && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 max-w-sm">
                                Notificaciones bloqueadas. Activa los permisos del navegador para esta web.
                            </p>
                        )}
                    </div>
                </div>
            </Card>

            {/* STATS DEL DÍA */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Sparkles} label="Pausas hoy" value={stats.total} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-100 dark:bg-emerald-900/30" />
                <StatCard icon={Eye} label="Visuales" value={stats.eyes} color="text-sky-600 dark:text-sky-400" bg="bg-sky-100 dark:bg-sky-900/30" />
                <StatCard icon={StretchHorizontal} label="De cuerpo" value={stats.body} color="text-rose-600 dark:text-rose-400" bg="bg-rose-100 dark:bg-rose-900/30" />
                <StatCard icon={Droplet} label="Agua" value={stats.water} color="text-teal-600 dark:text-teal-400" bg="bg-teal-100 dark:bg-teal-900/30" />
            </div>

            {/* BIBLIOTECA DE EJERCICIOS */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-2xl font-bold">Biblioteca de ejercicios</h2>
                    <p className="text-muted-foreground text-sm">Toca cualquiera para hacerlo ahora — todos validados por fisioterapeutas y oftalmólogos.</p>
                </div>
                {Object.entries(exercisesByCategory).map(([cat, list]) => {
                    const meta = CATEGORY_META[cat as Exercise['category']]
                    const Icon = meta.icon
                    return (
                        <div key={cat} className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                                <div className={cn("p-1.5 rounded-lg", meta.bg)}>
                                    <Icon className={cn("w-4 h-4", meta.color)} />
                                </div>
                                <h3 className="font-bold">{meta.label}</h3>
                                <span className="text-xs text-muted-foreground">({list.length})</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {list.map(ex => (
                                    <button
                                        key={ex.id}
                                        onClick={() => startExercise(ex)}
                                        className="text-left p-3 rounded-xl border border-border/50 hover:border-border hover:shadow-md transition-all bg-card group flex items-center gap-3"
                                    >
                                        <div className={cn("shrink-0 rounded-lg p-1.5", meta.bg)}>
                                            <ExerciseAnimation id={ex.id} size="sm" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1 gap-2">
                                                <span className="font-semibold text-sm truncate">{ex.title}</span>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Timer className="w-3 h-3" /> {ex.duration}s
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* MODAL DE EJERCICIO ACTIVO */}
            {activeExercise && (
                <ExerciseModal
                    exercise={activeExercise}
                    timeLeft={exerciseTimer}
                    onClose={() => { setActiveExercise(null); setExerciseTimer(0) }}
                    onComplete={completeExercise}
                />
            )}

            {/* MODAL DE CONFIG */}
            {showSettings && (
                <SettingsModal
                    settings={settings}
                    onChange={setSettings}
                    onClose={() => setShowSettings(false)}
                    permission={browserPermission}
                    onRequestPermission={() => {
                        if (typeof Notification !== 'undefined') {
                            Notification.requestPermission().then(p => setBrowserPermission(p))
                        }
                    }}
                />
            )}
        </div>
    )
}

// =====================================================================
// SUBCOMPONENTS
// =====================================================================

function StatCard({ icon: Icon, label, value, color, bg }: any) {
    return (
        <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
            <div className={cn("p-2.5 rounded-lg", bg)}>
                <Icon className={cn("w-5 h-5", color)} />
            </div>
            <div>
                <div className="text-2xl font-bold tabular-nums leading-none">{value}</div>
                <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </div>
        </div>
    )
}

function ExerciseModal({ exercise, timeLeft, onClose, onComplete }: { exercise: Exercise; timeLeft: number; onClose: () => void; onComplete: () => void }) {
    const meta = CATEGORY_META[exercise.category]
    const Icon = meta.icon
    const pct = ((exercise.duration - timeLeft) / exercise.duration) * 100

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-background/85 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-card w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-300">
                <div className={cn("p-6 sm:p-8 border-b relative", meta.bg)}>
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-background/40 z-10">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col gap-4">
                        <ExerciseVideo id={exercise.id} title={exercise.title} size="lg" />
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={cn("p-1.5 rounded-lg bg-background/60", meta.color)}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className={cn("text-xs font-bold uppercase tracking-widest", meta.color)}>{meta.label}</span>
                            </div>
                            <h3 className="text-2xl font-bold">{exercise.title}</h3>
                            <p className="text-sm text-muted-foreground mt-2">{exercise.benefit}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 sm:p-8 space-y-5">
                    {/* Countdown */}
                    <div className="text-center space-y-3">
                        <div className="text-5xl font-mono font-bold tabular-nums">{timeLeft}<span className="text-2xl text-muted-foreground">s</span></div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all duration-1000", meta.bg.replace('bg-', 'bg-').replace('/30','').replace('100','500'))} style={{ width: `${pct}%` }} />
                        </div>
                    </div>

                    {/* Pasos */}
                    <ol className="space-y-2.5">
                        {exercise.steps.map((step, i) => (
                            <li key={i} className="flex gap-3 text-sm">
                                <span className={cn("shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", meta.bg, meta.color)}>{i + 1}</span>
                                <span className="leading-relaxed pt-0.5">{step}</span>
                            </li>
                        ))}
                    </ol>

                    <Button onClick={onComplete} className="w-full h-12 rounded-full bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        {timeLeft === 0 ? 'Completar' : 'Marcar como hecho'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

function SettingsModal({ settings, onChange, onClose, permission, onRequestPermission }: {
    settings: Settings
    onChange: (s: Settings) => void
    onClose: () => void
    permission: NotificationPermission
    onRequestPermission: () => void
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-background/85 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-card w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b flex items-center justify-between">
                    <h3 className="text-xl font-bold">Configuración</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    {/* Intervalos */}
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-2"><Eye className="w-4 h-4 text-sky-500" /> Pausa visual cada <span className="font-bold ml-auto">{settings.eyeIntervalMin} min</span></Label>
                        <Slider value={[settings.eyeIntervalMin]} min={5} max={60} step={5} onValueChange={([v]) => onChange({ ...settings, eyeIntervalMin: v })} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-2"><StretchHorizontal className="w-4 h-4 text-rose-500" /> Pausa de cuerpo cada <span className="font-bold ml-auto">{settings.bodyIntervalMin} min</span></Label>
                        <Slider value={[settings.bodyIntervalMin]} min={15} max={120} step={5} onValueChange={([v]) => onChange({ ...settings, bodyIntervalMin: v })} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-2"><Droplet className="w-4 h-4 text-teal-500" /> Recordar agua cada <span className="font-bold ml-auto">{settings.waterIntervalMin} min</span></Label>
                        <Slider value={[settings.waterIntervalMin]} min={15} max={180} step={15} onValueChange={([v]) => onChange({ ...settings, waterIntervalMin: v })} />
                    </div>

                    {/* Toggles */}
                    <div className="space-y-3 pt-2 border-t">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">{settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />} Sonido</Label>
                            <Switch checked={settings.soundEnabled} onCheckedChange={(c) => onChange({ ...settings, soundEnabled: c })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">{settings.notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />} Notificaciones del navegador</Label>
                            <Switch checked={settings.notificationsEnabled} onCheckedChange={(c) => onChange({ ...settings, notificationsEnabled: c })} />
                        </div>
                        {settings.notificationsEnabled && permission !== 'granted' && (
                            <Button variant="outline" size="sm" onClick={onRequestPermission} className="w-full">
                                {permission === 'denied' ? 'Bloqueadas — revisa permisos del navegador' : 'Solicitar permiso'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
