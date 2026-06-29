'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';

function NuevaContrasenaForm() {
    const router = useRouter();
    const params = useSearchParams();
    const token = params?.get('token') ?? '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    if (!token) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="text-center space-y-3">
                    <p className="text-red-600 font-semibold">Enlace no válido.</p>
                    <Link href="/beta/recuperar" className="text-sm font-bold hover:underline" style={{ color: '#1a5c2e' }}>
                        Solicitar nuevo enlace →
                    </Link>
                </div>
            </div>
        );
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
        if (password.length < 8) { setError('Mínimo 8 caracteres'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/beta/nueva-contrasena', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al actualizar');
            setDone(true);
            setTimeout(() => router.replace('/beta/dashboard'), 2000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md space-y-4">
                <Link href="/beta" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
                    <ArrowLeft className="w-4 h-4" /> Volver a la Beta
                </Link>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-5 text-white" style={{ background: 'linear-gradient(to right, #1a5c2e, #1e7a3a)' }}>
                        <h1 className="font-black text-xl">Nueva contraseña</h1>
                        <p className="text-xs mt-1 opacity-80">Elige una contraseña para acceder a la Beta.</p>
                    </div>

                    <div className="p-5">
                        {done ? (
                            <div className="py-6 text-center space-y-3">
                                <CheckCircle className="w-12 h-12 mx-auto" style={{ color: '#1a5c2e' }} />
                                <p className="font-black text-slate-800 text-lg">¡Contraseña actualizada!</p>
                                <p className="text-sm text-slate-500">Entrando a tu panel...</p>
                            </div>
                        ) : (
                            <form onSubmit={submit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Nueva contraseña</label>
                                    <div className="relative mt-1">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required minLength={8} value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Mínimo 8 caracteres"
                                            autoFocus
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2"
                                            style={{ '--tw-ring-color': '#1a5c2e' } as React.CSSProperties}
                                        />
                                        <button type="button" onClick={() => setShowPassword(v => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Confirmar contraseña</label>
                                    <div className="relative mt-1">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required minLength={8} value={confirm}
                                            onChange={e => setConfirm(e.target.value)}
                                            placeholder="Repite la contraseña"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                                            style={{ '--tw-ring-color': '#1a5c2e' } as React.CSSProperties}
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                                        {error}
                                    </div>
                                )}

                                <button type="submit" disabled={loading}
                                    className="w-full text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity hover:opacity-90"
                                    style={{ background: 'linear-gradient(to right, #1a5c2e, #1e7a3a)' }}>
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar y entrar al panel'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function NuevaContrasenaPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: '#1a5c2e' }} /></div>}>
            <NuevaContrasenaForm />
        </Suspense>
    );
}
