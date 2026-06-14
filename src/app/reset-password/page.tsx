'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { translateAuthError } from '@/lib/utils'
import { Lock, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

function ResetPasswordForm() {
    const params = useSearchParams()
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [ready, setReady] = useState(false)
    const [done, setDone] = useState(false)

    useEffect(() => {
        const code = params?.get('code')
        if (code) {
            supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
                if (error) setError('Enlace inválido o expirado. Solicita uno nuevo.')
                else setReady(true)
            })
        } else {
            // Flujo implícito: Supabase pone el token en el hash
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
                if (event === 'PASSWORD_RECOVERY') setReady(true)
            })
            return () => subscription.unsubscribe()
        }
    }, [params])

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error
            setDone(true)
            setTimeout(() => router.replace('/login'), 2500)
        } catch (err: any) {
            setError(translateAuthError(err.message))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'radial-gradient(circle at top center, #f0fff4 0%, #f9fafb 40%, #ffffff 100%)' }}>
            <div className="w-full max-w-md rounded-[2.5rem] p-10"
                style={{
                    background: 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(16,185,129,0.15)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
                }}>
                <h2 className="text-2xl font-bold text-center mb-2" style={{ color: '#064e3b' }}>
                    {done ? '¡Contraseña actualizada!' : 'Nueva contraseña'}
                </h2>

                {done ? (
                    <div className="text-center space-y-4 mt-6">
                        <div className="text-5xl">✅</div>
                        <p className="text-sm" style={{ color: '#6b7280' }}>Redirigiendo al inicio de sesión…</p>
                    </div>
                ) : error && !ready ? (
                    <div className="mt-6 text-center space-y-4">
                        <p className="p-4 rounded-2xl text-sm border" style={{ background: '#fef2f2', borderColor: '#fee2e2', color: '#b91c1c' }}>{error}</p>
                        <Link href="/login" className="text-sm font-semibold hover:underline" style={{ color: '#228b22' }}>Volver al login</Link>
                    </div>
                ) : !ready ? (
                    <p className="text-center text-sm mt-6" style={{ color: '#6b7280' }}>Verificando enlace…</p>
                ) : (
                    <form onSubmit={handleReset} className="space-y-6 mt-8">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold tracking-wider uppercase ml-1" style={{ color: '#065f46' }}>
                                Nueva contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9ca3af' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    minLength={8}
                                    required
                                    autoFocus
                                    placeholder="Mínimo 8 caracteres"
                                    className="w-full rounded-2xl py-4 pl-12 pr-12 text-sm outline-none"
                                    style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' }}
                                    onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.1)' }}
                                    onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                                />
                                <button type="button" onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1" style={{ color: '#9ca3af' }}>
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-2xl text-sm text-center border font-medium"
                                style={{ background: '#fef2f2', borderColor: '#fee2e2', color: '#b91c1c' }}>
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading}
                            className="w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #228b22 0%, #1a6d1a 100%)', color: '#ffffff' }}>
                            {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-sm text-gray-500">Cargando…</p>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    )
}
