'use client'

import React from 'react'
import Link from 'next/link'
import { useWorkSession } from '@/context/work-session-context'
import { Button } from '@/components/ui/button'
import { Pause, Play, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function WorkSessionWidget() {
    const { isRunning, elapsedSec, startSession, stopSession } = useWorkSession()

    if (!isRunning) return null

    const formatTime = (sec: number) => {
        const h = Math.floor(sec / 3600)
        const m = Math.floor((sec % 3600) / 60)
        const s = sec % 60
        return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`
    }

    return (
        <div className="fixed bottom-4 right-4 z-40 animate-in slide-in-from-bottom-4 duration-300">
            <Link href="/apps/pausas-activas" className="block">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow-xl p-3 sm:p-4 min-w-[180px] hover:shadow-2xl transition-all hover:scale-105 cursor-pointer">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                            <div className="text-xs font-bold uppercase tracking-widest opacity-90">Sesión activa</div>
                            <div className="text-2xl sm:text-3xl font-mono font-bold tabular-nums">{formatTime(elapsedSec)}</div>
                        </div>
                        <div className="flex gap-1 flex-col">
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    if (isRunning) stopSession()
                                }}
                                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                            >
                                <Pause className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="text-xs mt-2 opacity-80">Haz clic para más opciones</div>
                </div>
            </Link>
        </div>
    )
}
