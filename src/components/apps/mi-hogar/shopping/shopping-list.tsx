'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingCart, Archive, RefreshCw, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';

type ShoppingItem = {
    id: string;
    name: string;
    category: string;
    status: 'to_buy' | 'in_stock';
};

export default function ShoppingList() {
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            fetchItems();
        } else {
            setItems([]);
            setLoading(false);
        }
    }, [user]);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('shopping_items')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedItems: ShoppingItem[] = data.map((item: any) => ({
                id: item.id,
                name: item.name,
                category: item.category || 'General',
                status: item.is_checked ? 'in_stock' : 'to_buy',
            }));

            setItems(mappedItems);
        } catch (error) {
            console.error('Error fetching shopping items:', error);
            toast.error('Error al cargar la lista de compra');
        } finally {
            setLoading(false);
        }
    };

    const addItem = async () => {
        if (!newItemName.trim() || !user) return;

        try {
            const { data, error } = await supabase
                .from('shopping_items')
                .insert([
                    {
                        user_id: user.id,
                        name: newItemName,
                        category: 'General',
                        is_checked: false, // to_buy
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            const newItem: ShoppingItem = {
                id: data.id,
                name: data.name,
                category: data.category || 'General',
                status: 'to_buy',
            };

            setItems([newItem, ...items]);
            setNewItemName('');
            toast.success('Añadido a la lista de compra');
        } catch (error) {
            console.error('Error adding item:', error);
            toast.error('Error al añadir el producto');
        }
    };

    const toggleStatus = async (id: string) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        const newStatus = item.status === 'to_buy' ? 'in_stock' : 'to_buy';
        const isChecked = newStatus === 'in_stock';

        try {
            const { error } = await supabase
                .from('shopping_items')
                .update({ is_checked: isChecked })
                .eq('id', id);

            if (error) throw error;

            setItems(items.map(i => {
                if (i.id === id) {
                    return { ...i, status: newStatus };
                }
                return i;
            }));

            toast.success(newStatus === 'to_buy' ? '¡Añadido a la lista!' : '¡Comprado!');
        } catch (error) {
            console.error('Error updating item:', error);
            toast.error('Error al actualizar el estado');
        }
    };

    const deleteItem = async (id: string) => {
        try {
            const { error } = await supabase
                .from('shopping_items')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setItems(items.filter(i => i.id !== id));
            toast.success('Producto eliminado');
        } catch (error) {
            console.error('Error deleting item:', error);
            toast.error('Error al eliminar el producto');
        }
    };

    const toBuyItems = items.filter(i => i.status === 'to_buy');
    const inStockItems = items.filter(i => i.status === 'in_stock');

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex gap-2">
                    <Input
                        placeholder="¿Qué necesitas comprar? (ej. Leche, Pan...)"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addItem()}
                    />
                    <Button onClick={addItem}>
                        <Plus className="mr-2 h-4 w-4" /> Añadir
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="list" className="relative">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Lista de Compra
                        {toBuyItems.length > 0 && (
                            <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                                {toBuyItems.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="pantry">
                        <Archive className="mr-2 h-4 w-4" />
                        Despensa / Historial
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Por Comprar</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {toBuyItems.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <ShoppingCart className="mx-auto h-12 w-12 opacity-20 mb-4" />
                                    <p>¡Todo comprado! No hay nada en la lista.</p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {toBuyItems.map(item => (
                                        <li key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors group">
                                            <span className="font-medium">{item.name}</span>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => toggleStatus(item.id)} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                                    <ArrowRight className="mr-2 h-4 w-4" />
                                                    Marcar Comprado
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pantry" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>En Casa (Despensa)</CardTitle>
                            <p className="text-sm text-muted-foreground">Marca lo que se ha gastado para añadirlo de nuevo a la lista.</p>
                        </CardHeader>
                        <CardContent>
                            {inStockItems.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Archive className="mx-auto h-12 w-12 opacity-20 mb-4" />
                                    <p>La despensa está vacía.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {inStockItems.map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20">
                                            <span className="truncate mr-2">{item.name}</span>
                                            <Button size="sm" variant="secondary" onClick={() => toggleStatus(item.id)} title="Se ha gastado">
                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                Gastado
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
