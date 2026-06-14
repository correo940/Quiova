'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

type WorkSessionContextType = {
    isRunning: boolean
    elapsedSec: number
    startSession: () => void
    stopSession: () => void
    triggerBreak: (type: 'eyes' | 'body' | 'water') => void
}

const WorkSessionContext = createContext<WorkSessionContextType | undefined>(undefined)

export function WorkSessionProvider({ children }: { children: React.ReactNode }) {
    const [isRunning, setIsRunning] = useState(false)
    const [elapsedSec, setElapsedSec] = useState(0)
    const [settings, setSettings] = useState({ eyeIntervalMin: 20, bodyIntervalMin: 50, waterIntervalMin: 60, soundEnabled: true, notificationsEnabled: true })

    const lastEyeTriggerRef = useRef(0)
    const lastBodyTriggerRef = useRef(0)
    const lastWaterTriggerRef = useRef(0)

    // Cargar config
    useEffect(() => {
        try {
            const s = localStorage.getItem('pausas-activas-settings')
            if (s) setSettings({ ...settings, ...JSON.parse(s) })
        } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Timer principal
    useEffect(() => {
        if (!isRunning) return
        const id = setInterval(() => setElapsedSec(s => s + 1), 1000)
        return () => clearInterval(id)
    }, [isRunning])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [elapsedSec, isRunning, settings])

    const startSession = () => {
        setIsRunning(true)
        lastEyeTriggerRef.current = elapsedSec / 60
        lastBodyTriggerRef.current = elapsedSec / 60
        lastWaterTriggerRef.current = elapsedSec / 60
        toast.success('¡Sesión iniciada!', { description: 'Tus pausas están activas en background.' })
        // Solicitar permiso de notificaciones
        if (settings.notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission()
        }
    }

    const stopSession = () => {
        setIsRunning(false)
        setElapsedSec(0)
        toast('Sesión finalizada', { description: 'Buen trabajo hoy. Descansa y desconecta.' })
    }

    const playBeep = () => {
        if (!settings.soundEnabled) return
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.value = 880
            gain.gain.setValueAtTime(0.001, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
            osc.start()
            osc.stop(ctx.currentTime + 0.6)
        } catch {}
    }

    const triggerBreak = (type: 'eyes' | 'body' | 'water') => {
        playBeep()
        let title = ''
        if (type === 'eyes') title = '👀 Pausa visual — mira lejos 20 segundos'
        else if (type === 'water') title = '💧 Hora de beber agua'
        else title = '🧘 Pausa activa — muévete un poco'

        toast(title, { duration: 8000 })

        if (settings.notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
                new Notification(title, { icon: '/favicon.ico', tag: 'pausas-activas' })
            } catch {}
        }
    }

    return (
        <WorkSessionContext.Provider value={{ isRunning, elapsedSec, startSession, stopSession, triggerBreak }}>
            {children}
        </WorkSessionContext.Provider>
    )
}

export function useWorkSession() {
    const ctx = useContext(WorkSessionContext)
    if (!ctx) throw new Error('useWorkSession debe usarse dentro de WorkSessionProvider')
    return ctx
}
