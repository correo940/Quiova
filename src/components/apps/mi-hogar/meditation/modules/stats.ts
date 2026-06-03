import { differenceInCalendarDays, parseISO, format } from 'date-fns'
import { ACHIEVEMENTS, type Achievement } from './data'

export type SessionEntry = {
    id: string
    createdAt: string
    duration: number
    mood: string | null
    technique?: string
}

export function calculateStreak(sessions: SessionEntry[]): number {
    if (sessions.length === 0) return 0

    // Obtener fechas únicas (YYYY-MM-DD)
    const uniqueDays = Array.from(new Set(
        sessions.map(s => format(parseISO(s.createdAt), 'yyyy-MM-dd'))
    )).sort().reverse()

    if (uniqueDays.length === 0) return 0

    const today = format(new Date(), 'yyyy-MM-dd')
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')

    // La racha solo cuenta si la última sesión es hoy o ayer
    if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0

    let streak = 1
    for (let i = 1; i < uniqueDays.length; i++) {
        const diff = differenceInCalendarDays(parseISO(uniqueDays[i - 1]), parseISO(uniqueDays[i]))
        if (diff === 1) streak++
        else break
    }
    return streak
}

export function getUnlockedAchievements(sessions: SessionEntry[]): Achievement[] {
    const totalMinutes = Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / 60)
    const streak = calculateStreak(sessions)
    return ACHIEVEMENTS.filter(a => a.check({ sessions: sessions.length, totalMinutes, streak }))
}

export function getMoodHistory(entries: { createdAt: string; mood: string }[], days = 7) {
    const result: { date: string; mood: string | null; label: string }[] = []
    const moodScale: Record<string, number> = {
        cansado: 1,
        saturado: 2,
        sereno: 3,
        agradecido: 4,
        enfocado: 5
    }
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000)
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayEntries = entries.filter(e => e.createdAt.startsWith(dateStr))
        const lastMood = dayEntries[dayEntries.length - 1]?.mood || null
        result.push({
            date: dateStr,
            mood: lastMood,
            label: format(date, 'EEE').toUpperCase()
        })
    }
    return result.map(r => ({ ...r, value: r.mood ? moodScale[r.mood] || 3 : 0 }))
}
