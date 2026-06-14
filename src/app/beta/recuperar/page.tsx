'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, ArrowLeft, Copy, CheckCircle, AlertCircle } from 'lucide-react';

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
    const [copied, setCopied] = useState(false);

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

    const copy = async () => {
        if (!result) return;
        await navigator.clipboard.writeText(result.link).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md space-y-4">
                <Link href="/beta" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                    <ArrowLeft className="w-4 h-4" /> Volver a la Beta
                </Link>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-5 text-white">
                        <h1 className="font-black text-xl">Recuperar acceso Beta</h1>
                        <p className="text-emerald-100 text-xs mt-1">
                            Introduce tu email y te generaremos un enlace de acceso directo.
                        </p>
                    </div>

                    <div className="p-5 space-y-4">
                        {/* Error de URL (token inválido/caducado/usado) */}
                        {urlError && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-3 text-sm text-red-700">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {ERROR_MSGS[urlError] ?? 'El enlace no es válido.'}
                            </div>
                        )}

                        {result ? (
                            /* ── Enlace generado ── */
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-3">
                                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <p className="text-sm text-emerald-700 font-semibold">
                                        Enlace generado correctamente
                                    </p>
                                </div>

                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Hemos intentado enviarlo a tu email. Si no lo recibes, usa el enlace directo de abajo.
                                    Válido hasta:{' '}
                                    <b>{new Date(result.expiresAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</b>
                                </p>

                                <div className="flex gap-2">
                                    <input readOnly value={result.link}
                                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-600 dark:text-slate-300 min-w-0" />
                                    <button onClick={copy}
                                        className="shrink-0 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-xs font-bold">
                                        {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? '¡Copiado!' : 'Copiar'}
                                    </button>
                                </div>

                                <a href={result.link}
                                    className="w-full flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-all">
                                    Acceder directamente →
                                </a>

                                <p className="text-xs text-center text-slate-400">
                                    Guarda este enlace para acceder desde cualquier dispositivo.
                                </p>
                            </div>
                        ) : (
                            /* ── Formulario de email ── */
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
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
                                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                                    </div>
                                )}

                                <button type="submit" disabled={loading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
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
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>}>
            <RecuperarForm />
        </Suspense>
    );
}
