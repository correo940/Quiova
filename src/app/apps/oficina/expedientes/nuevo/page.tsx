'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useOficinaRegistros } from '@/hooks/useOficinaRegistros';
import Link from 'next/link';
import { ChevronLeft, FolderOpen, Send } from 'lucide-react';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

const DIRECTORES = [
    { id: 'director', label: 'Director General' },
    { id: 'jefe-gabinete', label: 'Jefe de Gabinete' },
    { id: 'director-contenido', label: 'Director de Contenido' },
    { id: 'director-crecimiento', label: 'Director de Crecimiento' },
    { id: 'director-tecnico', label: 'Director Técnico' },
    { id: 'consejo-estrategico', label: 'Consejo Estratégico' },
];

export default function NuevoExpedientePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { crearExpediente } = useOficinaRegistros();

    const [titulo, setTitulo] = useState('');
    const [resumen, setResumen] = useState('');
    const [conversacion, setConversacion] = useState('');
    const [director, setDirector] = useState('director');
    const [guardando, setGuardando] = useState(false);

    if (loading) return null;
    if (!user || user.email !== ADMIN_EMAIL) {
        router.replace('/');
        return null;
    }

    const puedeGuardar = titulo.trim() && resumen.trim();

    const handleGuardar = () => {
        if (!puedeGuardar || guardando) return;
        setGuardando(true);
        crearExpediente({
            titulo: titulo.trim(),
            resumen: resumen.trim(),
            conversacionOriginal: conversacion.trim(),
            estado: 'pendiente',
            directorRevisor: director,
        });
        router.push('/apps/oficina/director');
    };

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-6 pb-24 space-y-6 animate-in fade-in duration-500">
            <Link href="/apps/oficina" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" /> Oficina
            </Link>

            {/* Header */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-8 shadow-xl">
                <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 40% 50%, #6366f1 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
                <div className="relative space-y-3">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-400/70 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                        <FolderOpen className="w-3.5 h-3.5" /> Nuevo Expediente
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Abrir Expediente</h1>
                    <p className="text-indigo-200/50 text-xs font-mono">
                        Un expediente es un asunto importante que queda registrado en la empresa.
                    </p>
                </div>
            </div>

            {/* Formulario */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm divide-y divide-border/30">

                {/* Título */}
                <div className="p-5 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Título del Expediente *
                    </label>
                    <input
                        type="text"
                        placeholder="Ej: Creación de serie de vídeos sobre ciclos circadianos"
                        value={titulo}
                        onChange={e => setTitulo(e.target.value)}
                        className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-border transition-colors"
                    />
                </div>

                {/* Resumen */}
                <div className="p-5 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Resumen Ejecutivo *
                    </label>
                    <p className="text-xs text-muted-foreground/70">
                        En 2-3 frases: qué se decidió, por qué importa y qué efecto tiene.
                    </p>
                    <textarea
                        placeholder="Ej: Se decidió crear una serie de 5 vídeos cortos sobre cronobiología y sueño para TikTok. El objetivo es posicionar Quioba en salud y cuerpo antes de Q3."
                        value={resumen}
                        onChange={e => setResumen(e.target.value)}
                        rows={3}
                        className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-border transition-colors resize-none leading-relaxed"
                    />
                </div>

                {/* Conversación original */}
                <div className="p-5 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Conversación Original
                    </label>
                    <p className="text-xs text-muted-foreground/70">
                        Opcional. Pega aquí la conversación de ChatGPT, Claude u otra fuente donde se tomó esta decisión.
                    </p>
                    <textarea
                        placeholder="Pega aquí la conversación completa..."
                        value={conversacion}
                        onChange={e => setConversacion(e.target.value)}
                        rows={6}
                        className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-border transition-colors resize-none leading-relaxed font-mono text-xs"
                    />
                </div>

                {/* Director Revisor */}
                <div className="p-5 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Entregar a
                    </label>
                    <select
                        value={director}
                        onChange={e => setDirector(e.target.value)}
                        className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-border transition-colors"
                    >
                        {DIRECTORES.map(d => (
                            <option key={d.id} value={d.id}>{d.label}</option>
                        ))}
                    </select>
                </div>

                {/* Acción */}
                <div className="p-5 flex justify-end">
                    <button
                        onClick={handleGuardar}
                        disabled={!puedeGuardar || guardando}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl disabled:opacity-40 transition-all active:scale-95"
                    >
                        <Send className="w-4 h-4" />
                        Abrir Expediente
                    </button>
                </div>
            </div>
        </div>
    );
}
