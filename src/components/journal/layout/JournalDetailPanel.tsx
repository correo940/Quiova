'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Book,
    Trash2,
    ChevronDown,
    ExternalLink,
    Pin,
    Link as LinkIcon,
    Calendar,
    Smartphone,
    Globe,
    PenLine,
    Mic,
    Copy,
    Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import ImageExtension from '@tiptap/extension-image';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface JournalEntry {
    id: string;
    entry_type: 'note' | 'book' | 'article' | 'webpage' | 'document';
    metadata: any;
    content?: any;
    updated_at: string;
    created_at?: string;
    context_id?: string;
    tags?: string[];
}

interface JournalDetailPanelProps {
    entry: JournalEntry | null;
    onUpdateEntry: () => void;
    onDeleteEntry: (id: string) => void;
    allEntries?: JournalEntry[];
}

type Category = 'cuerpo' | 'mente' | 'finanzas' | null;

const CATEGORY_META: Record<NonNullable<Category>, { label: string; bg: string; bgSoft: string; text: string; logo: string; route: string }> = {
    cuerpo: { label: 'Cuerpo', bg: 'bg-quioba-cuerpo', bgSoft: 'bg-quioba-cuerpo/10', text: 'text-quioba-cuerpo', logo: '/images/logo-cuerpo.png', route: '/cuerpo' },
    mente: { label: 'Mente', bg: 'bg-quioba-mente', bgSoft: 'bg-quioba-mente/10', text: 'text-quioba-mente', logo: '/images/logo-mente.png', route: '/mente' },
    finanzas: { label: 'Finanzas', bg: 'bg-quioba-finanzas', bgSoft: 'bg-quioba-finanzas/10', text: 'text-quioba-finanzas', logo: '/images/logo-finanzas.png', route: '/finanzas' },
};

function getCategory(entry: JournalEntry): Category {
    const cat = entry.metadata?.category;
    if (cat === 'cuerpo' || cat === 'mente' || cat === 'finanzas') return cat;
    return null;
}

function getSourceInfo(entry: JournalEntry): { label: string; icon: any } {
    const src = entry.metadata?.source;
    if (src === 'apk' || src === 'mobile') return { label: 'Apuntes (móvil)', icon: Smartphone };
    if (src === 'web' || src === 'webpage') return { label: 'Recorte web', icon: Globe };
    if (src === 'audio') return { label: 'Audio', icon: Mic };
    if (entry.entry_type === 'webpage') return { label: 'Página web', icon: Globe };
    return { label: 'Manual', icon: PenLine };
}

