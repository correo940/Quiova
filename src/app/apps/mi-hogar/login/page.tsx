'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Lock, Mail, Loader2, Home, Eye, EyeOff } from 'lucide-react'
import { translateAuthError } from '@/lib/utils'

const AUTH_TIMEOUT_MS = 20000

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const mode = 'signin' as const
    const [showPassword, setShowPassword] = useState(false)
    const [forgotMode, setForgotMode] = useState(false)
    const [forgotSent, setForgotSent] = useState(false)
    const router = useRouter()

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })
            if (error) throw error
            setForgotSent(true)
        } catch (err: any) {
            setError(translateAuthError(err.message))
        } finally {
            setLoading(false)
        }
    }

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const result = await Promise.race([
                supabase.auth.signInWithPassword({
                    email,
                    password,
                }),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('La conexión está tardando más de lo normal. Inténtalo de nuevo.')), AUTH_TIMEOUT_MS)
                ),
            ])
            const { error } = result
            if (error) throw error
            router.replace('/apps/mi-hogar')
        } catch (err: any) {
            setError(translateAuthError(err.message))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-card rounded-2xl p-8 shadow-2xl border border-border"
            >
                <div className="flex justify-center mb-8">
                    <div className="p-4 bg-primary/20 rounded-full">
                        <Home className="w-8 h-8 text-primary" />
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-center text-foreground mb-2">
                    {mode === 'signin' ? 'Bienvenido a Mi Hogar' : 'Crear Cuenta'}
                </h2>
                <p className="text-muted-foreground text-center mb-8">
                    {mode === 'signin'
                        ? 'Ingresa tus credenciales para continuar'
                        : 'Regístrate para gestionar tu hogar'}
                </p>

                {forgotMode ? (
                    <div className="space-y-4">
                        {forgotSent ? (
                            <div className="text-center py-4 space-y-3">
                                <div className="text-4xl">✉️</div>
                                <p className="text-sm text-foreground">
                                    Enlace enviado a <b>{email}</b>. Revisa tu bandeja de entrada.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleForgot} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                            className="w-full bg-input border border-input rounded-lg py-3 pl-10 pr-4 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                            placeholder="tu@email.com" required autoFocus />
                                    </div>
                                </div>
                                {error && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm text-center">{error}</div>}
                                <button type="submit" disabled={loading}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar enlace'}
                                </button>
                            </form>
                        )}
                        <button onClick={() => { setForgotMode(false); setForgotSent(false); setError(null) }}
                            className="w-full text-sm text-center text-muted-foreground hover:text-foreground">
                            ← Volver al inicio de sesión
                        </button>
                    </div>
                ) : (
                <>
                <form onSubmit={handleAuth} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-input border border-input rounded-lg py-3 pl-10 pr-4 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                placeholder="tu@email.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground">Contraseña</label>
                            <button type="button" onClick={() => { setForgotMode(true); setError(null) }}
                                className="text-xs font-semibold text-primary hover:underline">
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-input border border-input rounded-lg py-3 pl-10 pr-12 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="mt-6 text-center space-y-2">
                    <p className="text-xs text-muted-foreground">¿No tienes cuenta?</p>
                    <Link href="/beta" className="inline-block text-sm font-semibold text-primary hover:underline">
                        Únete al programa Beta →
                    </Link>
                </div>
                </>
                )}
            </motion.div>
        </div>
    )
}
