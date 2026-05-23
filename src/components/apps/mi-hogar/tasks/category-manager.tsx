'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
    CategoryDef,
    CATEGORY_COLOR_PALETTE,
    CATEGORY_EMOJIS,
    DEFAULT_CATEGORIES,
    loadCustomCategories,
    saveCustomCategories,
    generateUniqueId,
} from '@/lib/categories';
import { toast } from 'sonner';

export function useCategories() {
    const [categories, setCategories] = useState<CategoryDef[]>([]);

    useEffect(() => {
        const reload = () => setCategories([...DEFAULT_CATEGORIES, ...loadCustomCategories()]);
        reload();
        const handler = () => reload();
        window.addEventListener('quioba_categories_changed', handler);
        window.addEventListener('storage', handler);
        return () => {
            window.removeEventListener('quioba_categories_changed', handler);
            window.removeEventListener('storage', handler);
        };
    }, []);

    return categories;
}

interface CategoryManagerProps {
    onChange?: () => void;
}

export function CategoryManager({ onChange }: CategoryManagerProps) {
    const [open, setOpen] = useState(false);
    const [customs, setCustoms] = useState<CategoryDef[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<{ label: string; color: string; emoji: string }>({
        label: '',
        color: CATEGORY_COLOR_PALETTE[0],
        emoji: CATEGORY_EMOJIS[0],
    });

    useEffect(() => {
        if (open) setCustoms(loadCustomCategories());
    }, [open]);

    const commitSave = (next: CategoryDef[]) => {
        saveCustomCategories(next);
        setCustoms(next);
        onChange?.();
    };

    const startCreate = () => {
        setEditingId('__new__');
        setDraft({ label: '', color: CATEGORY_COLOR_PALETTE[0], emoji: CATEGORY_EMOJIS[0] });
    };

    const startEdit = (cat: CategoryDef) => {
        setEditingId(cat.id);
        setDraft({ label: cat.label, color: cat.color, emoji: cat.emoji || CATEGORY_EMOJIS[0] });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setDraft({ label: '', color: CATEGORY_COLOR_PALETTE[0], emoji: CATEGORY_EMOJIS[0] });
    };

    const saveEdit = () => {
        const label = draft.label.trim();
        if (!label) { toast.error('Pon un nombre'); return; }

        if (editingId === '__new__') {
            const id = generateUniqueId(label, [...DEFAULT_CATEGORIES, ...customs]);
            commitSave([...customs, { id, label, color: draft.color, emoji: draft.emoji, isDefault: false }]);
            toast.success(`Categoría "${label}" creada`);
        } else {
            commitSave(customs.map(c => c.id === editingId ? { ...c, label, color: draft.color, emoji: draft.emoji } : c));
            toast.success('Categoría actualizada');
        }
        cancelEdit();
    };

    const deleteCat = (id: string) => {
        commitSave(customs.filter(c => c.id !== id));
        toast.success('Categoría eliminada');
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1">
                    <Settings2 className="h-3 w-3" />
                    Gestionar
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider">Tus categorías</h3>
                    {!editingId && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={startCreate}>
                            <Plus className="h-3 w-3" /> Nueva
                        </Button>
                    )}
                </div>

                {/* Defaults (no editables) */}
                <div className="space-y-1 mb-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Predefinidas Quioba</p>
                    {DEFAULT_CATEGORIES.map(c => (
                        <div key={c.id} className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/30">
                            {c.logo && <img src={c.logo} alt="" className="w-4 h-4 object-contain shrink-0" />}
                            <span className="text-xs flex-1">{c.label}</span>
                            <span className="text-[9px] text-muted-foreground italic">predefinida</span>
                        </div>
                    ))}
                </div>

                {/* Custom */}
                <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Personalizadas {customs.length > 0 && `(${customs.length})`}</p>

                    {customs.map(c => (
                        editingId === c.id ? (
                            <CategoryForm key={c.id} draft={draft} setDraft={setDraft} onSave={saveEdit} onCancel={cancelEdit} />
                        ) : (
                            <div key={c.id} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent/30 group">
                                <span className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[10px]" style={{ backgroundColor: c.color }}>
                                    {c.emoji && <span>{c.emoji}</span>}
                                </span>
                                <span className="text-xs flex-1 truncate">{c.label}</span>
                                <button onClick={() => startEdit(c)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-0.5" title="Editar">
                                    <Pencil className="h-3 w-3" />
                                </button>
                                <button onClick={() => deleteCat(c.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-0.5" title="Eliminar">
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        )
                    ))}

                    {editingId === '__new__' && (
                        <CategoryForm draft={draft} setDraft={setDraft} onSave={saveEdit} onCancel={cancelEdit} />
                    )}

                    {customs.length === 0 && editingId !== '__new__' && (
                        <p className="text-[11px] text-muted-foreground italic px-2 py-2">
                            Aún no has creado categorías. Crea una con "+ Nueva".
                        </p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

function CategoryForm({
    draft, setDraft, onSave, onCancel,
}: {
    draft: { label: string; color: string; emoji: string };
    setDraft: (d: { label: string; color: string; emoji: string }) => void;
    onSave: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="border border-border rounded-lg p-2 bg-card space-y-2">
            <Input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="Nombre de la categoría"
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); onSave(); }
                    else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
                }}
            />

            <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Color</p>
                <div className="flex flex-wrap gap-1">
                    {CATEGORY_COLOR_PALETTE.map(color => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => setDraft({ ...draft, color })}
                            className={cn(
                                'w-6 h-6 rounded-full transition-all border-2',
                                draft.color === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                            )}
                            style={{ backgroundColor: color }}
                            title={color}
                        />
                    ))}
                </div>
            </div>

            <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Icono</p>
                <div className="flex flex-wrap gap-1">
                    {CATEGORY_EMOJIS.map(emoji => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => setDraft({ ...draft, emoji })}
                            className={cn(
                                'w-7 h-7 rounded-md text-base flex items-center justify-center transition-all border',
                                draft.emoji === emoji ? 'border-foreground bg-accent' : 'border-transparent hover:bg-accent/50'
                            )}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-2 pt-1 border-t border-border">
                <span className="text-[10px] text-muted-foreground">Preview:</span>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: draft.color }}>
                    <span>{draft.emoji}</span>
                    {draft.label || 'Sin nombre'}
                </span>
            </div>

            <div className="flex gap-1 justify-end">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
                    <X className="h-3 w-3 mr-1" /> Cancelar
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={onSave} disabled={!draft.label.trim()}>
                    <Check className="h-3 w-3 mr-1" /> Guardar
                </Button>
            </div>
        </div>
    );
}