export function JournalDetailPanel({ entry, onUpdateEntry, onDeleteEntry, allEntries = [] }: JournalDetailPanelProps) {
    const router = useRouter();
    const [metaOpen, setMetaOpen] = useState(false);
    const [linksOpen, setLinksOpen] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [isSavingContent, setIsSavingContent] = useState(false);
    const saveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const isLoadingRef = React.useRef(false);

    const editor = useEditor({
        extensions: [StarterKit, TextStyle, Color, Highlight.configure({ multicolor: true }), Underline, ImageExtension],
        content: '',
        editorProps: {
            attributes: {
                class: 'prose prose-base dark:prose-invert max-w-none focus:outline-none p-5 text-[15px] leading-relaxed min-h-[300px]',
            },
        },
        onUpdate: () => { },
        immediatelyRender: false,
    });

    useEffect(() => {
        if (!editor) return;
        if (entry?.content) {
            isLoadingRef.current = true;
            editor.commands.setContent(entry.content);
            isLoadingRef.current = false;
        } else {
            isLoadingRef.current = true;
            editor.commands.setContent('');
            isLoadingRef.current = false;
        }
    }, [entry?.id, editor]);

    useEffect(() => {
        if (entry) {
            setFormData({
                entry_type: entry.entry_type || 'note',
                title: entry.metadata?.title || '',
                author: entry.metadata?.author || '',
                date: entry.metadata?.date || '',
                url: entry.metadata?.url || '',
                publication: entry.metadata?.publication || '',
                category: entry.metadata?.category || 'none',
                source: entry.metadata?.source || '',
            });
        }
    }, [entry?.id]);

    // Backlinks: notas que mencionan [[título]] de esta nota
    const backlinks = useMemo(() => {
        if (!entry?.metadata?.title) return [];
        const title = entry.metadata.title.toLowerCase();
        const pattern = new RegExp(`\\[\\[${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'i');
        return allEntries.filter(e => {
            if (e.id === entry.id) return false;
            const text = JSON.stringify(e.content || {}).toLowerCase();
            return pattern.test(text);
        });
    }, [entry, allEntries]);

    // Stats para estado vacío (siempre al top-level)
    const emptyStats = useMemo(() => {
        const total = allEntries.length;
        const byCat: Record<'cuerpo' | 'mente' | 'finanzas', number> = { cuerpo: 0, mente: 0, finanzas: 0 };
        const untitled = allEntries.filter(e => !e.metadata?.title).length;
        const now = new Date();
        const thisMonth = allEntries.filter(e => {
            const d = new Date(e.updated_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
        allEntries.forEach(e => {
            const c = e.metadata?.category;
            if (c === 'cuerpo') byCat.cuerpo++;
            else if (c === 'mente') byCat.mente++;
            else if (c === 'finanzas') byCat.finanzas++;
        });
        return { total, byCat, untitled, thisMonth };
    }, [allEntries]);

    const saveContent = useCallback(async () => {
        if (!entry || !editor) return;
        setIsSavingContent(true);
        const content = editor.getJSON();
        const firstNode = (content.content as any[])?.[0];
        const title = (firstNode?.type === 'heading' && firstNode.attrs?.level === 1)
            ? (firstNode.content?.map((n: any) => n.text || '').join('') || '')
            : (entry.metadata?.title || '');

        const { error } = await supabase
            .from('journal_entries')
            .update({
                content,
                metadata: { ...entry.metadata, title },
                updated_at: new Date().toISOString(),
            })
            .eq('id', entry.id);

        setIsSavingContent(false);
        if (!error) onUpdateEntry();
    }, [entry, editor, onUpdateEntry]);

    useEffect(() => {
        if (!editor || !entry) return;
        const handleUpdate = () => {
            if (isLoadingRef.current) return;
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => saveContent(), 1500);
        };
        editor.on('update', handleUpdate);
        return () => {
            editor.off('update', handleUpdate);
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [editor, entry, saveContent]);

    const handleMetaSave = async (field: string, value: any) => {
        if (!entry) return;
        const realValue = field === 'category' && value === 'none' ? null : value;
        const newMeta = { ...entry.metadata, ...formData, [field]: realValue };
        if (field === 'category' && value === 'none') delete newMeta.category;
        setFormData((prev: any) => ({ ...prev, [field]: value }));
        const { error } = await supabase
            .from('journal_entries')
            .update({
                entry_type: field === 'entry_type' ? value : entry.entry_type,
                metadata: newMeta,
                updated_at: new Date().toISOString(),
            })
            .eq('id', entry.id);
        if (error) toast.error('Error al guardar cambios');
        else onUpdateEntry();
    };

    const handleTogglePin = async () => {
        if (!entry) return;
        const newPinned = !entry.metadata?.pinned;
        const { error } = await supabase
            .from('journal_entries')
            .update({
                metadata: { ...entry.metadata, pinned: newPinned },
                updated_at: new Date().toISOString(),
            })
            .eq('id', entry.id);
        if (error) toast.error('Error al fijar nota');
        else {
            toast.success(newPinned ? '📌 Nota fijada arriba' : 'Pin retirado');
            onUpdateEntry();
        }
    };

    const handleSetCategory = async (cat: Category) => {
        if (!entry) return;
        const newMeta = { ...entry.metadata };
        if (cat) newMeta.category = cat;
        else delete newMeta.category;
        setFormData((prev: any) => ({ ...prev, category: cat || 'none' }));
        const { error } = await supabase
            .from('journal_entries')
            .update({ metadata: newMeta, updated_at: new Date().toISOString() })
            .eq('id', entry.id);
        if (error) toast.error('Error al cambiar categoría');
        else onUpdateEntry();
    };

    const handleLinkTo = (route: string) => {
        router.push(route);
        toast.info('Abriendo sección vinculada');
    };

    const handleCopyLink = () => {
        if (!entry?.metadata?.title) {
            toast.error('La nota necesita un título para crear el enlace');
            return;
        }
        const link = `[[${entry.metadata.title}]]`;
        navigator.clipboard.writeText(link);
        toast.success(`Enlace copiado: ${link}`);
    };

    if (!entry) {
        const stats = emptyStats;
        const recent = allEntries.slice(0, 5);

        return (
            <div className="h-full overflow-auto bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-zinc-900 dark:to-zinc-950">
                <div className="p-8 max-w-md mx-auto">
                    {/* Hero */}
                    <div className="text-center mb-8">
                        <div className="relative inline-block mb-4">
                            <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
                            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-quioba-cuerpo/20 via-quioba-mente/20 to-quioba-finanzas/20 flex items-center justify-center border border-border/50 shadow-sm">
                                <Book className="w-8 h-8 text-foreground/60" />
                            </div>
                        </div>
                        <h2 className="text-lg font-bold text-foreground">Tu biblioteca</h2>
                        <p className="text-xs text-muted-foreground mt-1">Selecciona un apunte para verlo aquí</p>
                    </div>

                    {stats.total > 0 && (
                        <>
                            {/* Stats grid */}
                            <div className="grid grid-cols-2 gap-2 mb-5">
                                <div className="bg-card rounded-xl p-3 border border-border shadow-sm">
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total</div>
                                    <div className="text-2xl font-bold text-foreground leading-none">{stats.total}</div>
                                    <div className="text-[10px] text-muted-foreground mt-1">{stats.total === 1 ? 'apunte' : 'apuntes'}</div>
                                </div>
                                <div className="bg-card rounded-xl p-3 border border-border shadow-sm">
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Este mes</div>
                                    <div className="text-2xl font-bold text-primary leading-none">{stats.thisMonth}</div>
                                    <div className="text-[10px] text-muted-foreground mt-1">{stats.thisMonth === 1 ? 'creado' : 'creados'}</div>
                                </div>
                            </div>

                            {/* Categorías con barras */}
                            <div className="bg-card rounded-xl p-3 border border-border shadow-sm mb-5">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Distribución</p>
                                <div className="space-y-2">
                                    {(['cuerpo', 'mente', 'finanzas'] as const).map(cat => {
                                        const meta = CATEGORY_META[cat];
                                        const count = stats.byCat[cat];
                                        const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                        return (
                                            <div key={cat} className="flex items-center gap-2">
                                                <img src={meta.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
                                                <span className={cn("text-xs w-16 font-medium", meta.text)}>{meta.label}</span>
                                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div className={cn("h-full rounded-full transition-all duration-500", meta.bg)} style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-xs text-muted-foreground w-7 text-right tabular-nums">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {stats.untitled > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 mb-5 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                                    <Circle className="w-3 h-3 mt-0.5 shrink-0 fill-current" />
                                    <span>
                                        <strong>{stats.untitled}</strong> {stats.untitled === 1 ? 'nota sin título' : 'notas sin título'}. Considera nombrarlas para encontrarlas mejor.
                                    </span>
                                </div>
                            )}

                            {/* Reciente */}
                            {recent.length > 0 && (
                                <div className="bg-card rounded-xl p-3 border border-border shadow-sm">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recientes</p>
                                    <div className="space-y-0.5">
                                        {recent.map(e => {
                                            const ecat = e.metadata?.category;
                                            const ecatMeta = ecat && (ecat === 'cuerpo' || ecat === 'mente' || ecat === 'finanzas') ? CATEGORY_META[ecat as 'cuerpo' | 'mente' | 'finanzas'] : null;
                                            return (
                                                <div key={e.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
                                                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", ecatMeta?.bg || 'bg-muted-foreground/30')} />
                                                    <span className={cn("truncate flex-1", e.metadata?.title ? 'text-foreground' : 'text-muted-foreground italic')}>
                                                        {e.metadata?.title || 'Sin título'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    const category = getCategory(entry);
    const catMeta = category ? CATEGORY_META[category] : null;
    const source = getSourceInfo(entry);
    const SourceIcon = source.icon;
    const pinned = !!entry.metadata?.pinned;

    return (
        <div className="h-full flex flex-col bg-white dark:bg-zinc-950 border-l border-border">
            {/* Franja superior de categoría (gradiente sutil) */}
            <div className={cn(
                "h-1 w-full transition-colors",
                catMeta ? catMeta.bg : 'bg-gradient-to-r from-transparent via-border to-transparent'
            )} />

            {/* Header — título prominente + meta */}
            <div className="px-6 pt-5 pb-4 border-b border-border bg-gradient-to-b from-background to-slate-50/50 dark:from-zinc-950 dark:to-zinc-900/60">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        {/* Chips meta */}
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            {catMeta && (
                                <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0", catMeta.bgSoft, catMeta.text)}>
                                    <img src={catMeta.logo} alt="" className="w-3 h-3 object-contain" />
                                    {catMeta.label}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full shrink-0 font-medium">
                                <SourceIcon className="w-2.5 h-2.5" />
                                {source.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                                · {new Date(entry.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {isSavingContent ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 shrink-0 ml-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    Guardando…
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-500 shrink-0 ml-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    Guardado
                                </span>
                            )}
                        </div>

                        {/* Título grande editable inline */}
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            onBlur={e => handleMetaSave('title', e.target.value)}
                            placeholder="Sin título"
                            className={cn(
                                "w-full bg-transparent border-0 outline-none focus:ring-0 p-0",
                                "text-2xl font-bold tracking-tight leading-tight",
                                "placeholder:text-muted-foreground/40 placeholder:italic placeholder:font-medium"
                            )}
                        />
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-0.5 shrink-0 -mt-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8 rounded-full", pinned && "text-amber-500 bg-amber-50 dark:bg-amber-950/30")}
                            onClick={handleTogglePin}
                            title={pinned ? 'Quitar pin' : 'Fijar arriba'}
                        >
                            <Pin className={cn("w-4 h-4", pinned && "fill-current")} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={handleCopyLink}
                            title="Copiar enlace [[wikilink]]"
                        >
                            <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                            onClick={() => onDeleteEntry(entry.id)}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Categoría segment control */}
            <div className="px-6 py-3 border-b border-border/60 bg-background flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold shrink-0">Categoría</span>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/60 border border-border/60">
                    <button
                        onClick={() => handleSetCategory(null)}
                        className={cn(
                            "inline-flex items-center text-[11px] px-2.5 py-1 rounded-md font-medium transition-all",
                            !category
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Ninguna
                    </button>
                    {(['cuerpo', 'mente', 'finanzas'] as const).map(cat => {
                        const meta = CATEGORY_META[cat];
                        const active = category === cat;
                        return (
                            <button
                                key={cat}
                                onClick={() => handleSetCategory(cat)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md font-medium transition-all",
                                    active
                                        ? `${meta.bg} text-white shadow-sm`
                                        : `${meta.text} hover:bg-background/80`
                                )}
                            >
                                <img src={meta.logo} alt="" className={cn("w-3.5 h-3.5 object-contain", active && "brightness-0 invert")} />
                                {meta.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-auto">
                {editor && <EditorContent editor={editor} />}
            </div>

            {/* Vinculación cruzada */}
            <div className="border-t border-border">
                <button
                    className="w-full flex items-center justify-between px-6 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/30 transition-colors group"
                    onClick={() => setLinksOpen(!linksOpen)}
                >
                    <span className="flex items-center gap-2">
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span className="uppercase tracking-wider">Vínculos</span>
                        {backlinks.length > 0 && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold tabular-nums">
                                {backlinks.length}
                            </span>
                        )}
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", !linksOpen && "-rotate-90")} />
                </button>

                {linksOpen && (
                    <div className="px-6 pb-4 space-y-3 bg-slate-50/50 dark:bg-zinc-900/50 border-t border-border/60">
                        <div className="pt-3">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Llevar esta nota a…</p>
                            <div className="flex gap-1.5 flex-wrap">
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 rounded-full" onClick={() => handleLinkTo('/organizer')}>
                                    <Calendar className="w-3 h-3" /> Organizer
                                </Button>
                                {(['cuerpo', 'mente', 'finanzas'] as const).map(cat => {
                                    const meta = CATEGORY_META[cat];
                                    return (
                                        <Button
                                            key={cat}
                                            variant="outline"
                                            size="sm"
                                            className={cn("h-7 text-xs gap-1.5 rounded-full hover:bg-current/5", meta.text)}
                                            onClick={() => handleLinkTo(meta.route)}
                                        >
                                            <img src={meta.logo} alt="" className="w-3.5 h-3.5 object-contain" /> {meta.label}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>

                        {backlinks.length > 0 && (
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Notas que enlazan aquí</p>
                                <div className="space-y-1">
                                    {backlinks.map(b => (
                                        <div key={b.id} className="flex items-center gap-2 text-xs text-foreground bg-card border border-border rounded-lg px-2.5 py-1.5 hover:border-primary/30 transition-colors">
                                            <LinkIcon className="w-3 h-3 text-primary shrink-0" />
                                            <span className="truncate flex-1">{b.metadata?.title || 'Sin título'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {backlinks.length === 0 && (
                            <p className="text-[11px] text-muted-foreground italic">
                                Ninguna otra nota enlaza con esta. Usa <kbd className="bg-muted px-1 rounded text-[9px]">[[título]]</kbd> en otra nota para crear un vínculo.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Metadata collapsible */}
            <div className="border-t border-border">
                <button
                    className="w-full flex items-center justify-between px-6 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/30 transition-colors"
                    onClick={() => setMetaOpen(!metaOpen)}
                >
                    <span className="uppercase tracking-wider">Información de referencia</span>
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", !metaOpen && "-rotate-90")} />
                </button>

                {metaOpen && (
                    <div className="px-6 pb-4 space-y-3 border-t border-border/60 bg-slate-50/50 dark:bg-zinc-900/50">
                        <div className="space-y-1 pt-3">
                            <Label className="text-xs text-muted-foreground">Tipo</Label>
                            <Select value={formData.entry_type} onValueChange={(v) => handleMetaSave('entry_type', v)}>
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="note">Nota</SelectItem>
                                    <SelectItem value="book">Libro</SelectItem>
                                    <SelectItem value="article">Artículo</SelectItem>
                                    <SelectItem value="webpage">Página Web</SelectItem>
                                    <SelectItem value="document">Documento</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Título</Label>
                                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} onBlur={e => handleMetaSave('title', e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Autor</Label>
                                <Input value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} onBlur={e => handleMetaSave('author', e.target.value)} className="h-8 text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Fecha / Año</Label>
                                <Input value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} onBlur={e => handleMetaSave('date', e.target.value)} placeholder="YYYY" className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Publicación</Label>
                                <Input value={formData.publication} onChange={e => setFormData({ ...formData, publication: e.target.value })} onBlur={e => handleMetaSave('publication', e.target.value)} className="h-8 text-sm" />
                            </div>
                        </div>

                        {formData.entry_type === 'webpage' && (
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">URL</Label>
                                <div className="flex gap-2">
                                    <Input value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} onBlur={e => handleMetaSave('url', e.target.value)} className="h-8 text-sm text-blue-500" />
                                    {formData.url && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => window.open(formData.url, '_blank')}>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
