/**
 * Utilidades de audio: voz guía (TTS), gong, vibración
 */

// Text-to-Speech con Web Speech API
export function speak(text: string, options: { rate?: number; pitch?: number; volume?: number; voice?: 'female' | 'male' } = {}) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-ES'
    utterance.rate = options.rate ?? 0.85
    utterance.pitch = options.pitch ?? 1
    utterance.volume = options.volume ?? 0.8

    // Intentar usar voz española natural
    const voices = window.speechSynthesis.getVoices()
    const esVoices = voices.filter(v => v.lang.startsWith('es'))
    if (esVoices.length > 0) {
        const preferred = options.voice === 'male'
            ? esVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('jorge') || v.name.toLowerCase().includes('diego'))
            : esVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('mónica') || v.name.toLowerCase().includes('paulina') || v.name.toLowerCase().includes('lucia'))
        utterance.voice = preferred || esVoices[0]
    }

    window.speechSynthesis.speak(utterance)
}

export function cancelSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
    }
}

// Gong/campana con Web Audio API (sin archivos)
export function playGong(volume = 0.5) {
    if (typeof window === 'undefined') return
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const now = ctx.currentTime

        // Múltiples osciladores para simular gong (frecuencias armónicas)
        const freqs = [220, 330, 440, 660]
        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.type = 'sine'
            osc.frequency.value = freq
            gain.gain.setValueAtTime(0.001, now)
            gain.gain.exponentialRampToValueAtTime(volume / (i + 1), now + 0.05)
            gain.gain.exponentialRampToValueAtTime(0.001, now + 3.5)
            osc.start(now)
            osc.stop(now + 3.5)
        })
    } catch {}
}

// Beep corto para transiciones
export function playBeep(freq = 660, duration = 0.2, volume = 0.2) {
    if (typeof window === 'undefined') return
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.001, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
        osc.start()
        osc.stop(ctx.currentTime + duration)
    } catch {}
}

// Vibración (móvil)
export function vibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
            navigator.vibrate(pattern)
        } catch {}
    }
}

// Pedir permisos de notificación
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') return 'denied'
    if (Notification.permission === 'granted') return 'granted'
    if (Notification.permission === 'denied') return 'denied'
    return await Notification.requestPermission()
}

export function sendNotification(title: string, body: string) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    try {
        new Notification(title, { body, icon: '/favicon.ico', tag: 'meditation' })
    } catch {}
}
