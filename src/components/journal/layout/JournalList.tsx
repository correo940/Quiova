'use client';

import React, { useState, useMemo } from 'react';
import {
    FileText,
    Book,
    Globe,
    File,
    Plus,
    Search,
    LayoutGrid,
    List,
    Tag,
    Pin,
    Smartphone,
    PenLine,
    Mic,
    CheckSquare,
    AlertCircle,
    Sparkles,
    ChevronDown,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface JournalEntry {
    id: string;
    title?: string;
    entry_type: 'note' | 'book' | 'article' | 'webpage' | 'document';
    metadata: any;
    content?: any;
    tags?: string[];
    created_at: string;
    updated_at: string;
    context_id?: string;
}

type Category = 'cuerpo' | 'mente' | 'finanzas' | null;
type TemplateKey = 'blank' | 'meeting' | 'idea' | 'reflection' | 'task';

interface JournalListProps {
    entries: JournalEntry[];
    selectedEntryId: string | null;
    onSelectEntry: (entry: JournalEntry) => void;
    onCreateEntry?: (template?: TemplateKey) => void;
    onTogglePin?: (entry: JournalEntry) => void;
}

const TAG_PALETTE = [
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
];

const CATEGORY_META: Record<NonNullable<Category>, { label: string; bg: string; bgSoft: string; text: string; ring: string; logo: string }> = {
    cuerpo: {
        label: 'Cuerpo',
        bg: 'bg-quioba-cuerpo',
        bgSoft: 'bg-quioba-cuerpo/10',
        text: 'text-quioba-cuerpo',
        ring: 'ring-quioba-cuerpo/40',
        logo: '/images/logo-cuerpo.png',
    },
    mente: {
        label: 'Mente',
        bg: 'bg-quioba-mente',
        bgSoft: 'bg-quioba-mente/10',
        text: 'text-quioba-mente',
        ring: 'ring-quioba-mente/40',
        logo: '/images/logo-mente.png',
    },
    finanzas: {
        label: 'Finanzas',
        bg: 'bg-quioba-finanzas',
        bgSoft: 'bg-quioba-finanzas/10',
        text: 'text-quioba-finanzas',
        ring: 'ring-quioba-finanzas/40',
        logo: '/images/logo-finanzas.png',
    },
};

function tagColor(tag: string) {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
}

function extractSnippet(content: any, maxLen = 140): string {
    if (!content?.content) return '';
    for (const node of content.content) {
        if (node.type === 'paragraph' && node.content) {
            const text = node.content.map((n: any) => n.text || '').join('');
            if (text.trim()) return text.slice(0, maxLen);
        }
    }
    return '';
}

function getCategory(entry: JournalEntry): Category {
    const cat = entry.metadata?.category;
    if (cat === 'cuerpo' || cat === 'mente' || cat === 'finanzas') return cat;
    // Derivación automática por context_id como fallback
    const ctx = (entry.context_id || '').toLowerCase();
    if (ctx.includes('cuerpo') || ctx.includes('body')) return 'cuerpo';
    if (ctx.includes('mente') || ctx.includes('mind')) return 'mente';
    if (ctx.includes('finanzas') || ctx.includes('finance')) return 'finanzas';
    return null;
}

function getSource(entry: JournalEntry): { label: string; icon: any } {
    const src = entry.metadata?.source;
    if (src === 'apk' || src === 'mobile') return { label: 'Apuntes', icon: Smartphone };
    if (src === 'web' || src === 'webpage') return { label: 'Web', icon: Globe };
    if (src === 'audio' || entry.entry_type === 'note' && entry.metadata?.has_audio) return { label: 'Audio', icon: Mic };
    if (entry.entry_type === 'webpage') return { label: 'Web', icon: Globe };
    return { label: 'Manual', icon: PenLine };
}

function getTypeIcon(type: string) {
    switch (type) {
        case 'book': return <Book className="w-3.5 h-3.5 text-amber-700 shrink-0" />;
        case 'article': return <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
        case 'webpage': return <Globe className="w-3.5 h-3.5 text-cyan-600 shrink-0" />;
        case 'document': return <File className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
        default: return <FileText className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
    }
}

function getTitle(entry: JournalEntry) {
    if (entry.metadata?.title) return entry.metadata.title;
    return 'Sin título';
}

function isUntitledStale(entry: JournalEntry): boolean {
    if (entry.metadata?.title) return false;
    const days = differenceInDays(new Date(), new Date(entry.created_at));
    return days >= 7;
}

export function JournalList({ entries, selectedEntryId, onSelectEntry, onCreateEntry, onTogglePin }: JournalListProps) {
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');

    const allTags = useMemo(() => {
        const set = new Set<string>();
        entries.forEach(e => (e.tags || []).forEach(t => set.add(t)));
        return Array.from(set);
    }, [entries]);

    const stats = useMemo(() => {
        const total = entries.length;
        const byCat = { cuerpo: 0, mente: 0, finanzas: 0, none: 0 };
        const pinned = entries.filter(e => e.metadata?.pinned).length;
        const untitled = entries.filter(e => !e.metadata?.title).length;
        entries.forEach(e => {
            const cat = getCategory(e);
            if (cat) byCat[cat]++;
            else byCat.none++;
        });
        return { total, byCat, pinned, untitled };
    }, [entries]);

    const filtered = useMemo(() => {
        let result = entries;
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(e => {
                const title = getTitle(e).toLowerCase();
                const snippet = extractSnippet(e.content).toLowerCase();
                return title.includes(q) || snippet.includes(q);
            });
        }
        if (activeTag) {
            result = result.filter(e => (e.tags || []).includes(activeTag));
        }
        if (activeCategory !== 'all') {
            result = result.filter(e => getCategory(e) === activeCategory);
        }
        // Pin sort: pinned arriba, después por updated_at
        return [...result].sort((a, b) => {
            const pa = a.metadata?.pinned ? 1 : 0;
            const pb = b.metadata?.pinned ? 1 : 0;
            if (pa !== pb) return pb - pa;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
    }, [entries, search, activeTag, activeCategory]);

    const handlePinClick = (e: React.MouseEvent, entry: JournalEntry) => {
        e.stopPropagation();
        onTogglePin?.(entry);
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
            {/* Toolbar */}
            <div className="p-2 border-b border-border space-y-2">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar notas..."
                            className="h-8 pl-8 text-sm"
                        />
                    </div>
                    <Button
                        variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setViewMode('table')}
                        title="Vista lista"
                    >
                        <List className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setViewMode('cards')}
                        title="Vista cuadrícula"
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                    </Button>
                    {onCreateEntry && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" className="h-8 shrink-0 gap-1.5">
                                    <Plus className="w-3.5 h-3.5" /> Nueva
                                    <ChevronDown className="w-3 h-3 opacity-70" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="text-[11px] text-muted-foreground">Plantillas</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => onCreateEntry('blank')}>
                                    <FileText className="w-3.5 h-3.5 mr-2" /> Nota en blanco
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onCreateEntry('meeting')}>
                                    <CheckSquare className="w-3.5 h-3.5 mr-2 text-blue-500" /> Reunión
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onCreateEntry('idea')}>
                                    <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-500" /> Idea
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onCreateEntry('reflection')}>
                                    <PenLine className="w-3.5 h-3.5 mr-2 text-quioba-cuerpo" /> Reflexión diaria
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onCreateEntry('task')}>
                                    <CheckSquare className="w-3.5 h-3.5 mr-2 text-quioba-mente" /> Lista de tareas
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Segment control de categorías */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/60 border border-border/60 w-fit">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
                            activeCategory === 'all'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        Todas
                        <span className="text-[9.5px] opacity-70 tabular-nums">{stats.total}</span>
                    </button>
                    {(['cuerpo', 'mente', 'finanzas'] as const).map(cat => {
                        const meta = CATEGORY_META[cat];
                        const active = activeCategory === cat;
                        return (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(active ? 'all' : cat)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
                                    active
                                        ? `${meta.bg} text-white shadow-sm`
                                        : `${meta.text} hover:bg-background/80`
                                )}
                            >
                                <img src={meta.logo} alt="" className={cn("w-3.5 h-3.5 object-contain", active && "brightness-0 invert")} />
                                {meta.label}
                                {stats.byCat[cat] > 0 && (
                                    <span className="text-[9.5px] opacity-80 tabular-nums">{stats.byCat[cat]}</span>
                                )}
                            </button>
                        );
                    })}
                    {stats.pinned > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ml-0.5">
                            <Pin className="w-2.5 h-2.5 fill-current" /> {stats.pinned}
                        </span>
                    )}
                </div>

                {/* Tag filter pills */}
                {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center">
                        <Tag className="w-2.5 h-2.5 text-muted-foreground mr-0.5" />
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                className={cn(
                                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border transition-all',
                                    activeTag === tag
                                        ? 'ring-2 ring-primary ring-offset-1'
                                        : 'hover:opacity-80',
                                    tagColor(tag),
                                    'border-transparent'
                                )}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mb-4 opacity-20" />
                        <p className="font-medium text-sm">
                            {search || activeTag || activeCategory !== 'all' ? 'Sin resultados' : 'Esta colección está vacía'}
                        </p>
                        <p className="text-xs mt-1 opacity-70">
                            {search || activeTag || activeCategory !== 'all'
                                ? 'Prueba con otros términos o filtros'
                                : 'Crea tu primer apunte con el botón + Nueva'}
                        </p>
                        {!search && !activeTag && activeCategory === 'all' && onCreateEntry && (
                            <Button size="sm" className="mt-4 gap-1.5" onClick={() => onCreateEntry('blank')}>
                                <Plus className="w-3.5 h-3.5" /> Crear primera nota
                            </Button>
                        )}
                    </div>
                ) : viewMode === 'table' ? (
                    /* Vista lista mejorada (sin columna Creador) */
                    <div className="divide-y divide-border/40">
                        {filtered.map(entry => {
                            const cat = getCategory(entry);
                            const catMeta = cat ? CATEGORY_META[cat] : null;
                            const source = getSource(entry);
                            const SourceIcon = source.icon;
                            const snippet = extractSnippet(entry.content);
                            const isSelected = selectedEntryId === entry.id;
                            const stale = isUntitledStale(entry);
                            const pinned = !!entry.metadata?.pinned;

                            return (
                                <div
                                    key={entry.id}
                                    onClick={() => onSelectEntry(entry)}
                                    className={cn(
                                        "group relative flex gap-2.5 px-3 py-2.5 cursor-pointer transition-all",
                                        isSelected
                                            ? "bg-accent/80 shadow-[inset_0_0_0_1px_hsl(var(--border))]"
                                            : "hover:bg-muted/50"
                                    )}
                                >
                                    {/* Franja lateral de categoría */}
                                    <div className={cn(
                                        "absolute left-0 top-1 bottom-1 rounded-r-full transition-all",
                                        isSelected ? "w-1" : "w-[3px]",
                                        catMeta ? catMeta.bg : (isSelected ? 'bg-primary' : 'bg-transparent')
                                    )} />

                                    {/* Icono tipo */}
                                    <div className="pt-0.5 pl-1.5">{getTypeIcon(entry.entry_type)}</div>

                                    {/* Cuerpo */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            {pinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                                            <div className={cn(
                                                "font-medium text-[13px] leading-snug truncate",
                                                !entry.metadata?.title && "text-muted-foreground italic"
                                            )}>
                                                {getTitle(entry)}
                                            </div>
                                            {stale && (
                                                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" aria-label="Sin título hace más de 7 días" />
                                            )}
                                        </div>

                                        {snippet && (
                                            <div className="text-[11.5px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                                                {snippet}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            {catMeta && (
                                                <span className={cn("inline-flex items-center gap-1 text-[9.5px] px-1.5 py-[1px] rounded-full font-medium", catMeta.bgSoft, catMeta.text)}>
                                                    <img src={catMeta.logo} alt="" className="w-2.5 h-2.5 object-contain" />
                                                    {catMeta.label}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-0.5 text-[9.5px] text-muted-foreground bg-muted/50 px-1.5 py-[1px] rounded-full">
                                                <SourceIcon className="w-2.5 h-2.5" />
                                                {source.label}
                                            </span>
                                            {(entry.tags || []).slice(0, 2).map(t => (
                                                <span key={t} className={`text-[9.5px] px-1.5 py-[1px] rounded-full font-medium ${tagColor(t)}`}>{t}</span>
                                            ))}
                                            {(entry.tags || []).length > 2 && (
                                                <span className="text-[9.5px] text-muted-foreground">+{entry.tags!.length - 2}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Fecha + acciones */}
                                    <div className="flex flex-col items-end justify-between shrink-0">
                                        <span className="text-[10px] text-muted-foreground">
                                            {format(new Date(entry.updated_at), 'dd/MM/yy', { locale: es })}
                                        </span>
                                        {onTogglePin && (
                                            <button
                                                onClick={e => handlePinClick(e, entry)}
                                                className={cn(
                                                    "p-1 rounded transition-opacity",
                                                    pinned
                                                        ? "opacity-100 text-amber-500"
                                                        : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-amber-500"
                                                )}
                                                title={pinned ? 'Quitar pin' : 'Fijar arriba'}
                                            >
                                                <Pin className={cn("w-3 h-3", pinned && "fill-current")} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Card view mejorada con franja de categoría */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
                        {filtered.map(entry => {
                            const cat = getCategory(entry);
                            const catMeta = cat ? CATEGORY_META[cat] : null;
                            const source = getSource(entry);
                            const SourceIcon = source.icon;
                            const snippet = extractSnippet(entry.content, 180);
                            const isSelected = selectedEntryId === entry.id;
                            const pinned = !!entry.metadata?.pinned;

                            return (
                                <div
                                    key={entry.id}
                                    onClick={() => onSelectEntry(entry)}
                                    className={cn(
                                        "group relative p-3 pl-4 rounded-lg border cursor-pointer hover:shadow-md transition-all bg-card overflow-hidden",
                                        isSelected
                                            ? `border-primary/60 shadow-sm ${catMeta?.bgSoft || 'bg-accent/40'}`
                                            : 'border-border hover:border-primary/30'
                                    )}
                                >
                                    {/* Franja lateral */}
                                    <div className={cn(
                                        "absolute left-0 top-0 bottom-0 w-[4px]",
                                        catMeta ? catMeta.bg : 'bg-muted-foreground/20'
                                    )} />

                                    <div className="flex items-start gap-2 mb-2">
                                        {getTypeIcon(entry.entry_type)}
                                        {pinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />}
                                        <div className={cn(
                                            "font-semibold text-sm leading-tight flex-1 line-clamp-2",
                                            !entry.metadata?.title && "text-muted-foreground italic"
                                        )}>
                                            {getTitle(entry)}
                                        </div>
                                        {onTogglePin && (
                                            <button
                                                onClick={e => handlePinClick(e, entry)}
                                                className={cn(
                                                    "p-1 rounded transition-opacity shrink-0",
                                                    pinned
                                                        ? "opacity-100 text-amber-500"
                                                        : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-amber-500"
                                                )}
                                            >
                                                <Pin className={cn("w-3 h-3", pinned && "fill-current")} />
                                            </button>
                                        )}
                                    </div>

                                    {snippet && (
                                        <p className="text-xs text-muted-foreground line-clamp-3 mb-2 leading-relaxed">{snippet}</p>
                                    )}

                                    <div className="flex items-center justify-between mt-auto gap-2 flex-wrap">
                                        <div className="flex gap-1 flex-wrap items-center">
                                            {catMeta && (
                                                <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium", catMeta.bgSoft, catMeta.text)}>
                                                    <img src={catMeta.logo} alt="" className="w-3 h-3 object-contain" />
                                                    {catMeta.label}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                                                <SourceIcon className="w-2.5 h-2.5" />
                                                {source.label}
                                            </span>
                                            {(entry.tags || []).slice(0, 1).map(t => (
                                                <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full ${tagColor(t)}`}>{t}</span>
                                            ))}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                            {format(new Date(entry.updated_at), 'dd/MM/yy', { locale: es })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer stats */}
            <div className="px-3 py-1.5 border-t border-border bg-muted/20 flex items-center justify-between text-[10.5px] text-muted-foreground">
                <span>{filtered.length} de {stats.total} {stats.total === 1 ? 'apunte' : 'apuntes'}</span>
                {stats.untitled > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-2.5 h-2.5" /> {stats.untitled} sin título
                    </span>
                )}
            </div>
        </div>
    );
}
