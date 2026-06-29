'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, Zap } from 'lucide-react';

export default function BetaLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/beta/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
            router.replace('/beta/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md space-y-4">
                <Link href="/beta" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                    <ArrowLeft className="w-4 h-4" /> Volver a la Beta
                </Link>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-5 text-white" style={{ background: 'linear-gradient(to right, #1a5c2e, #1e7a3a)' }}>
                        <h1 className="font-black text-xl">Ingresar a la Beta</h1>
                        <p className="text-xs mt-1 opacity-80">
                            Usa el email y contraseña con los que te registraste.
                        </p>
                    </div>

                    <form onSubmit={submit} className="p-5 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                Email
                            </label>
                            <div className="relative mt-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="email" required value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    autoFocus
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                                    style={{ '--tw-ring-color': '#1a5c2e' } as React.CSSProperties}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                Contraseña
                            </label>
                            <div className="relative mt-1">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2"
                                    style={{ '--tw-ring-color': '#1a5c2e' } as React.CSSProperties}
                                />
                                <button type="button" onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading}
                            className="w-full active:scale-[0.98] text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 text-base"
                            style={{
                                background: 'linear-gradient(to right, #1a5c2e, #1e7a3a)',
                                boxShadow: '0 4px 14px rgba(26,92,46,0.25)',
                            }}>
                            {loading
                                ? <Loader2 className="w-5 h-5 animate-spin" />
                                : <><Zap className="w-5 h-5" /> Entrar al panel Beta</>
                            }
                        </button>

                        <p className="text-center text-xs text-slate-400">
                            ¿No recuerdas la contraseña?{' '}
                            <Link href="/beta/recuperar" className="font-semibold hover:underline" style={{ color: '#1a5c2e' }}>
                                Recuperar acceso
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
