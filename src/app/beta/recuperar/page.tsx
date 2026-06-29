'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, ArrowLeft, AlertCircle } from 'lucide-react';

const ERROR_MSGS: Record<string, string> = {
    invalid:  'El enlace de recuperación no es válido.',
    used:     'Este enlace ya fue utilizado.',
    expired:  'El enlace ha caducado. Solicita uno nuevo.',
};

function RecuperarForm() {
    const params = useSearchParams();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ link: string; expiresAt: string } | null>(null);
    const [error, setError] = useState('');
    const urlError = params?.get('error');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/beta/recover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al solicitar recuperación');
            if (data.hint === 'not_found') {
                setError('No encontramos ninguna cuenta beta con ese email.');
                return;
            }
            setResult({ link: data.link, expiresAt: data.expiresAt });
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
                        <h1 className="font-black text-xl">Recuperar acceso Beta</h1>
                        <p className="text-xs mt-1 opacity-80">
                            Introduce tu email y te generaremos un enlace de acceso directo.
                        </p>
                    </div>

                    <div className="p-5 space-y-4">
                        {urlError && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-3 text-sm text-red-700">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {ERROR_MSGS[urlError] ?? 'El enlace no es válido.'}
                            </div>
                        )}

                        {result ? (
                            <div className="py-4 text-center space-y-3">
                                <div className="text-5xl">✉️</div>
                                <p className="font-black text-slate-800 dark:text-white text-lg">Revisa tu email</p>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    Te hemos enviado un enlace a <b className="text-slate-700 dark:text-slate-200">{email}</b>.
                                    Haz clic en él para establecer tu nueva contraseña.
                                </p>
                                <p className="text-xs text-slate-400">
                                    Válido durante 24 horas. Revisa también la carpeta de spam.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={submit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                        Email con el que te registraste
                                    </label>
                                    <div className="relative mt-1">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="email" required value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="tu@email.com"
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                                            style={{ '--tw-ring-color': '#1a5c2e' } as React.CSSProperties} />
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
                                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                                    </div>
                                )}

                                <button type="submit" disabled={loading}
                                    className="w-full text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity hover:opacity-90"
                                    style={{ background: 'linear-gradient(to right, #1a5c2e, #1e7a3a)' }}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generar enlace de acceso'}
                                </button>

                                <p className="text-xs text-center text-slate-400">
                                    El enlace tiene validez de 24 horas y funciona en cualquier dispositivo.
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function RecuperarPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: '#1a5c2e' }} /></div>}>
            <RecuperarForm />
        </Suspense>
    );
}
