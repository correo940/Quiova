'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ChevronLeft, BookOpen, Plus, Trash2, Archive,
    FileText, Zap, Settings, Palette, Scale,
    ChevronDown, ChevronUp, Pencil, Check, X, Sparkles,
} from 'lucide-react';
import { useOficinaRegistros } from '@/hooks/useOficinaRegistros';
import type { BibliotecaItem, CategoriaLibreria } from '@/hooks/useOficinaRegistros';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

const CATEGORIAS: { id: CategoriaLibreria; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'prompts',                 label: 'Prompts Maestros',         icon: Zap,      color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20' },
    { id: 'normas',                  label: 'Normas',                   icon: Scale,    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { id: 'procesos',                label: 'Procesos',                 icon: Settings, color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { id: 'branding',                label: 'Branding',                 icon: Palette,  color: 'text-pink-600 dark:text-pink-400 bg-pink-500/10 border-pink-500/20' },
    { id: 'decisiones-corporativas', label: 'Decisiones Corporativas',  icon: FileText, color: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20' },
];

// ── Detección automática ───────────────────────────────────────────────────────

interface DeteccionResult {
    categoria: CategoriaLibreria;
    titulo: string;
    contenido: string;
    autor: string;
    version: string;
    confianza: 'alta' | 'media' | 'baja';
}

function detectarDatos(texto: string): DeteccionResult {
    const lines = texto.split('\n').map(l => l.trim()).filter(Boolean);
    const textLower = texto.toLowerCase();

    // Buscar cabeceras explícitas estilo "Clave: Valor"
    const buscarCabecera = (patron: RegExp): string | null => {
        for (const line of lines) {
            const m = line.match(patron);
            if (m) return m[1]?.trim() ?? null;
        }
        return null;
    };

    const tituloExplicito = buscarCabecera(/^(?:título|titulo|title|nombre|name)\s*[:：]\s*(.+)/i);
    const categoriaExplicita = buscarCabecera(/^(?:categoría|categoria|category|tipo|type)\s*[:：]\s*(.+)/i);
    const autorExplicito = buscarCabecera(/^(?:autor|author|fuente|source|creado por)\s*[:：]\s*(.+)/i);
    const versionExplicita = buscarCabecera(/^(?:versión|version|ver\.?)\s*[:：]\s*(.+)/i);

    const tieneCabeceras = !!(tituloExplicito ?? categoriaExplicita ?? autorExplicito ?? versionExplicita);

    // ── Categoría ──
    let categoria: CategoriaLibreria = 'normas';
    if (categoriaExplicita) {
        const c = categoriaExplicita.toLowerCase();
        if (/prompt/.test(c))                           categoria = 'prompts';
        else if (/proceso|flujo|workflow/.test(c))      categoria = 'procesos';
        else if (/branding|marca|visual/.test(c))       categoria = 'branding';
        else if (/decisi/.test(c))                      categoria = 'decisiones-corporativas';
        else if (/norm|regla/.test(c))                  categoria = 'normas';
    } else {
        // Detección por palabras clave en el cuerpo
        if (/\b(actúa como|eres un experto|you are a|system prompt|instrucción de sistema|rol:|rol:)\b/i.test(textLower))
            categoria = 'prompts';
        else if (/\b(prompt maestro|prompt de|genera el prompt|usa este prompt)\b/i.test(textLower))
            categoria = 'prompts';
        else if (/\b(proceso|pasos|paso \d|flujo|how to|cómo (?:se )?hace|guía de)\b/i.test(textLower))
            categoria = 'procesos';
        else if (/\b(marca|logo|tipografía|paleta|color (?:principal|secundario)|identidad visual|voz de marca)\b/i.test(textLower))
            categoria = 'branding';
        else if (/\b(decidimos|decisión (?:de|técnica)|porque elegimos|razón:|motivo:|justificación)\b/i.test(textLower))
            categoria = 'decisiones-corporativas';
        else if (/\b(norma|regla|política|siempre|nunca|prohibido|obligatorio|debe(?:mos)?)\b/i.test(textLower))
            categoria = 'normas';
    }

    // ── Título ──
    let titulo = tituloExplicito ?? '';
    if (!titulo) {
        // Primera línea significativa (no cabecera, no muy corta)
        const candidatas = lines.filter(l =>
            l.length > 5 &&
            !/^(?:título|titulo|categoría|categoria|autor|versión|version)\s*[:：]/i.test(l)
        );
        titulo = candidatas[0] ?? 'Nueva entrada';
        if (titulo.length > 100) titulo = titulo.slice(0, 97) + '...';
    }

    // ── Contenido ──
    // Si hay cabeceras explícitas, quitarlas del contenido final
    let contenido = texto;
    if (tieneCabeceras) {
        contenido = lines
            .filter(l => !/^(?:título|titulo|title|nombre|name|categoría|categoria|category|tipo|type|autor|author|fuente|source|creado por|versión|version|ver\.?)\s*[:：]/i.test(l))
            .join('\n')
            .trim();
        if (!contenido) contenido = texto;
    }

    const autor = autorExplicito ?? 'Fundador';
    const version = versionExplicita ?? 'v1.0';

    // Confianza de la detección
    const camposDetectados = [tituloExplicito, categoriaExplicita].filter(Boolean).length;
    const confianza: 'alta' | 'media' | 'baja' =
        camposDetectados >= 2 ? 'alta' : tieneCabeceras || categoria !== 'normas' ? 'media' : 'baja';

    return { categoria, titulo, contenido, autor, version, confianza };
}

// ── Componentes ───────────────────────────────────────────────────────────────

function CategoriaBadge({ categoria }: { categoria: CategoriaLibreria }) {
    const cat = CATEGORIAS.find(c => c.id === categoria);
    if (!cat) return null;
    const Icon = cat.icon;
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cat.color}`}>
            <Icon className="w-3 h-3" />
            {cat.label}
        </span>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BibliotecaPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { biblioteca, crearBibliotecaItem, actualizarBibliotecaItem, eliminarBibliotecaItem } = useOficinaRegistros();

    const [filtro, setFiltro] = useState<CategoriaLibreria | 'todas'>('todas');
    const [expandido, setExpandido] = useState<string | null>(null);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [editContenido, setEditContenido] = useState('');

    // Formulario manual
    const [modoForm, setModoForm] = useState<'ninguno' | 'manual' | 'importar'>('ninguno');
    const [categoria, setCategoria] = useState<CategoriaLibreria>('prompts');
    const [titulo, setTitulo] = useState('');
    const [contenido, setContenido] = useState('');
    const [autor, setAutor] = useState('Fundador');
    const [version, setVersion] = useState('v1.0');

    // Importación rápida
    const [textoImport, setTextoImport] = useState('');
    const [preview, setPreview] = useState<DeteccionResult | null>(null);

    useEffect(() => {
        if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/');
    }, [user, loading, router]);

    if (loading || !user || user.email !== ADMIN_EMAIL) return null;

    const items = filtro === 'todas'
        ? biblioteca.filter(b => b.estado === 'activo')
        : biblioteca.filter(b => b.categoria === filtro && b.estado === 'activo');
    const archivados = biblioteca.filter(b => b.estado === 'archivado');

    const handleCrearManual = () => {
        if (!titulo.trim() || !contenido.trim()) return;
        crearBibliotecaItem({ categoria, titulo: titulo.trim(), contenido: contenido.trim(), autor: autor.trim() || 'Fundador', version: version.trim() || 'v1.0', estado: 'activo' });
        setTitulo(''); setContenido(''); setVersion('v1.0'); setModoForm('ninguno');
    };

    const handleDetectar = () => {
        if (!textoImport.trim()) return;
        setPreview(detectarDatos(textoImport));
    };

    const handleConfirmarImport = () => {
        if (!preview) return;
        crearBibliotecaItem({
            categoria: preview.categoria,
            titulo: preview.titulo,
            contenido: preview.contenido,
            autor: preview.autor,
            version: preview.version,
            estado: 'activo',
        });
        setTextoImport(''); setPreview(null); setModoForm('ninguno');
    };

    const handleGuardarEdit = (id: string) => {
        actualizarBibliotecaItem(id, { contenido: editContenido });
        setEditandoId(null);
    };

    const startEdit = (item: BibliotecaItem) => {
        setEditandoId(item.id); setEditContenido(item.contenido); setExpandido(item.id);
    };

    const cerrarForm = () => {
        setModoForm('ninguno'); setTextoImport(''); setPreview(null);
        setTitulo(''); setContenido('');
    };

    const confianzaColor: Record<string, string> = {
        alta:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        media: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        baja:  'bg-red-500/10 text-red-600 dark:text-red-400',
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24 space-y-6 animate-in fade-in duration-500">
            <Link href="/apps/oficina" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" /> Oficina
            </Link>

            {/* Header */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-xl">
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 60% 40%, #6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="relative flex items-end justify-between gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <BookOpen className="w-3.5 h-3.5" /> Biblioteca Corporativa
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Conocimiento<br />Permanente</h1>
                        <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                            Prompts, normas, procesos y decisiones consultables por todos los directores.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                            onClick={() => setModoForm(modoForm === 'importar' ? 'ninguno' : 'importar')}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border transition-colors ${
                                modoForm === 'importar'
                                    ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                                    : 'bg-white/10 hover:bg-white/15 text-white border-white/20'
                            }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            Importar
                        </button>
                        <button
                            onClick={() => setModoForm(modoForm === 'manual' ? 'ninguno' : 'manual')}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border transition-colors ${
                                modoForm === 'manual'
                                    ? 'bg-white/20 text-white border-white/40'
                                    : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                            }`}
                        >
                            <Plus className="w-4 h-4" />
                            Manual
                        </button>
                    </div>
                </div>
                <div className="relative mt-5 flex items-center gap-4 text-xs text-slate-500">
                    <span>{biblioteca.filter(b => b.estado === 'activo').length} entradas activas</span>
                    <span>·</span>
                    <span>{CATEGORIAS.length} categorías</span>
                </div>
            </div>

            {/* ── Importación Rápida ── */}
            {modoForm === 'importar' && (
                <div className="bg-card border border-violet-500/30 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-3 bg-violet-500/5 border-b border-violet-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-violet-500" />
                            <p className="text-sm font-bold">Importación Rápida</p>
                            <span className="text-[10px] text-muted-foreground/60">Pega cualquier texto y el sistema detecta los campos</span>
                        </div>
                        <button onClick={cerrarForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                    </div>

                    {!preview ? (
                        <div className="p-5 space-y-4">
                            <textarea
                                value={textoImport}
                                onChange={e => setTextoImport(e.target.value)}
                                placeholder={`Pega aquí el texto completo de ChatGPT, Claude, Gemini o cualquier fuente.\n\nEjemplos que funcionan bien:\n• Un prompt maestro copiado\n• Una norma de estilo escrita\n• Un proceso documentado\n• Una decisión técnica explicada\n\nTambién puedes incluir cabeceras explícitas como:\nTítulo: Mi prompt maestro\nCategoría: Prompts`}
                                rows={10}
                                className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500/50 resize-y leading-relaxed font-mono"
                            />
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-muted-foreground/60">
                                    {textoImport.trim().split(/\s+/).filter(Boolean).length} palabras · {textoImport.length} caracteres
                                </p>
                                <button
                                    onClick={handleDetectar}
                                    disabled={textoImport.trim().length < 10}
                                    className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 bg-violet-600 text-white rounded-xl disabled:opacity-40 hover:bg-violet-500 transition-colors"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Detectar y previsualizar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-5 space-y-4">
                            {/* Confianza */}
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${confianzaColor[preview.confianza]}`}>
                                    Confianza: {preview.confianza}
                                </span>
                                <p className="text-xs text-muted-foreground/60">
                                    {preview.confianza === 'alta' && 'Campos detectados explícitamente en el texto.'}
                                    {preview.confianza === 'media' && 'Categoría o título inferidos por palabras clave.'}
                                    {preview.confianza === 'baja' && 'Revisa y ajusta los valores antes de guardar.'}
                                </p>
                            </div>

                            {/* Campos editables del preview */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Categoría */}
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categoría detectada</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORIAS.map(cat => {
                                            const Icon = cat.icon;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setPreview(p => p ? { ...p, categoria: cat.id } : p)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                                        preview.categoria === cat.id ? cat.color + ' border-current' : 'border-border/40 text-muted-foreground hover:bg-muted/40'
                                                    }`}
                                                >
                                                    <Icon className="w-3 h-3" />
                                                    {cat.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Título */}
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Título</label>
                                    <input
                                        type="text"
                                        value={preview.titulo}
                                        onChange={e => setPreview(p => p ? { ...p, titulo: e.target.value } : p)}
                                        className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border"
                                    />
                                </div>

                                {/* Autor + Versión */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Autor</label>
                                    <input
                                        type="text"
                                        value={preview.autor}
                                        onChange={e => setPreview(p => p ? { ...p, autor: e.target.value } : p)}
                                        className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Versión</label>
                                    <input
                                        type="text"
                                        value={preview.version}
                                        onChange={e => setPreview(p => p ? { ...p, version: e.target.value } : p)}
                                        className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border"
                                    />
                                </div>

                                {/* Contenido */}
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contenido</label>
                                    <textarea
                                        value={preview.contenido}
                                        onChange={e => setPreview(p => p ? { ...p, contenido: e.target.value } : p)}
                                        rows={6}
                                        className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-border resize-y leading-relaxed font-mono"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between gap-2 pt-1">
                                <button
                                    onClick={() => setPreview(null)}
                                    className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl hover:bg-muted/40 transition-colors"
                                >
                                    ← Volver a editar texto
                                </button>
                                <div className="flex gap-2">
                                    <button onClick={cerrarForm} className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl hover:bg-muted/40 transition-colors">
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirmarImport}
                                        disabled={!preview.titulo.trim() || !preview.contenido.trim()}
                                        className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2 bg-violet-600 text-white rounded-xl disabled:opacity-40 hover:bg-violet-500 transition-colors"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Guardar en Biblioteca
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Formulario Manual ── */}
            {modoForm === 'manual' && (
                <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm divide-y divide-border/30">
                    <div className="px-5 py-3 flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nueva entrada manual</p>
                        <button onClick={cerrarForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {CATEGORIAS.map(cat => {
                                const Icon = cat.icon;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setCategoria(cat.id)}
                                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                                            categoria === cat.id ? cat.color + ' border-current' : 'border-border/40 text-muted-foreground hover:bg-muted/40'
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                        {cat.label}
                                    </button>
                                );
                            })}
                        </div>
                        <input
                            type="text"
                            placeholder="Título *"
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                            className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border"
                        />
                        <textarea
                            placeholder="Contenido completo *"
                            value={contenido}
                            onChange={e => setContenido(e.target.value)}
                            rows={6}
                            className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-border resize-none leading-relaxed font-mono"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input type="text" placeholder="Autor" value={autor} onChange={e => setAutor(e.target.value)} className="bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border" />
                            <input type="text" placeholder="Versión (ej: v1.0)" value={version} onChange={e => setVersion(e.target.value)} className="bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-border" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={cerrarForm} className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl hover:bg-muted/40 transition-colors">Cancelar</button>
                            <button
                                onClick={handleCrearManual}
                                disabled={!titulo.trim() || !contenido.trim()}
                                className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2 bg-indigo-600 text-white rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Filtros ── */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                    onClick={() => setFiltro('todas')}
                    className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${filtro === 'todas' ? 'bg-foreground text-background border-foreground' : 'border-border/50 text-muted-foreground hover:bg-muted/40'}`}
                >
                    Todas ({biblioteca.filter(b => b.estado === 'activo').length})
                </button>
                {CATEGORIAS.map(cat => {
                    const count = biblioteca.filter(b => b.categoria === cat.id && b.estado === 'activo').length;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setFiltro(cat.id)}
                            className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${filtro === cat.id ? 'bg-foreground text-background border-foreground' : 'border-border/50 text-muted-foreground hover:bg-muted/40'}`}
                        >
                            {cat.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* ── Lista de items ── */}
            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/40 rounded-2xl text-center gap-3">
                    <BookOpen className="w-10 h-10 text-muted-foreground/30" />
                    <p className="font-semibold text-muted-foreground">Sin entradas en esta categoría</p>
                    <p className="text-xs text-muted-foreground/60">Usa "Importar" para pegar texto o "Manual" para crear una entrada</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map(item => (
                        <div key={item.id} className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-5 py-4 flex items-start justify-between gap-3">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <CategoriaBadge categoria={item.categoria} />
                                        <span className="text-[10px] text-muted-foreground/60">{item.version} · {item.autor} · {item.fechaActualizacion.slice(0, 10)}</span>
                                    </div>
                                    <p className="font-bold text-sm leading-snug">{item.titulo}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => startEdit(item)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors" title="Editar contenido">
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => actualizarBibliotecaItem(item.id, { estado: 'archivado' })} className="p-2 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors" title="Archivar">
                                        <Archive className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => eliminarBibliotecaItem(item.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setExpandido(expandido === item.id ? null : item.id)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors">
                                        {expandido === item.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                            {expandido === item.id && (
                                <div className="border-t border-border/30 p-5">
                                    {editandoId === item.id ? (
                                        <div className="space-y-3">
                                            <textarea
                                                value={editContenido}
                                                onChange={e => setEditContenido(e.target.value)}
                                                rows={8}
                                                className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-border resize-y leading-relaxed font-mono"
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => setEditandoId(null)} className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/40 transition-colors">Cancelar</button>
                                                <button onClick={() => handleGuardarEdit(item.id)} className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">
                                                    <Check className="w-3.5 h-3.5" /> Guardar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <pre className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed font-mono bg-muted/20 p-4 rounded-xl">{item.contenido}</pre>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Archivados ── */}
            {archivados.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1">Archivados ({archivados.length})</p>
                    {archivados.map(item => (
                        <div key={item.id} className="px-5 py-3 bg-muted/20 border border-border/30 rounded-xl flex items-center justify-between gap-3 opacity-50">
                            <div className="flex items-center gap-3">
                                <CategoriaBadge categoria={item.categoria} />
                                <p className="text-xs text-muted-foreground line-through">{item.titulo}</p>
                            </div>
                            <button onClick={() => actualizarBibliotecaItem(item.id, { estado: 'activo' })} className="text-[10px] font-bold text-muted-foreground hover:text-foreground">Restaurar</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
