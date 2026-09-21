'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ShoppingCart, ListTodo, Receipt, Pill, Info, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api-fetch';
import { toast } from 'sonner';

interface ImageSuggestion {
    type: string;
    action: string;
    label: string;
    icon: string;
    data: Record<string, any>;
}

const iconMap: Record<string, React.ReactNode> = {
    add_to_shopping: <ShoppingCart className="w-4 h-4" />,
    create_task: <ListTodo className="w-4 h-4" />,
    add_expense: <Receipt className="w-4 h-4" />,
    add_medicine: <Pill className="w-4 h-4" />,
    none: <Info className="w-4 h-4" />,
};

const colorMap: Record<string, string> = {
    add_to_shopping: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50',
    create_task: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/50',
    add_expense: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50',
    add_medicine: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-950/50',
    none: 'bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800',
};

interface ShareAnalysisDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageBase64: string | null;
}

/**
 * Entrada única para "Compartir → Quioba": una imagen entra, la misma IA de
 * visión (Groq, gratis) la clasifica en compra/tarea/recibo/medicamento y el
 * usuario elige qué hacer con cada sugerencia.
 */
export default function ShareAnalysisDialog({ open, onOpenChange, imageBase64 }: ShareAnalysisDialogProps) {
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<ImageSuggestion[]>([]);
    const [executingAction, setExecutingAction] = useState<string | null>(null);

    useEffect(() => {
        if (open && imageBase64) {
            void analyzeImage(imageBase64);
        }
        if (!open) {
            setAnalysis(null);
            setSuggestions([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, imageBase64]);

    const analyzeImage = async (image: string) => {
        setLoading(true);
        setAnalysis(null);
        setSuggestions([]);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No has iniciado sesión');

            const response = await apiFetch('/api/ai-chat/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image, userId: user.id }),
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Error ${response.status}`);
            }
            const result = await response.json();
            setAnalysis(result.analysis);
            setSuggestions(result.suggestions || []);
        } catch (err: any) {
            toast.error(err.message || 'No se pudo analizar la imagen');
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    };

    const executeSuggestion = async (suggestion: ImageSuggestion) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setExecutingAction(suggestion.action);
        try {
            switch (suggestion.action) {
                case 'add_to_shopping': {
                    const { error } = await supabase.from('shopping_items').insert({
                        user_id: user.id,
                        name: suggestion.data.name,
                        category: suggestion.data.category || 'Otros',
                        is_checked: false,
                    });
                    if (error) throw error;
                    toast.success(`"${suggestion.data.name}" añadido a la lista de la compra`);
                    break;
                }
                case 'create_task': {
                    const taskData: any = {
                        user_id: user.id,
                        title: suggestion.data.title,
                        is_completed: false,
                    };
                    if (suggestion.data.due_date) taskData.due_date = suggestion.data.due_date;
                    if (suggestion.data.description) taskData.description = suggestion.data.description;
                    const { error } = await supabase.from('tasks').insert(taskData);
                    if (error) throw error;
                    toast.success(`Tarea "${suggestion.data.title}" creada`);
                    break;
                }
                case 'add_medicine': {
                    const { error } = await supabase.from('medicines').insert({
                        user_id: user.id,
                        name: suggestion.data.name,
                        dosage: suggestion.data.dosage || '',
                        frequency: suggestion.data.frequency || 'daily',
                    });
                    if (error) throw error;
                    toast.success(`Medicamento "${suggestion.data.name}" registrado`);
                    break;
                }
                default: {
                    toast.info(suggestion.label);
                    break;
                }
            }
            onOpenChange(false);
        } catch (err) {
            console.error('Error executing suggestion:', err);
            toast.error('No se pudo realizar la acción');
        } finally {
            setExecutingAction(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] md:max-w-md w-full">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        Quioba
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        {loading ? 'Leyendo tu captura…' : analysis || 'Elige qué hacer con esta imagen'}
                    </DialogDescription>
                </DialogHeader>

                {imageBase64 && (
                    <img
                        src={imageBase64}
                        alt="Captura compartida"
                        className="max-h-40 w-full object-contain rounded-lg border bg-slate-50 dark:bg-slate-900"
                    />
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    </div>
                )}

                {!loading && suggestions.length > 0 && (
                    <div className="space-y-2">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => s.action !== 'none' && executeSuggestion(s)}
                                disabled={executingAction === s.action || s.action === 'none'}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${colorMap[s.action] || colorMap.none} ${s.action === 'none' ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
                            >
                                <span className="text-lg shrink-0">{s.icon}</span>
                                <span className="flex-1 text-sm font-medium text-foreground">{s.label}</span>
                                {executingAction === s.action ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                                ) : s.action !== 'none' ? (
                                    iconMap[s.action] || <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />
                                ) : null}
                            </button>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
