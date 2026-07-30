import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';

export type TaskList = {
    id: string;
    name: string;
    owner_id: string;
};

interface TaskListSelectorProps {
    currentListId: string | null;
    onListChange: (list: TaskList) => void;
}

export function TaskListSelector({ currentListId, onListChange }: TaskListSelectorProps) {
    const [lists, setLists] = useState<TaskList[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newListName, setNewListName] = useState('');
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setLists([]);
            setLoading(false);
            return;
        }

        fetchLists();
    }, [user, authLoading]);

    const fetchLists = async () => {
        try {
            setLoading(true);

            // Fetch lists visible to me: RLS (has_family_access on family_id) is what
            // gates visibility now, not a per-list task_list_members row — every list
            // in my family is visible to any member with 'view'+ access.
            const { data, error } = await supabase
                .from('task_lists')
                .select('id, name, owner_id');

            if (error) throw error;

            const mappedLists: TaskList[] = data.map((l: any) => ({
                id: l.id,
                name: l.name,
                owner_id: l.owner_id,
            }));

            // If no lists, try to create default or find legacy
            if (mappedLists.length === 0) {
                // Try legacy migration RPC
                const { data: defaultListId, error: rpcError } = await supabase.rpc('create_default_task_list_for_user');
                if (!rpcError && defaultListId) {
                    // Refetch
                    fetchLists();
                    return;
                }
            }

            setLists(mappedLists);

            // Auto-select first if none selected (only once, not on every render)
            if (!currentListId && mappedLists.length > 0) {
                // Only select if we don't have a current selection yet
                onListChange(mappedLists[0]);
            }
            // Don't re-call onListChange if the list is already selected
            // This prevents infinite loops

        } catch (error) {
            console.error('Error fetching lists:', error);
            // Don't toast here to avoid spam on initial load if empty
        } finally {
            setLoading(false);
        }
    };

    const handleCreateList = async () => {
        if (!newListName.trim()) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('task_lists')
                .insert([{ name: newListName, owner_id: user?.id }])
                .select()
                .single();

            if (error) throw error;

            // Add self as owner member
            await supabase.from('task_list_members').insert({
                list_id: data.id,
                user_id: user?.id,
                role: 'owner'
            });

            toast.success('Lista creada');
            setNewListName('');
            setShowCreateDialog(false);
            fetchLists(); // Reload to see new list
        } catch (error) {
            toast.error('Error al crear lista');
        } finally {
            setLoading(false);
        }
    };

    const currentList = lists.find(l => l.id === currentListId);

    return (
        <>
            <div className="flex items-center gap-2 w-full">
                <Select value={currentListId || ''} onValueChange={(val) => {
                    const selected = lists.find(l => l.id === val);
                    if (selected) onListChange(selected);
                }}>
                    <SelectTrigger className="w-full font-medium">
                        <SelectValue placeholder="Selecciona una lista">
                            {currentList ? (
                                <div className="flex items-center gap-2">
                                    <span>{currentList.name}</span>
                                    {currentList.owner_id !== user?.id && <Users className="w-3 h-3 text-muted-foreground" />}
                                </div>
                            ) : "Cargando..."}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {lists.map(list => (
                            <SelectItem key={list.id} value={list.id}>
                                <div className="flex items-center gap-2">
                                    {list.name}
                                    {list.owner_id !== user?.id && <Users className="w-3 h-3 opacity-50" />}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button variant="outline" size="icon" onClick={() => setShowCreateDialog(true)} title="Nueva Lista">
                    <Plus className="w-4 h-4" />
                </Button>

                <Link href="/apps/mi-hogar/familia">
                    <Button variant="outline" size="icon" title="Compartir listas por familia">
                        <Users className="w-4 h-4" />
                    </Button>
                </Link>
            </div>

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nueva Lista de Tareas</DialogTitle>
                        <DialogDescription>Crea una lista nueva para organizar tus pendientes.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre de la lista</Label>
                            <Input
                                placeholder="Ej. Compras, Trabajo, Casa..."
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
                        <Button onClick={handleCreateList} disabled={!newListName.trim() || loading}>Crear</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
