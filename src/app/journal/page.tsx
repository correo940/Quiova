'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { JournalSidebar } from '@/components/journal/layout/JournalSidebar';
import { JournalList } from '@/components/journal/layout/JournalList';
import { JournalDetailPanel } from '@/components/journal/layout/JournalDetailPanel';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup
} from "@/components/ui/resizable";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function JournalLibraryPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    // Data State
    const [collections, setCollections] = useState<any[]>([]);
    const [entries, setEntries] = useState<any[]>([]);

    // Selection State
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

    // Dialog state — create collection
    const [createColDialog, setCreateColDialog] = useState<{ open: boolean; parentId: string | null }>({ open: false, parentId: null });
    const [newColName, setNewColName] = useState('');

    // Dialog state — delete confirmation
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'collection' | 'entry'; id: string; label: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        setUserId(user.id);

        const { data: colsData } = await supabase
            .from('journal_collections')
            .select('*')
            .eq('user_id', user.id)
            .order('name');

        setCollections(buildCollectionTree(colsData || []));

        const { data: entriesData } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        setEntries(entriesData || []);
        setIsLoading(false);
    };

    const buildCollectionTree = (items: any[]) => {
        const rootItems: any[] = [];
        const lookup: any = {};
        items.forEach(item => { lookup[item.id] = { ...item, children: [] }; });
        items.forEach(item => {
            if (item.parent_id) lookup[item.parent_id]?.children.push(lookup[item.id]);
            else rootItems.push(lookup[item.id]);
        });
        return rootItems;
    };

    const filteredEntries = useMemo(() => {
        if (!selectedCollectionId) return entries;
        return entries.filter(e => e.collection_id === selectedCollectionId);
    }, [entries, selectedCollectionId]);

    // Conteo de notas por carpeta (sólo notas asignadas directamente)
    const collectionCounts = useMemo(() => {
        const map: Record<string, number> = {};
        entries.forEach(e => {
            if (e.collection_id) map[e.collection_id] = (map[e.collection_id] || 0) + 1;
        });
        return map;
    }, [entries]);

    // #7: Crear nueva nota — soporta plantillas
    const buildTemplate = (template?: string) => {
        const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        switch (template) {
            case 'meeting':
                return {
                    title: 'Reunión sin título',
                    content: {
                        type: 'doc', content: [
                            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Reunión sin título' }] },
                            { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Fecha: ' }, { type: 'text', text: today }] },
                            { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Asistentes: ' }] },
                            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Agenda' }] },
                            { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }] }] },
                            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Decisiones' }] },
                            { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }] }] },
                            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Acciones' }] },
                            { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }] }] },
                        ],
                    },
                };
            case 'idea':
                return {
                    title: '💡 Nueva idea',
                    content: {
                        type: 'doc', content: [
                            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '💡 Nueva idea' }] },
                            { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Problema' }] },
                            { type: 'paragraph' },
                            { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Propuesta' }] },
                            { type: 'paragraph' },
                            { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Próximos pasos' }] },
                            { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }] }] },
                        ],
                    },
                };
            case 'reflection':
                return {
                    title: `Reflexión — ${today}`,
                    category: 'cuerpo',
                    content: {
                        type: 'doc', content: [
                            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: `Reflexión — ${today}` }] },
                            { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '✅ Logros del día' }] },
                            { type: 'paragraph' },
                            { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '🔥 Dificultades' }] },
                            { type: 'paragraph' },
                            { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '🎯 Para mañana' }] },
                            { type: 'paragraph' },
                        ],
                    },
                };
            case 'task':
                return {
                    title: 'Lista de tareas',
                    content: {
                        type: 'doc', content: [
                            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Lista de tareas' }] },
                            { type: 'bulletList', content: [
                                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '☐ ' }] }] },
                                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '☐ ' }] }] },
                                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '☐ ' }] }] },
                            ] },
                        ],
                    },
                };
            default:
                return {
                    title: 'Nueva nota',
                    content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Nueva nota' }] }] },
                };
        }
    };

    const handleCreateEntry = async (template?: string) => {
        if (!userId) return;
        const tpl = buildTemplate(template);
        const meta: any = { title: tpl.title, source: 'manual' };
        if ((tpl as any).category) meta.category = (tpl as any).category;

        const { data, error } = await supabase
            .from('journal_entries')
            .insert({
                user_id: userId,
                context_id: `/journal/new-${Date.now()}`,
                collection_id: selectedCollectionId || null,
                content: tpl.content,
                metadata: meta,
                tags: [],
                entry_type: 'note',
            })
            .select()
            .single();

        if (error) {
            toast.error('Error al crear la nota');
        } else {
            await fetchData();
            setSelectedEntryId(data.id);
        }
    };

    const handleTogglePin = async (entry: any) => {
        const newPinned = !entry.metadata?.pinned;
        const { error } = await supabase
            .from('journal_entries')
            .update({ metadata: { ...entry.metadata, pinned: newPinned }, updated_at: new Date().toISOString() })
            .eq('id', entry.id);
        if (error) toast.error('Error al fijar');
        else {
            setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, metadata: { ...e.metadata, pinned: newPinned } } : e));
        }
    };

    // #10: Crear colección con diálogo
    const handleCreateCollection = (parentId: string | null) => {
        setNewColName('');
        setCreateColDialog({ open: true, parentId });
    };

    const confirmCreateCollection = async () => {
        if (!newColName.trim() || !userId) return;
        const { error } = await supabase
            .from('journal_collections')
            .insert({ user_id: userId, name: newColName.trim(), parent_id: createColDialog.parentId });

        if (error) toast.error('Error al crear carpeta');
        else { toast.success('Carpeta creada'); fetchData(); }
        setCreateColDialog({ open: false, parentId: null });
    };

    // #10: Eliminar con diálogo
    const handleDeleteCollection = (id: string) => {
        const col = findCollection(collections, id);
        setDeleteDialog({ open: true, type: 'collection', id, label: col?.name || 'esta carpeta' });
    };

    const handleDeleteEntry = (id: string) => {
        const entry = entries.find(e => e.id === id);
        const label = entry?.metadata?.title || 'este apunte';
        setDeleteDialog({ open: true, type: 'entry', id, label });
    };

    const confirmDelete = async () => {
        if (!deleteDialog) return;
        const table = deleteDialog.type === 'collection' ? 'journal_collections' : 'journal_entries';
        const { error } = await supabase.from(table).delete().eq('id', deleteDialog.id);

        if (error) {
            toast.error('Error al eliminar');
        } else {
            toast.success('Eliminado');
            if (deleteDialog.type === 'collection' && selectedCollectionId === deleteDialog.id) setSelectedCollectionId(null);
            if (deleteDialog.type === 'entry' && selectedEntryId === deleteDialog.id) setSelectedEntryId(null);
            if (deleteDialog.type === 'entry') setEntries(prev => prev.filter(e => e.id !== deleteDialog.id));
            else fetchData();
        }
        setDeleteDialog(null);
    };

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col pt-16 md:pt-0">
            <ResizablePanelGroup direction="horizontal" className="h-full border-t border-border">
                <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="hidden md:block">
                    <JournalSidebar
                        collections={collections}
                        selectedCollectionId={selectedCollectionId}
                        onSelectCollection={setSelectedCollectionId}
                        onCreateCollection={handleCreateCollection}
                        onDeleteCollection={handleDeleteCollection}
                        counts={collectionCounts}
                        totalCount={entries.length}
                    />
                </ResizablePanel>

                <ResizableHandle className="hidden md:flex" />

                <ResizablePanel defaultSize={35} minSize={25}>
                    <JournalList
                        entries={filteredEntries}
                        selectedEntryId={selectedEntryId}
                        onSelectEntry={(entry) => setSelectedEntryId(entry.id)}
                        onCreateEntry={handleCreateEntry}
                        onTogglePin={handleTogglePin}
                    />
                </ResizablePanel>

                <ResizableHandle />

                <ResizablePanel defaultSize={45} minSize={30}>
                    <JournalDetailPanel
                        entry={entries.find(e => e.id === selectedEntryId) || null}
                        onUpdateEntry={fetchData}
                        onDeleteEntry={handleDeleteEntry}
                        allEntries={entries}
                    />
                </ResizablePanel>
            </ResizablePanelGroup>

            {/* #10: Dialog crear colección */}
            <Dialog open={createColDialog.open} onOpenChange={(open) => setCreateColDialog(prev => ({ ...prev, open }))}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nueva carpeta</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={newColName}
                        onChange={e => setNewColName(e.target.value)}
                        placeholder="Nombre de la carpeta"
                        className="mt-2"
                        onKeyDown={e => { if (e.key === 'Enter') confirmCreateCollection(); }}
                        autoFocus
                    />
                    <DialogFooter className="mt-4">
                        <Button variant="ghost" onClick={() => setCreateColDialog({ open: false, parentId: null })}>Cancelar</Button>
                        <Button onClick={confirmCreateCollection} disabled={!newColName.trim()}>Crear</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* #10: Dialog confirmar eliminación */}
            <Dialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>¿Eliminar {deleteDialog?.type === 'collection' ? 'carpeta' : 'apunte'}?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground mt-1">
                        Se eliminará <strong>"{deleteDialog?.label}"</strong> permanentemente. Esta acción no se puede deshacer.
                    </p>
                    <DialogFooter className="mt-4">
                        <Button variant="ghost" onClick={() => setDeleteDialog(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Eliminar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function findCollection(collections: any[], id: string): any | null {
    for (const col of collections) {
        if (col.id === id) return col;
        if (col.children?.length) {
            const found = findCollection(col.children, id);
            if (found) return found;
        }
    }
    return null;
}
