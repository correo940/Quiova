'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    ArrowLeft, BookOpen, Brain, CheckCircle2, Clock, Heart, Pause, Play, RotateCcw,
    Sparkles, Wind, Volume2, VolumeX, Maximize, X, Bell, BellOff, Flame, Award,
    Headphones, Library, BarChart3, Plus, Trash2
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { TECHNIQUES, GUIDED_MEDITATIONS, CATEGORY_LABELS, AMBIENT_SOUNDS, MANTRAS, ACHIEVEMENTS } from './modules/data'
import { speak, cancelSpeech, playGong, playBeep, vibrate, requestNotificationPermission, sendNotification } from './modules/audio'
import { calculateStreak, getUnlockedAchievements, getMoodHistory, type SessionEntry } from './modules/stats'

type MoodKey = 'sereno' | 'cansado' | 'saturado' | 'agradecido' | 'enfocado'
type PauseEntry = { id: string; createdAt: string; mood: MoodKey; title: string; note: string }
type Reminder = { id: string; time: string; enabled: boolean; label: string }

const STORAGE = {
    entries: 'quioba_pause_entries',
    sessions: 'quioba_pause_sessions',
    mood: 'quioba_pause_mood',
    reminders: 'quioba_pause_reminders',
    settings: 'quioba_pause_settings'
}

const MOODS: { key: MoodKey; label: string; tone: string; hint: string }[] = [
    { key: 'sereno', label: 'Sereno', tone: 'bg-green-100 text-green-900 border-green-200', hint: 'Mantener la calma' },
    { key: 'cansado', label: 'Cansado', tone: 'bg-amber-100 text-amber-700 border-amber-200', hint: 'Bajar el ritmo' },
    { key: 'saturado', label: 'Saturado', tone: 'bg-rose-100 text-rose-700 border-rose-200', hint: 'Soltar peso mental' },
    { key: 'agradecido', label: 'Agradecido', tone: 'bg-lime-100 text-lime-700 border-lime-200', hint: 'Reconocer lo bueno' },
    { key: 'enfocado', label: 'Enfocado', tone: 'bg-cyan-100 text-cyan-700 border-cyan-200', hint: 'Entrar en claridad' }
]

function loadJson<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback
    try {
        const v = localStorage.getItem(key)
        return v ? JSON.parse(v) as T : fallback
    } catch { return fallback }
}
function saveJson<T>(key: string, value: T) {
    if (typeof window === 'undefined') return
    localStorage.setItem(key, JSON.stringify(value))
}

export default function MeditationStudio() {
    // === ESTADO PRINCIPAL ===
    const [tab, setTab] = useState('respirar')
    const [entries, setEntries] = useState<PauseEntry[]>([])
    const [sessions, setSessions] = useState<SessionEntry[]>([])
    const [selectedMood, setSelectedMood] = useState<MoodKey | null>('sereno')
    const [reminders, setReminders] = useState<Reminder[]>([])

    // === CONFIG ===
    const [settings, setSettings] = useState({
        voiceEnabled: true,
        soundsEnabled: true,
        vibrateEnabled: true,
        voiceVolume: 0.8,
        ambientVolume: 50
    })

    // === RESPIRACIÓN ===
    const [selectedTechId, setSelectedTechId] = useState('natural')
    const [breathingActive, setBreathingActive] = useState(false)
    const [breathPhase, setBreathPhase] = useState<'idle' | 'in' | 'hold-in' | 'out' | 'hold-out'>('idle')
    const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0)
    const [currentCycle, setCurrentCycle] = useState(0)
    const [immersiveMode, setImmersiveMode] = useState(false)
    const [currentMantra, setCurrentMantra] = useState(MANTRAS[0])

    // === SONIDOS AMBIENTE ===
    const [activeAmbient, setActiveAmbient] = useState<string | null>(null)
    const ambientIframeRef = useRef<HTMLIFrameElement>(null)

    // === MEDITACIÓN GUIADA ===
    const [openedMeditation, setOpenedMeditation] = useState<typeof GUIDED_MEDITATIONS[0] | null>(null)
    const [filterCategory, setFilterCategory] = useState<string>('all')

    // === DIARIO ===
    const [entryTitle, setEntryTitle] = useState('')
    const [entryNote, setEntryNote] = useState('')

    // === RECORDATORIOS ===
    const [newReminderTime, setNewReminderTime] = useState('08:00')
    const [newReminderLabel, setNewReminderLabel] = useState('Pausa de la mañana')
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')

    // === CARGAR DATOS ===
    useEffect(() => {
        setEntries(loadJson<PauseEntry[]>(STORAGE.entries, []))
        setSessions(loadJson<SessionEntry[]>(STORAGE.sessions, []))
        setSelectedMood(loadJson<MoodKey | null>(STORAGE.mood, 'sereno'))
        setReminders(loadJson<Reminder[]>(STORAGE.reminders, []))
        setSettings(s => ({ ...s, ...loadJson<typeof settings>(STORAGE.settings, s) }))
        if (typeof Notification !== 'undefined') setNotifPermission(Notification.permission)

        // Cargar voces TTS asíncronamente
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.getVoices()
            window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
        }

        // Mantra del día
        setCurrentMantra(MANTRAS[new Date().getDate() % MANTRAS.length])
    }, [])

    useEffect(() => { saveJson(STORAGE.settings, settings) }, [settings])
    useEffect(() => { if (selectedMood) saveJson(STORAGE.mood, selectedMood) }, [selectedMood])
    useEffect(() => { saveJson(STORAGE.reminders, reminders) }, [reminders])

    // === ENGINE DE RESPIRACIÓN ===
    const selectedTech = TECHNIQUES.find(t => t.id === selectedTechId) || TECHNIQUES[0]

    useEffect(() => {
        if (!breathingActive) return
        if (phaseSecondsLeft <= 0) {
            // Avanzar de fase
            const [tIn, tHoldIn, tOut, tHoldOut] = selectedTech.pattern
            let nextPhase: typeof breathPhase = 'in'
            let nextSec = tIn

            if (breathPhase === 'idle' || breathPhase === 'hold-out') {
                nextPhase = 'in'; nextSec = tIn
                if (breathPhase === 'hold-out') {
                    const c = currentCycle + 1
                    if (c >= selectedTech.cycles) { completeBreathing(); return }
                    setCurrentCycle(c)
                }
            } else if (breathPhase === 'in') {
                if (tHoldIn > 0) { nextPhase = 'hold-in'; nextSec = tHoldIn }
                else { nextPhase = 'out'; nextSec = tOut }
            } else if (breathPhase === 'hold-in') {
                nextPhase = 'out'; nextSec = tOut
            } else if (breathPhase === 'out') {
                if (tHoldOut > 0) { nextPhase = 'hold-out'; nextSec = tHoldOut }
                else {
                    const c = currentCycle + 1
                    if (c >= selectedTech.cycles) { completeBreathing(); return }
                    setCurrentCycle(c)
                    nextPhase = 'in'; nextSec = tIn
                }
            }

            setBreathPhase(nextPhase)
            setPhaseSecondsLeft(nextSec)

            // Voz + beep + vibración
            if (settings.voiceEnabled) {
                const labels = { 'in': 'Inhala', 'hold-in': 'Sostén', 'out': 'Exhala', 'hold-out': 'Relaja' }
                speak(labels[nextPhase], { volume: settings.voiceVolume })
            }
            if (settings.soundsEnabled) playBeep(nextPhase === 'in' ? 440 : nextPhase === 'out' ? 330 : 392, 0.15, 0.15)
            if (settings.vibrateEnabled) vibrate(100)
            return
        }
        const id = setTimeout(() => setPhaseSecondsLeft(s => s - 1), 1000)
        return () => clearTimeout(id)
    }, [breathingActive, phaseSecondsLeft, breathPhase])

    const startBreathing = () => {
        setCurrentCycle(0)
        setBreathPhase('idle')
        setPhaseSecondsLeft(0)
        setBreathingActive(true)
        if (settings.soundsEnabled) playGong(0.4)
        toast('Sesión iniciada', { description: selectedTech.name })
    }

    const stopBreathing = () => {
        setBreathingActive(false)
        setBreathPhase('idle')
        setPhaseSecondsLeft(0)
        setCurrentCycle(0)
        cancelSpeech()
        setImmersiveMode(false)
    }

    const completeBreathing = () => {
        setBreathingActive(false)
        setBreathPhase('idle')
        setPhaseSecondsLeft(0)
        cancelSpeech()
        if (settings.soundsEnabled) playGong(0.6)
        if (settings.vibrateEnabled) vibrate([200, 100, 200])

        // Guardar sesión
        const totalDuration = selectedTech.cycles * (selectedTech.pattern[0] + selectedTech.pattern[1] + selectedTech.pattern[2] + selectedTech.pattern[3])
        const newSession: SessionEntry = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            duration: totalDuration,
            mood: selectedMood,
            technique: selectedTech.id
        }
        const updated = [newSession, ...sessions].slice(0, 100)
        setSessions(updated)
        saveJson(STORAGE.sessions, updated)

        // Check logros nuevos
        const before = getUnlockedAchievements(sessions)
        const after = getUnlockedAchievements(updated)
        const newOnes = after.filter(a => !before.find(b => b.id === a.id))
        newOnes.forEach(a => toast.success(`${a.emoji} Logro desbloqueado: ${a.name}`, { description: a.description, duration: 6000 }))

        toast.success('Sesión completada', { description: 'Tu mente está un poco más limpia.' })
        setImmersiveMode(false)
    }

    // === SONIDOS AMBIENTE ===
    const toggleAmbient = (id: string) => {
        setActiveAmbient(activeAmbient === id ? null : id)
    }
    const activeAmbientObj = AMBIENT_SOUNDS.find(s => s.id === activeAmbient)

    // === DIARIO ===
    const handleSaveEntry = () => {
        if (!entryTitle.trim() && !entryNote.trim()) {
            toast.error('Escribe algo antes de guardar.')
            return
        }
        const e: PauseEntry = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            mood: selectedMood || 'sereno',
            title: entryTitle.trim() || 'Pensamiento breve',
            note: entryNote.trim()
        }
        const updated = [e, ...entries].slice(0, 50)
        setEntries(updated)
        saveJson(STORAGE.entries, updated)
        setEntryTitle('')
        setEntryNote('')
        toast.success('Pensamiento guardado.')
    }

    // === RECORDATORIOS ===
    const addReminder = async () => {
        if (notifPermission !== 'granted') {
            const p = await requestNotificationPermission()
            setNotifPermission(p)
            if (p !== 'granted') { toast.error('Necesitas permitir notificaciones'); return }
        }
        const r: Reminder = { id: crypto.randomUUID(), time: newReminderTime, enabled: true, label: newReminderLabel || 'Pausa' }
        setReminders([...reminders, r])
        setNewReminderLabel('')
        toast.success(`Recordatorio guardado a las ${r.time}`)
    }
    const deleteReminder = (id: string) => setReminders(reminders.filter(r => r.id !== id))
    const toggleReminder = (id: string) => setReminders(reminders.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))

    // Check recordatorios cada minuto
    useEffect(() => {
        const id = setInterval(() => {
            const now = new Date()
            const hhmm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
            reminders.filter(r => r.enabled && r.time === hhmm).forEach(r => {
                sendNotification('🧘 Hora de tu pausa', r.label)
                toast(`🧘 ${r.label}`, { description: 'Es tu momento Quioba.', duration: 10000 })
            })
        }, 60000)
        return () => clearInterval(id)
    }, [reminders])

    // === DERIVED ===
    const streak = useMemo(() => calculateStreak(sessions), [sessions])
    const totalMinutes = useMemo(() => Math.round(sessions.reduce((s, x) => s + x.duration, 0) / 60), [sessions])
    const unlockedAchievements = useMemo(() => getUnlockedAchievements(sessions), [sessions])
    const todaySessions = useMemo(() => {
        const today = format(new Date(), 'yyyy-MM-dd')
        return sessions.filter(s => s.createdAt.startsWith(today)).length
    }, [sessions])
    const moodHistory = useMemo(() => getMoodHistory(
        sessions.filter(s => s.mood).map(s => ({ createdAt: s.createdAt, mood: s.mood! })),
        7
    ), [sessions])

    const breathScale = useMemo(() => {
        if (!breathingActive) return 1
        if (breathPhase === 'in') return 1.3
        if (breathPhase === 'hold-in') return 1.3
        if (breathPhase === 'out') return 0.85
        return 0.85
    }, [breathingActive, breathPhase])

    const phaseLabel = {
        'idle': 'Preparando',
        'in': 'Inhala',
        'hold-in': 'Sostén',
        'out': 'Exhala',
        'hold-out': 'Relaja'
    }[breathPhase]

    const totalDurationSec = selectedTech.cycles * (selectedTech.pattern[0] + selectedTech.pattern[1] + selectedTech.pattern[2] + selectedTech.pattern[3])

    // === MODO INMERSIVO ===
    if (immersiveMode && breathingActive) {
        return (
            <div className="fixed inset-0 z-50 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 flex flex-col items-center justify-center text-white overflow-hidden">
                {/* Partículas de fondo */}
                <div className="absolute inset-0 overflow-hidden">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 bg-white/20 rounded-full"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animation: `float ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 2}s infinite`
                            }}
                        />
                    ))}
                </div>
                <style>{`
                    @keyframes float {
                        0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
                        50% { transform: translateY(-30px) scale(1.5); opacity: 0.8; }
                    }
                `}</style>
                <button onClick={() => setImmersiveMode(false)} className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10">
                    <X className="w-6 h-6" />
                </button>
                <p className="text-center text-lg italic opacity-80 max-w-md px-6 mb-8">"{currentMantra}"</p>
                <motion.div
                    animate={{ scale: breathScale }}
                    transition={{ duration: 1.5, ease: 'easeInOut' }}
                    className="relative w-80 h-80 rounded-full bg-gradient-to-br from-emerald-400/40 to-teal-400/40 shadow-[0_0_120px_rgba(16,185,129,0.5)] flex items-center justify-center"
                >
                    <div className="absolute inset-4 rounded-full border border-white/20" />
                    <div className="absolute inset-12 rounded-full border border-white/30" />
                    <div className="text-center z-10">
                        <p className="text-sm uppercase tracking-[0.3em] opacity-70">{phaseLabel}</p>
                        <p className="text-7xl font-black tabular-nums mt-2">{phaseSecondsLeft}</p>
                        <p className="text-sm mt-3 opacity-60">Ciclo {currentCycle + 1} / {selectedTech.cycles}</p>
                    </div>
                </motion.div>
                <Button onClick={stopBreathing} variant="ghost" className="mt-12 text-white hover:bg-white/10 rounded-full">
                    Terminar sesión
                </Button>
            </div>
        )
    }

    // === UI PRINCIPAL ===
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(134,239,172,0.12),transparent_20%),linear-gradient(180deg,#f7fdf9_0%,#eef8f2_100%)] p-4 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                {/* HEADER */}
                <div className="flex items-center justify-between">
                    <Link href="/apps/mi-hogar">
                        <Button variant="ghost" size="sm" className="gap-2 rounded-full border border-green-100 bg-white/80 px-4 shadow-sm hover:bg-green-50">
                            <ArrowLeft className="h-4 w-4" /> Volver
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        {streak > 0 && (
                            <Badge className="rounded-full bg-orange-100 text-orange-700 border-orange-200 px-3 py-1 gap-1.5">
                                <Flame className="h-3.5 w-3.5" /> Racha {streak} {streak === 1 ? 'día' : 'días'}
                            </Badge>
                        )}
                        <Badge className="rounded-full border border-green-200 bg-white/80 px-3 py-1 text-green-900">
                            <Award className="h-3.5 w-3.5 mr-1" /> {unlockedAchievements.length}/{ACHIEVEMENTS.length}
                        </Badge>
                    </div>
                </div>

                {/* HERO */}
                <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-[2rem] border border-green-100 bg-white/80 shadow-lg p-6 md:p-8 backdrop-blur-xl">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-900 mb-3">
                        <Sparkles className="h-4 w-4" /> Pausa Quioba
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                        Un espacio para respirar, pensar y volver a ti.
                    </h1>
                    <p className="text-lg text-slate-600 mt-2 italic">"{currentMantra}"</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                        <StatChip label="Hoy" value={todaySessions} sub="sesiones" />
                        <StatChip label="Acumulado" value={totalMinutes} sub="minutos" />
                        <StatChip label="Racha" value={streak} sub={streak === 1 ? 'día' : 'días'} highlight={streak > 0} />
                        <StatChip label="Logros" value={unlockedAchievements.length} sub={`de ${ACHIEVEMENTS.length}`} />
                    </div>
                </motion.section>

                {/* TABS */}
                <Tabs value={tab} onValueChange={setTab} className="w-full">
                    <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 bg-white/80 rounded-2xl p-1 h-auto">
                        <TabsTrigger value="respirar" className="rounded-xl py-2.5 gap-1.5"><Wind className="w-4 h-4" /> Respirar</TabsTrigger>
                        <TabsTrigger value="meditaciones" className="rounded-xl py-2.5 gap-1.5"><Library className="w-4 h-4" /> Guiadas</TabsTrigger>
                        <TabsTrigger value="sonidos" className="rounded-xl py-2.5 gap-1.5"><Headphones className="w-4 h-4" /> Sonidos</TabsTrigger>
                        <TabsTrigger value="diario" className="rounded-xl py-2.5 gap-1.5"><BookOpen className="w-4 h-4" /> Diario</TabsTrigger>
                        <TabsTrigger value="logros" className="rounded-xl py-2.5 gap-1.5"><Award className="w-4 h-4" /> Logros</TabsTrigger>
                        <TabsTrigger value="recordatorios" className="rounded-xl py-2.5 gap-1.5"><Bell className="w-4 h-4" /> Avisos</TabsTrigger>
                    </TabsList>

                    {/* TAB RESPIRAR */}
                    <TabsContent value="respirar" className="mt-6 space-y-6">
                        {/* Selector de técnicas */}
                        <Card className="rounded-3xl border-green-100 bg-white/85">
                            <CardHeader>
                                <CardTitle className="text-lg">Elige tu técnica</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {TECHNIQUES.map(tech => (
                                        <button
                                            key={tech.id}
                                            onClick={() => { if (!breathingActive) setSelectedTechId(tech.id) }}
                                            disabled={breathingActive}
                                            className={cn(
                                                'text-left p-4 rounded-2xl border-2 transition-all',
                                                selectedTechId === tech.id ? 'border-green-500 bg-gradient-to-br ' + tech.bg + ' shadow-md' : 'border-slate-200 bg-white hover:border-green-200'
                                            )}
                                        >
                                            <div className={cn('font-bold text-base', selectedTechId === tech.id ? tech.color : 'text-slate-900')}>{tech.name}</div>
                                            <div className="text-xs text-slate-600 mt-1">{tech.description}</div>
                                            <div className="text-xs text-slate-500 mt-2">{tech.benefit}</div>
                                            <div className="text-[10px] text-slate-400 mt-2 font-mono">
                                                {tech.pattern[0]}-{tech.pattern[1]}-{tech.pattern[2]}-{tech.pattern[3]} · {tech.cycles} ciclos
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Burbuja de respiración */}
                        <Card className={cn('rounded-3xl border-green-100', `bg-gradient-to-br ${selectedTech.bg}`)}>
                            <CardContent className="p-8 flex flex-col items-center gap-6">
                                <motion.div
                                    animate={{ scale: breathScale }}
                                    transition={{ duration: 1.5, ease: 'easeInOut' }}
                                    className="relative w-64 h-64 rounded-full bg-white/70 shadow-[0_30px_80px_rgba(16,185,129,0.25)] flex items-center justify-center backdrop-blur-sm"
                                >
                                    <div className="absolute inset-3 rounded-full border border-white/60" />
                                    <div className="absolute inset-8 rounded-full border border-white/40" />
                                    <div className="text-center z-10">
                                        <p className={cn('text-xs uppercase tracking-[0.3em]', selectedTech.color)}>{phaseLabel}</p>
                                        <p className="text-6xl font-black text-slate-900 tabular-nums mt-1">
                                            {breathingActive ? phaseSecondsLeft : selectedTech.pattern[0]}
                                        </p>
                                        {breathingActive && (
                                            <p className="text-xs text-slate-600 mt-2">Ciclo {currentCycle + 1}/{selectedTech.cycles}</p>
                                        )}
                                    </div>
                                </motion.div>

                                <div className="flex flex-wrap gap-2 justify-center">
                                    {!breathingActive ? (
                                        <Button onClick={startBreathing} size="lg" className="rounded-full bg-green-700 hover:bg-green-800 px-8 h-12">
                                            <Play className="w-4 h-4 mr-2" /> Empezar
                                        </Button>
                                    ) : (
                                        <Button onClick={stopBreathing} size="lg" variant="outline" className="rounded-full px-8 h-12">
                                            <Pause className="w-4 h-4 mr-2" /> Detener
                                        </Button>
                                    )}
                                    {breathingActive && (
                                        <Button onClick={() => setImmersiveMode(true)} size="lg" variant="outline" className="rounded-full px-8 h-12 gap-2">
                                            <Maximize className="w-4 h-4" /> Inmersivo
                                        </Button>
                                    )}
                                </div>

                                <div className="text-xs text-slate-500">
                                    Duración: ~{Math.round(totalDurationSec / 60)} min · {selectedTech.cycles} ciclos
                                </div>
                            </CardContent>
                        </Card>

                        {/* Config audio */}
                        <Card className="rounded-3xl border-green-100 bg-white/85">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2"><Volume2 className="w-4 h-4" /> Audio y sensaciones</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Voz guía (Inhala, Sostén, Exhala)</Label>
                                    <Switch checked={settings.voiceEnabled} onCheckedChange={c => setSettings({ ...settings, voiceEnabled: c })} />
                                </div>
                                {settings.voiceEnabled && (
                                    <div>
                                        <Label className="text-xs">Volumen de voz: {Math.round(settings.voiceVolume * 100)}%</Label>
                                        <Slider value={[settings.voiceVolume * 100]} max={100} step={5} onValueChange={([v]) => setSettings({ ...settings, voiceVolume: v / 100 })} className="mt-2" />
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <Label>Beeps y gong</Label>
                                    <Switch checked={settings.soundsEnabled} onCheckedChange={c => setSettings({ ...settings, soundsEnabled: c })} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Vibración (móvil)</Label>
                                    <Switch checked={settings.vibrateEnabled} onCheckedChange={c => setSettings({ ...settings, vibrateEnabled: c })} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB MEDITACIONES GUIADAS */}
                    <TabsContent value="meditaciones" className="mt-6 space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant={filterCategory === 'all' ? 'default' : 'outline'} onClick={() => setFilterCategory('all')} className="rounded-full">Todas</Button>
                            {Object.entries(CATEGORY_LABELS).map(([key, m]) => (
                                <Button key={key} size="sm" variant={filterCategory === key ? 'default' : 'outline'} onClick={() => setFilterCategory(key)} className="rounded-full gap-1">
                                    <span>{m.emoji}</span> {m.label}
                                </Button>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {GUIDED_MEDITATIONS.filter(m => filterCategory === 'all' || m.category === filterCategory).map(m => {
                                const cat = CATEGORY_LABELS[m.category]
                                return (
                                    <button key={m.id} onClick={() => setOpenedMeditation(m)} className="text-left p-5 rounded-2xl bg-white border border-green-100 hover:shadow-lg transition-all">
                                        <div className="flex items-center justify-between mb-3">
                                            <Badge className={cn('rounded-full', cat.color)}>{cat.emoji} {cat.label}</Badge>
                                            <span className="text-xs text-slate-500">{m.duration}</span>
                                        </div>
                                        <h3 className="font-bold text-slate-900">{m.title}</h3>
                                        <p className="text-sm text-slate-600 mt-1">{m.description}</p>
                                    </button>
                                )
                            })}
                        </div>

                        {/* MODAL DE MEDITACIÓN */}
                        {openedMeditation && (
                            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                                <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden">
                                    <div className="aspect-video bg-black">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${openedMeditation.youtubeId}?autoplay=1&rel=0`}
                                            className="w-full h-full"
                                            allow="autoplay; encrypted-media; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                    <div className="p-6 flex items-center justify-between gap-4">
                                        <div>
                                            <h3 className="font-bold text-lg">{openedMeditation.title}</h3>
                                            <p className="text-sm text-slate-600">{openedMeditation.description}</p>
                                        </div>
                                        <Button onClick={() => setOpenedMeditation(null)} className="rounded-full">Cerrar</Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* TAB SONIDOS AMBIENTE */}
                    <TabsContent value="sonidos" className="mt-6 space-y-4">
                        <Card className="rounded-3xl border-green-100 bg-white/85">
                            <CardHeader>
                                <CardTitle className="text-lg">Sonidos ambiente</CardTitle>
                                <CardDescription>Selecciona uno para reproducir en bucle de fondo.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {AMBIENT_SOUNDS.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => toggleAmbient(s.id)}
                                            className={cn(
                                                'p-5 rounded-2xl border-2 transition-all',
                                                activeAmbient === s.id ? 'bg-green-500 border-green-600 text-white shadow-lg' : 'bg-white border-slate-200 hover:border-green-300'
                                            )}
                                        >
                                            <div className="text-4xl">{s.emoji}</div>
                                            <div className="font-bold mt-2 text-sm">{s.name}</div>
                                            <div className="text-xs mt-1 opacity-75">{activeAmbient === s.id ? 'Sonando...' : 'Tocar'}</div>
                                        </button>
                                    ))}
                                </div>
                                {activeAmbient && (
                                    <p className="text-xs text-slate-500 mt-4 text-center">El sonido sigue activo aunque navegues por la app. Pulsa de nuevo para silenciar.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* iframe oculto que reproduce el audio en bucle */}
                        {activeAmbientObj && (
                            <iframe
                                ref={ambientIframeRef}
                                key={activeAmbientObj.id}
                                src={`https://www.youtube.com/embed/${activeAmbientObj.youtubeId}?autoplay=1&loop=1&controls=0&playlist=${activeAmbientObj.youtubeId}`}
                                className="fixed bottom-0 right-0 w-1 h-1 opacity-0 pointer-events-none"
                                allow="autoplay; encrypted-media"
                            />
                        )}
                    </TabsContent>

                    {/* TAB DIARIO */}
                    <TabsContent value="diario" className="mt-6 space-y-4">
                        {/* Gráfica de mood */}
                        <Card className="rounded-3xl border-green-100 bg-white/85">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Tu estado esta semana</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-7 gap-2 items-end h-32">
                                    {moodHistory.map((d, i) => (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <div className="w-full bg-gradient-to-t from-green-300 to-emerald-500 rounded-md transition-all" style={{ height: `${(d.value / 5) * 100}%`, minHeight: d.value > 0 ? '8px' : '2px' }} />
                                            <span className="text-[10px] text-slate-500 font-bold">{d.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Mood actual */}
                        <Card className="rounded-3xl border-green-100 bg-white/85">
                            <CardHeader><CardTitle className="text-lg">¿Cómo estás ahora?</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                    {MOODS.map(m => (
                                        <button key={m.key} onClick={() => setSelectedMood(m.key)}
                                            className={cn('p-3 rounded-xl border-2 transition-all text-left', selectedMood === m.key ? m.tone + ' border-current shadow' : 'border-slate-200 bg-white hover:bg-green-50/40')}>
                                            <div className="font-bold">{m.label}</div>
                                            <div className="text-xs opacity-75">{m.hint}</div>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Nueva entrada */}
                        <Card className="rounded-3xl border-green-100 bg-white/85">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="w-4 h-4" /> Vaciar la mente</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Input value={entryTitle} onChange={e => setEntryTitle(e.target.value)} placeholder="Título breve..." className="h-11 rounded-xl" />
                                <Textarea value={entryNote} onChange={e => setEntryNote(e.target.value)} placeholder="¿Qué te ronda ahora?" className="min-h-[120px] rounded-xl" />
                                <Button onClick={handleSaveEntry} className="rounded-full bg-green-700 hover:bg-green-800">
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Guardar pensamiento
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Lista de entradas */}
                        {entries.length > 0 && (
                            <Card className="rounded-3xl border-green-100 bg-white/85">
                                <CardHeader><CardTitle className="text-lg">Tus pensamientos guardados</CardTitle></CardHeader>
                                <CardContent className="space-y-3">
                                    {entries.map(e => {
                                        const m = MOODS.find(x => x.key === e.mood)
                                        return (
                                            <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-bold">{e.title}</p>
                                                        <p className="text-xs text-slate-500">{format(new Date(e.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}</p>
                                                    </div>
                                                    {m && <Badge className={cn('rounded-full', m.tone)}>{m.label}</Badge>}
                                                </div>
                                                <p className="text-sm text-slate-600 whitespace-pre-wrap mt-3">{e.note}</p>
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* TAB LOGROS */}
                    <TabsContent value="logros" className="mt-6 space-y-4">
                        <Card className="rounded-3xl border-green-100 bg-white/85">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2"><Award className="w-4 h-4" /> Logros desbloqueados</CardTitle>
                                <CardDescription>{unlockedAchievements.length} de {ACHIEVEMENTS.length}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {ACHIEVEMENTS.map(a => {
                                        const unlocked = unlockedAchievements.find(u => u.id === a.id)
                                        return (
                                            <div key={a.id} className={cn(
                                                'p-4 rounded-2xl border-2 text-center transition-all',
                                                unlocked ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-50'
                                            )}>
                                                <div className="text-4xl">{a.emoji}</div>
                                                <div className="font-bold mt-2 text-sm">{a.name}</div>
                                                <div className="text-xs text-slate-600 mt-1">{a.description}</div>
                                                {unlocked && <Badge className="mt-2 rounded-full bg-amber-100 text-amber-700">Desbloqueado</Badge>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB RECORDATORIOS */}
                    <TabsContent value="recordatorios" className="mt-6 space-y-4">
                        <Card className="rounded-3xl border-green-100 bg-white/85">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2"><Bell className="w-4 h-4" /> Recordatorios diarios</CardTitle>
                                <CardDescription>Te avisaremos cada día a la hora que elijas.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {notifPermission !== 'granted' && (
                                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                                        Permite las notificaciones del navegador para recibir los recordatorios.
                                    </div>
                                )}
                                <div className="flex flex-col md:flex-row gap-2">
                                    <Input type="time" value={newReminderTime} onChange={e => setNewReminderTime(e.target.value)} className="md:w-32 rounded-xl" />
                                    <Input value={newReminderLabel} onChange={e => setNewReminderLabel(e.target.value)} placeholder="Etiqueta (ej: Pausa de la mañana)" className="flex-1 rounded-xl" />
                                    <Button onClick={addReminder} className="rounded-full bg-green-700 hover:bg-green-800 gap-2">
                                        <Plus className="w-4 h-4" /> Añadir
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {reminders.length === 0 ? (
                                        <div className="text-center text-sm text-slate-500 py-8 border-2 border-dashed border-slate-200 rounded-2xl">
                                            Aún no tienes recordatorios. Añade uno arriba.
                                        </div>
                                    ) : (
                                        reminders.map(r => (
                                            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200">
                                                <Switch checked={r.enabled} onCheckedChange={() => toggleReminder(r.id)} />
                                                <div className="flex-1">
                                                    <div className="font-bold font-mono">{r.time}</div>
                                                    <div className="text-sm text-slate-600">{r.label}</div>
                                                </div>
                                                <Button size="icon" variant="ghost" onClick={() => deleteReminder(r.id)} className="rounded-full text-rose-500 hover:bg-rose-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

function StatChip({ label, value, sub, highlight = false }: { label: string; value: number; sub: string; highlight?: boolean }) {
    return (
        <div className={cn('rounded-2xl p-4 border', highlight ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200' : 'bg-white border-green-100')}>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
            <p className="text-xs text-slate-500">{sub}</p>
        </div>
    )
}
