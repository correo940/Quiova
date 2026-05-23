'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Plus, Search, Trash2, Pencil, Camera, Loader2, Sparkles, Pill, AlertTriangle,
    Calendar as CalendarIcon, ArrowLeft, Clock, X, Check, History, ListChecks,
    Printer, Filter, MoreVertical, User as UserIcon, Heart, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Webcam from 'react-webcam';
import Link from 'next/link';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { getApiUrl } from '@/lib/api-utils';
import { cn } from '@/lib/utils';
import {
    parseMeta, buildDescription, decrementStock, recordIntake, stockPercentage, stockColor,
    getExpiryStatus, getTodayIntakeSlots, MedicineMeta, MedicineForm, MedicineCategory, MealTiming,
    MEDICINE_FORM_META, MEDICINE_CATEGORY_META, MEAL_TIMING_META, IntakeSlot,
} from '@/lib/pharmacy';

type Medicine = {
    id: string;
    name: string;
    description?: string;
    expiration_date?: string;
    created_at?: string;
    dosage?: string;
    alarm_times?: string[];
};

type ViewTab = 'today' | 'all' | 'history';

export default function PharmacyPage() {
    const { user, loading: authLoading } = useAuth();
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<ViewTab>('today');
    const [filterCategory, setFilterCategory] = useState<MedicineCategory | 'all'>('all');
    const [filterPerson, setFilterPerson] = useState<string>('all');

    // Dialog states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

    // Form states
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formExpiry, setFormExpiry] = useState('');
    const [formDosage, setFormDosage] = useState('');
    const [formAlarms, setFormAlarms] = useState<string[]>([]);
    const [newAlarmTime, setNewAlarmTime] = useState('');
    const [formForm, setFormForm] = useState<MedicineForm>('tablet');
    const [formCategory, setFormCategory] = useState<MedicineCategory>('other');
    const [formPerson, setFormPerson] = useState('');
    const [formStockCurrent, setFormStockCurrent] = useState<string>('');
    const [formStockInitial, setFormStockInitial] = useState<string>('');
    const [formStockUnit, setFormStockUnit] = useState('uds');
    const [formMealTiming, setFormMealTiming] = useState<MealTiming>('any');
    const [formEveryHours, setFormEveryHours] = useState<string>('');
    const [formDurationDays, setFormDurationDays] = useState<string>('');
    const [formPrescription, setFormPrescription] = useState('');
    const [formSideEffects, setFormSideEffects] = useState('');
    const [formNotes, setFormNotes] = useState('');

    // Webcam
    const webcamRef = useRef<Webcam>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { setMedicines([]); setLoading(false); return; }
        fetchMedicines();
    }, [user, authLoading]);

    const fetchMedicines = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('medicines')
                .select('*')
                .eq('user_id', user.id)
                .order('expiration_date', { ascending: true });
            if (error) throw error;
            setMedicines(data || []);
        } catch (error) {
            toast.error('Error al cargar el botiquín');
        } finally { setLoading(false); }
    };

    const resetForm = () => {
        setCurrentId(null);
        setFormName(''); setFormDesc(''); setFormExpiry(''); setFormDosage('');
        setFormAlarms([]); setNewAlarmTime('');
        setFormForm('tablet'); setFormCategory('other'); setFormPerson('');
        setFormStockCurrent(''); setFormStockInitial(''); setFormStockUnit('uds');
        setFormMealTiming('any'); setFormEveryHours(''); setFormDurationDays('');
        setFormPrescription(''); setFormSideEffects(''); setFormNotes('');
        setCapturedImage(null);
    };

    const handleSave = async () => {
        if (!user || !formName.trim()) { toast.warning('El nombre es obligatorio'); return; }

        const meta: MedicineMeta = {
            form: formForm,
            category: formCategory,
            person: formPerson || undefined,
            stock: (formStockCurrent || formStockInitial) ? {
                current: parseFloat(formStockCurrent) || 0,
                initial: parseFloat(formStockInitial) || parseFloat(formStockCurrent) || 0,
                unit: formStockUnit,
            } : undefined,
            schedule: {
                meal_timing: formMealTiming,
                every_hours: formEveryHours ? parseFloat(formEveryHours) : undefined,
                duration_days: formDurationDays ? parseInt(formDurationDays) : undefined,
            },
            prescription: formPrescription || undefined,
            side_effects: formSideEffects || undefined,
            notes: formNotes || undefined,
        };

        // Preservar historial de tomas y foto si editamos
        if (currentId) {
            const existing = medicines.find(m => m.id === currentId);
            if (existing) {
                const { meta: oldMeta } = parseMeta(existing.description);
                if (oldMeta.intakes) meta.intakes = oldMeta.intakes;
                if (oldMeta.photo_url) meta.photo_url = oldMeta.photo_url;
            }
        }

        const description = buildDescription(formDesc, meta);

        try {
            const medicineData = {
                user_id: user.id,
                name: formName,
                description,
                expiration_date: formExpiry || null,
                dosage: formDosage,
                alarm_times: formAlarms,
            };
            if (currentId) {
                const { error } = await supabase.from('medicines').update(medicineData).eq('id', currentId);
                if (error) throw error;
                toast.success('Medicamento actualizado');
            } else {
                const { error } = await supabase.from('medicines').insert([medicineData]);
                if (error) throw error;
                toast.success('Medicamento añadido al botiquín');
            }
            setIsDialogOpen(false);
            resetForm();
            fetchMedicines();
        } catch (error) {
            toast.error('Error al guardar');
        }
    };

    const handleDelete = async (id: string) => {
        const med = medicines.find(m => m.id === id);
        if (!med) return;
        const backup = { ...med };
        setMedicines(medicines.filter(m => m.id !== id));
        const { error } = await supabase.from('medicines').delete().eq('id', id);
        if (error) { toast.error('Error al eliminar'); fetchMedicines(); return; }
        toast('Medicamento eliminado', {
            action: {
                label: 'Deshacer',
                onClick: async () => {
                    if (!user) return;
                    await supabase.from('medicines').insert([{
                        user_id: user.id,
                        name: backup.name,
                        description: backup.description,
                        expiration_date: backup.expiration_date,
                        dosage: backup.dosage,
                        alarm_times: backup.alarm_times,
                    }]);
                    fetchMedicines();
                },
            },
        });
        setConfirmDelete(null);
    };

    const openEdit = (m: Medicine) => {
        const { meta, rest } = parseMeta(m.description);
        setCurrentId(m.id);
        setFormName(m.name);
        setFormDesc(rest);
        setFormExpiry(m.expiration_date || '');
        setFormDosage(m.dosage || '');
        setFormAlarms(m.alarm_times || []);
        setFormForm(meta.form || 'tablet');
        setFormCategory(meta.category || 'other');
        setFormPerson(meta.person || '');
        setFormStockCurrent(meta.stock?.current?.toString() || '');
        setFormStockInitial(meta.stock?.initial?.toString() || '');
        setFormStockUnit(meta.stock?.unit || 'uds');
        setFormMealTiming(meta.schedule?.meal_timing || 'any');
        setFormEveryHours(meta.schedule?.every_hours?.toString() || '');
        setFormDurationDays(meta.schedule?.duration_days?.toString() || '');
        setFormPrescription(meta.prescription || '');
        setFormSideEffects(meta.side_effects || '');
        setFormNotes(meta.notes || '');
        setIsDialogOpen(true);
    };

    const handleTakeNow = async (med: Medicine, slotTime?: string) => {
        if (!user) return;
        const { meta, rest } = parseMeta(med.description);
        const when = slotTime ? (() => {
            const [h, m] = slotTime.split(':').map(Number);
            const d = new Date(); d.setHours(h, m, 0, 0); return d;
        })() : new Date();
        let newMeta = recordIntake(meta, when);
        if (meta.stock && meta.stock.current > 0) newMeta = decrementStock(newMeta, 1);

        const newDescription = buildDescription(rest, newMeta);
        const { error } = await supabase.from('medicines').update({ description: newDescription }).eq('id', med.id);
        if (error) { toast.error('Error al registrar toma'); return; }
        toast.success(`✓ ${med.name} marcado como tomado`, {
            action: { label: 'Deshacer', onClick: async () => {
                // Revertir: quitar último intake y devolver stock
                const intakes = (newMeta.intakes || []).slice(0, -1);
                let reverted: MedicineMeta = { ...newMeta, intakes };
                if (meta.stock) reverted.stock = meta.stock;
                const revertedDesc = buildDescription(rest, reverted);
                await supabase.from('medicines').update({ description: revertedDesc }).eq('id', med.id);
                fetchMedicines();
            }},
        });
        fetchMedicines();
    };

    const handleCreateTask = async (med: Medicine) => {
        if (!user) return;
        const { data: lists } = await supabase
            .from('task_lists')
            .select('id')
            .eq('owner_id', user.id)
            .limit(1);
        if (!lists || lists.length === 0) {
            toast.error('Crea primero una lista en Tareas');
            return;
        }
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const { error } = await supabase.from('tasks').insert([{
            user_id: user.id,
            list_id: lists[0].id,
            title: `🛒 Comprar ${med.name}`,
            due_date: today.toISOString(),
            is_completed: false,
        }]);
        if (error) { toast.error('Error al crear la tarea'); return; }
        toast.success(`Tarea "Comprar ${med.name}" creada en Tareas`);
    };

    const addAlarm = () => {
        if (newAlarmTime && !formAlarms.includes(newAlarmTime)) {
            setFormAlarms([...formAlarms, newAlarmTime].sort());
            setNewAlarmTime('');
        }
    };

    const captureAndIdentify = async () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (!imageSrc) return;
        setCapturedImage(imageSrc);
        setIsProcessing(true);
        try {
            const response = await fetch(getApiUrl('api/mi-hogar/identify-medicine'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64Image: imageSrc }),
            });
            const result = await response.json();
            if (result.success && result.data) {
                setFormName(result.data.name);
                setFormDesc(result.data.description);
                if (result.data.expiration_date) setFormExpiry(result.data.expiration_date);
                toast.success('¡Identificado! Verifica los datos.');
                setIsCameraOpen(false);
            } else {
                toast.error(result.error || 'No se pudo identificar.');
            }
        } catch {
            toast.error('Error al procesar la imagen');
        } finally { setIsProcessing(false); }
    };

    // ============ Derivados ============

    const persons = useMemo(() => {
        const set = new Set<string>();
        medicines.forEach(m => {
            const { meta } = parseMeta(m.description);
            if (meta.person) set.add(meta.person);
        });
        return Array.from(set).sort();
    }, [medicines]);

    const filteredMedicines = useMemo(() => {
        return medicines.filter(m => {
            const matchSearch = !searchTerm
                || m.name.toLowerCase().includes(searchTerm.toLowerCase())
                || (m.description || '').toLowerCase().includes(searchTerm.toLowerCase())
                || (m.dosage || '').toLowerCase().includes(searchTerm.toLowerCase());
            const { meta } = parseMeta(m.description);
            const matchCat = filterCategory === 'all' || meta.category === filterCategory;
            const matchPerson = filterPerson === 'all' || meta.person === filterPerson;
            return matchSearch && matchCat && matchPerson;
        });
    }, [medicines, searchTerm, filterCategory, filterPerson]);

    const alerts = useMemo(() => {
        const expired: Medicine[] = [];
        const critical: Medicine[] = [];
        const lowStock: Medicine[] = [];
        medicines.forEach(m => {
            const status = getExpiryStatus(m.expiration_date);
            if (status.state === 'expired') expired.push(m);
            else if (status.state === 'critical') critical.push(m);
            const { meta } = parseMeta(m.description);
            const pct = stockPercentage(meta);
            if (pct !== null && pct <= 15) lowStock.push(m);
        });
        return { expired, critical, lowStock };
    }, [medicines]);

    const todaySlots: IntakeSlot[] = useMemo(() => {
        const meds = filteredMedicines.map(m => ({ ...m, description: m.description }));
        return getTodayIntakeSlots(meds);
    }, [filteredMedicines]);

    const recentIntakes = useMemo(() => {
        const items: Array<{ medicineId: string; name: string; date: Date; form?: MedicineForm }> = [];
        medicines.forEach(m => {
            const { meta } = parseMeta(m.description);
            (meta.intakes || []).forEach(iso => {
                items.push({ medicineId: m.id, name: m.name, date: new Date(iso), form: meta.form });
            });
        });
        return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 100);
    }, [medicines]);

    const handlePrint = () => window.print();

    const totalAlerts = alerts.expired.length + alerts.critical.length + alerts.lowStock.length;

    // ============ RENDER ============
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50/20 to-amber-50/20 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 p-4 md:p-6 pb-nav print:bg-white print:p-0">
            <div className="max-w-6xl mx-auto space-y-4">

                {/* HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
                    <div>
                        <Link href="/apps/mi-hogar">
                            <Button variant="ghost" size="sm" className="pl-0 mb-1 hover:pl-2 transition-all -ml-1">
                                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Volver
                            </Button>
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 tracking-tight">
                            <span className="relative">
                                <span className="absolute inset-0 bg-rose-500/20 blur-xl rounded-2xl" />
                                <span className="relative bg-gradient-to-br from-rose-500 to-rose-600 p-2.5 rounded-2xl text-white shadow-lg shadow-rose-500/20">
                                    <Pill className="w-6 h-6" />
                                </span>
                            </span>
                            Botiquín
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">Control de medicación, caducidad y stock</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={handlePrint} className="h-9">
                            <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimir
                        </Button>
                        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} size="sm" className="h-9 bg-rose-600 hover:bg-rose-700">
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Añadir
                        </Button>
                    </div>
                </div>

                {/* HERO ALERTS */}
                {totalAlerts > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 print:hidden">
                        {alerts.expired.length > 0 && (
                            <AlertCard
                                icon={AlertTriangle}
                                count={alerts.expired.length}
                                label={alerts.expired.length === 1 ? 'Caducado' : 'Caducados'}
                                description="Retira del botiquín"
                                color="rose"
                                items={alerts.expired}
                                onItemClick={openEdit}
                            />
                        )}
                        {alerts.critical.length > 0 && (
                            <AlertCard
                                icon={CalendarIcon}
                                count={alerts.critical.length}
                                label="Por caducar"
                                description="Próximos 30 días"
                                color="orange"
                                items={alerts.critical}
                                onItemClick={openEdit}
                            />
                        )}
                        {alerts.lowStock.length > 0 && (
                            <AlertCard
                                icon={Pill}
                                count={alerts.lowStock.length}
                                label="Stock bajo"
                                description="Reponer pronto"
                                color="amber"
                                items={alerts.lowStock}
                                onItemClick={openEdit}
                            />
                        )}
                    </div>
                )}

                {/* TABS + SEARCH */}
                <div className="flex flex-col gap-2 print:hidden">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ViewTab)}>
                        <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-3 h-9">
                            <TabsTrigger value="today" className="text-xs gap-1.5">
                                <ListChecks className="h-3.5 w-3.5" /> Hoy
                                {todaySlots.filter(s => !s.taken).length > 0 && (
                                    <span className="ml-1 text-[10px] bg-rose-500 text-white px-1.5 rounded-full">
                                        {todaySlots.filter(s => !s.taken).length}
                                    </span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="all" className="text-xs gap-1.5">
                                <Pill className="h-3.5 w-3.5" /> Botiquín
                                <span className="ml-1 text-[10px] text-muted-foreground">({medicines.length})</span>
                            </TabsTrigger>
                            <TabsTrigger value="history" className="text-xs gap-1.5">
                                <History className="h-3.5 w-3.5" /> Histórico
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="flex gap-2 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Buscar medicamento, dosis…"
                                className="pl-8 h-9 text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as MedicineCategory | 'all')}>
                            <SelectTrigger className="h-9 w-auto min-w-[140px] text-sm">
                                <Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas categorías</SelectItem>
                                {(Object.entries(MEDICINE_CATEGORY_META) as [MedicineCategory, typeof MEDICINE_CATEGORY_META[MedicineCategory]][]).map(([k, v]) => (
                                    <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {persons.length > 0 && (
                            <Select value={filterPerson} onValueChange={setFilterPerson}>
                                <SelectTrigger className="h-9 w-auto min-w-[140px] text-sm">
                                    <UserIcon className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Persona" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas personas</SelectItem>
                                    {persons.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                {/* CONTENT */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 bg-card rounded-xl animate-pulse" />)}
                    </div>
                ) : (
                    <>
                        {activeTab === 'today' && (
                            <TodayView
                                slots={todaySlots}
                                medicines={medicines}
                                onTake={handleTakeNow}
                                onAdd={() => { resetForm(); setIsDialogOpen(true); }}
                            />
                        )}

                        {activeTab === 'all' && (
                            <>
                                {filteredMedicines.length === 0 ? (
                                    <EmptyState onAdd={() => { resetForm(); setIsDialogOpen(true); }} hasFilters={!!searchTerm || filterCategory !== 'all' || filterPerson !== 'all'} />
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {filteredMedicines.map(m => (
                                            <MedicineCard
                                                key={m.id}
                                                medicine={m}
                                                onEdit={() => openEdit(m)}
                                                onDelete={() => setConfirmDelete({ id: m.id, name: m.name })}
                                                onTake={() => handleTakeNow(m)}
                                                onCreateTask={() => handleCreateTask(m)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'history' && (
                            <HistoryView intakes={recentIntakes} medicines={medicines} />
                        )}
                    </>
                )}
            </div>

            {/* FORM DIALOG */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {currentId ? <Pencil className="h-5 w-5 text-rose-600" /> : <Plus className="h-5 w-5 text-rose-600" />}
                            {currentId ? 'Editar medicamento' : 'Nuevo medicamento'}
                        </DialogTitle>
                    </DialogHeader>

                    {!currentId && (
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 p-3 rounded-xl flex items-center justify-between mb-4 border border-indigo-100 dark:border-indigo-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="text-sm">
                                    <p className="font-semibold text-indigo-900 dark:text-indigo-300">Identificar con IA</p>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-400/80">Escanea la caja del medicamento</p>
                                </div>
                            </div>
                            <Button size="sm" variant="default" onClick={() => setIsCameraOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                                <Camera className="w-3.5 h-3.5 mr-1.5" /> Escanear
                            </Button>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* SECCIÓN: Identificación */}
                        <FormSection title="Identificación" icon={Pill}>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2 space-y-1.5">
                                    <Label className="text-xs">Nombre del medicamento *</Label>
                                    <Input placeholder="Ej. Ibuprofeno 600mg" value={formName} onChange={e => setFormName(e.target.value)} className="h-9" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Presentación</Label>
                                    <Select value={formForm} onValueChange={(v) => setFormForm(v as MedicineForm)}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {(Object.entries(MEDICINE_FORM_META) as [MedicineForm, typeof MEDICINE_FORM_META[MedicineForm]][]).map(([k, v]) => (
                                                <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Categoría</Label>
                                    <Select value={formCategory} onValueChange={(v) => setFormCategory(v as MedicineCategory)}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {(Object.entries(MEDICINE_CATEGORY_META) as [MedicineCategory, typeof MEDICINE_CATEGORY_META[MedicineCategory]][]).map(([k, v]) => (
                                                <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Para quién</Label>
                                    <Input placeholder="Nombre o miembro del hogar" value={formPerson} onChange={e => setFormPerson(e.target.value)} className="h-9" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">¿Para qué sirve?</Label>
                                <Textarea placeholder="Síntomas que trata, indicaciones del médico…" value={formDesc} onChange={e => setFormDesc(e.target.value)} className="min-h-[60px] text-sm" />
                            </div>
                        </FormSection>

                        {/* SECCIÓN: Pauta */}
                        <FormSection title="Pauta médica" icon={CalendarIcon}>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Dosis</Label>
                                    <Input placeholder="Ej. 1 pastilla, 10ml" value={formDosage} onChange={e => setFormDosage(e.target.value)} className="h-9" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Cada (horas)</Label>
                                    <Input type="number" placeholder="8" min="0" max="24" value={formEveryHours} onChange={e => setFormEveryHours(e.target.value)} className="h-9" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Durante (días)</Label>
                                    <Input type="number" placeholder="7" min="0" value={formDurationDays} onChange={e => setFormDurationDays(e.target.value)} className="h-9" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Con las comidas</Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {(Object.entries(MEAL_TIMING_META) as [MealTiming, typeof MEAL_TIMING_META[MealTiming]][]).map(([k, v]) => (
                                        <button
                                            key={k}
                                            type="button"
                                            onClick={() => setFormMealTiming(k)}
                                            className={cn(
                                                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                                                formMealTiming === k
                                                    ? 'bg-rose-600 text-white border-rose-600'
                                                    : 'bg-card text-foreground border-border hover:border-rose-400'
                                            )}
                                        >
                                            <span>{v.emoji}</span>{v.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </FormSection>

                        {/* SECCIÓN: Stock y caducidad */}
                        <FormSection title="Stock y caducidad" icon={AlertCircle}>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Stock actual</Label>
                                    <Input type="number" placeholder="20" min="0" value={formStockCurrent} onChange={e => setFormStockCurrent(e.target.value)} className="h-9" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Stock inicial</Label>
                                    <Input type="number" placeholder="20" min="0" value={formStockInitial} onChange={e => setFormStockInitial(e.target.value)} className="h-9" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Unidad</Label>
                                    <Input placeholder="uds, ml" value={formStockUnit} onChange={e => setFormStockUnit(e.target.value)} className="h-9" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Caduca el</Label>
                                    <Input type="date" value={formExpiry} onChange={e => setFormExpiry(e.target.value)} className="h-9" />
                                </div>
                            </div>
                        </FormSection>

                        {/* SECCIÓN: Alarmas */}
                        <FormSection title="Recordatorios de toma" icon={Clock}>
                            <div className="flex gap-2">
                                <Input type="time" value={newAlarmTime} onChange={e => setNewAlarmTime(e.target.value)} className="flex-1 h-9" />
                                <Button size="sm" variant="secondary" onClick={addAlarm} disabled={!newAlarmTime} className="h-9">
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Añadir
                                </Button>
                            </div>
                            {formAlarms.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {formAlarms.map(time => (
                                        <div key={time} className="inline-flex items-center gap-1 bg-card px-2 py-1 rounded-md border border-border shadow-sm text-sm">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            <span className="font-mono">{time}</span>
                                            <button onClick={() => setFormAlarms(formAlarms.filter(t => t !== time))} className="text-muted-foreground hover:text-destructive ml-1">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] text-muted-foreground italic">Añade horas para recibir notificaciones.</p>
                            )}
                        </FormSection>

                        {/* SECCIÓN: Detalles avanzados */}
                        <FormSection title="Detalles médicos (opcional)" icon={Heart} collapsible defaultOpen={!!(formPrescription || formSideEffects || formNotes)}>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Nº de receta</Label>
                                <Input placeholder="Código receta médica" value={formPrescription} onChange={e => setFormPrescription(e.target.value)} className="h-9" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Efectos secundarios</Label>
                                <Textarea placeholder="Reacciones a vigilar…" value={formSideEffects} onChange={e => setFormSideEffects(e.target.value)} className="min-h-[50px] text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Notas adicionales</Label>
                                <Textarea placeholder="Observaciones del médico, contraindicaciones…" value={formNotes} onChange={e => setFormNotes(e.target.value)} className="min-h-[50px] text-sm" />
                            </div>
                        </FormSection>
                    </div>
                    <DialogFooter className="mt-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} className="bg-rose-600 hover:bg-rose-700">
                            <Check className="w-3.5 h-3.5 mr-1.5" /> {currentId ? 'Guardar cambios' : 'Crear medicamento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CONFIRM DELETE */}
            <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-rose-600" /> ¿Eliminar medicamento?
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Se eliminará <strong>"{confirmDelete?.name}"</strong> y su historial de tomas. Tendrás 5 segundos para deshacer.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete.id)}>
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CAMERA */}
            <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-zinc-800">
                    <div className="relative h-[400px]">
                        {!capturedImage ? (
                            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" videoConstraints={{ facingMode: 'environment' }} />
                        ) : (
                            <img src={capturedImage} className="w-full h-full object-contain opacity-50" alt="" />
                        )}
                        <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/80 to-transparent">
                            <div className="flex justify-center w-full gap-3">
                                <Button variant="outline" className="border-white/20 text-white hover:bg-white/20" onClick={() => { setCapturedImage(null); setIsCameraOpen(false); }}>
                                    Cancelar
                                </Button>
                                <Button size="lg" className="bg-white text-black hover:bg-white/90" onClick={captureAndIdentify} disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white mr-2" />}
                                    {isProcessing ? 'Analizando…' : 'Capturar'}
                                </Button>
                            </div>
                        </div>
                        {isProcessing && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="w-16 h-16 text-indigo-400 animate-pulse" />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ============ SUBCOMPONENTES ============

function FormSection({ title, icon: Icon, children, collapsible, defaultOpen = true }: { title: string; icon: any; children: React.ReactNode; collapsible?: boolean; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
            <button
                type="button"
                onClick={() => collapsible && setOpen(!open)}
                className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30",
                    collapsible && "hover:bg-muted/50 cursor-pointer"
                )}
            >
                <Icon className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{title}</span>
                {collapsible && <span className="text-[10px]">{open ? '▼' : '▶'}</span>}
            </button>
            {open && <div className="p-3 space-y-3">{children}</div>}
        </div>
    );
}

function AlertCard({ icon: Icon, count, label, description, color, items, onItemClick }: {
    icon: any; count: number; label: string; description: string;
    color: 'rose' | 'orange' | 'amber';
    items: Medicine[];
    onItemClick: (m: Medicine) => void;
}) {
    const colorClasses = {
        rose: 'from-rose-500 to-rose-600 text-rose-50 ring-rose-500/30 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300',
        orange: 'from-orange-500 to-orange-600 text-orange-50 ring-orange-500/30 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/40 text-orange-700 dark:text-orange-300',
        amber: 'from-amber-500 to-amber-600 text-amber-50 ring-amber-500/30 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300',
    };
    const [gradient, , , bg, border, text] = colorClasses[color].split(' bg-').map((p, i) => i === 0 ? p : 'bg-' + p);
    const [bgClass, borderClass] = [bg, border];
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className={cn("group rounded-xl border p-3 text-left hover:shadow-md transition-all", bgClass, borderClass)}>
                    <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm", gradient.split(' ').slice(0, 3).join(' '))}>
                            <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-baseline gap-1.5">
                                <span className={cn("text-2xl font-bold tabular-nums leading-none", text)}>{count}</span>
                                <span className={cn("text-xs font-semibold", text)}>{label}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
                        </div>
                    </div>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-1" align="start">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">{label}</div>
                {items.map(m => (
                    <button key={m.id} onClick={() => onItemClick(m)} className="w-full text-left px-2 py-1.5 hover:bg-accent rounded-md text-sm flex items-center justify-between gap-2">
                        <span className="truncate">{m.name}</span>
                        {m.expiration_date && (
                            <span className="text-[10px] text-muted-foreground shrink-0">{format(parseISO(m.expiration_date), 'dd MMM yy', { locale: es })}</span>
                        )}
                    </button>
                ))}
            </PopoverContent>
        </Popover>
    );
}

function MedicineCard({ medicine: m, onEdit, onDelete, onTake, onCreateTask }: {
    medicine: Medicine; onEdit: () => void; onDelete: () => void; onTake: () => void; onCreateTask: () => void;
}) {
    const { meta } = parseMeta(m.description);
    const status = getExpiryStatus(m.expiration_date);
    const stockPct = stockPercentage(meta);
    const formMeta = meta.form ? MEDICINE_FORM_META[meta.form] : MEDICINE_FORM_META.other;
    const catMeta = meta.category ? MEDICINE_CATEGORY_META[meta.category] : null;
    const todayCount = (meta.intakes || []).filter(t => t.startsWith(new Date().toISOString().slice(0, 10))).length;

    const borderColor = status.state === 'expired' ? 'border-l-rose-500' :
        status.state === 'critical' ? 'border-l-orange-500' :
            status.state === 'warning' ? 'border-l-amber-400' :
                status.state === 'ok' ? 'border-l-emerald-500' : 'border-l-slate-300';

    return (
        <Card className={cn("group relative overflow-hidden hover:shadow-lg transition-all border-l-4", borderColor)}>
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm"
                            style={{ backgroundColor: `${formMeta.color}20`, color: formMeta.color }}
                        >
                            {formMeta.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-sm leading-tight truncate">{m.name}</h3>
                            {m.dosage && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">{m.dosage}</p>
                            )}
                        </div>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-1" align="end">
                            <button onClick={onEdit} className="w-full text-left px-2 py-1.5 hover:bg-accent rounded-md text-xs flex items-center gap-2">
                                <Pencil className="h-3 w-3" /> Editar
                            </button>
                            <button onClick={onCreateTask} className="w-full text-left px-2 py-1.5 hover:bg-accent rounded-md text-xs flex items-center gap-2">
                                <ListChecks className="h-3 w-3" /> Crear tarea de compra
                            </button>
                            <button onClick={onDelete} className="w-full text-left px-2 py-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md text-xs flex items-center gap-2">
                                <Trash2 className="h-3 w-3" /> Eliminar
                            </button>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Chips meta */}
                <div className="flex flex-wrap gap-1 mb-2">
                    {catMeta && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: catMeta.color, backgroundColor: `${catMeta.color}18` }}>
                            <span>{catMeta.emoji}</span>{catMeta.label}
                        </span>
                    )}
                    {meta.person && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                            <UserIcon className="h-2.5 w-2.5" />{meta.person}
                        </span>
                    )}
                    {meta.schedule?.meal_timing && meta.schedule.meal_timing !== 'any' && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {MEAL_TIMING_META[meta.schedule.meal_timing].emoji}
                            {MEAL_TIMING_META[meta.schedule.meal_timing].label}
                        </span>
                    )}
                </div>

                {/* Estado caducidad */}
                <div className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border mb-2", status.bgClass, status.textClass, status.borderClass)}>
                    <CalendarIcon className="h-2.5 w-2.5" />
                    {status.label}
                    {m.expiration_date && status.state === 'ok' && (
                        <span className="opacity-70">· {format(parseISO(m.expiration_date), 'MMM yyyy', { locale: es })}</span>
                    )}
                </div>

                {/* Stock */}
                {meta.stock && (
                    <div className="mb-2">
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                            <span className="text-muted-foreground">Stock</span>
                            <span className="font-mono tabular-nums font-semibold">
                                {meta.stock.current}/{meta.stock.initial} {meta.stock.unit}
                            </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all", stockColor(stockPct))} style={{ width: `${stockPct || 0}%` }} />
                        </div>
                    </div>
                )}

                {/* Alarmas */}
                {m.alarm_times && m.alarm_times.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {m.alarm_times.map(t => (
                            <span key={t} className="inline-flex items-center gap-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-600 dark:text-slate-400">
                                <Clock className="w-2.5 h-2.5" /> {t}
                            </span>
                        ))}
                    </div>
                )}

                {/* Tomas hoy */}
                {todayCount > 0 && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mb-2 font-medium">
                        ✓ {todayCount} toma{todayCount > 1 ? 's' : ''} hoy
                    </div>
                )}

                {/* CTA Tomar / Comprar */}
                {!meta.stock || meta.stock.current > 0 ? (
                    <Button size="sm" className="w-full h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700" onClick={onTake}>
                        <Check className="w-3 h-3 mr-1" /> Tomar ahora
                    </Button>
                ) : (
                    <Button size="sm" className="w-full h-7 text-[11px] gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400" variant="outline" onClick={onCreateTask}>
                        <ListChecks className="w-3 h-3" /> Añadir a tareas
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

function TodayView({ slots, medicines, onTake, onAdd }: {
    slots: IntakeSlot[]; medicines: Medicine[];
    onTake: (m: Medicine, time?: string) => void; onAdd: () => void;
}) {
    if (slots.length === 0) {
        return (
            <Card className="p-12 text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 flex items-center justify-center mb-3">
                    <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold mb-1">Sin tomas para hoy</h3>
                <p className="text-sm text-muted-foreground mb-4">No tienes recordatorios programados.</p>
                <Button size="sm" onClick={onAdd}><Plus className="w-3.5 h-3.5 mr-1.5" /> Añadir medicamento</Button>
            </Card>
        );
    }

    const now = new Date();
    const nowHM = now.getHours() * 60 + now.getMinutes();

    const taken = slots.filter(s => s.taken);
    const pending = slots.filter(s => !s.taken);
    const upcoming = pending.filter(s => {
        const [h, m] = s.time.split(':').map(Number);
        return h * 60 + m >= nowHM;
    });
    const overdue = pending.filter(s => {
        const [h, m] = s.time.split(':').map(Number);
        return h * 60 + m < nowHM;
    });

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
                <StatBox label="Pendientes" value={pending.length} color="rose" />
                <StatBox label="Tomadas" value={taken.length} color="emerald" />
                <StatBox label="Total hoy" value={slots.length} color="slate" />
            </div>

            {overdue.length > 0 && (
                <TimelineGroup title="Atrasadas" items={overdue} medicines={medicines} onTake={onTake} accent="rose" />
            )}
            {upcoming.length > 0 && (
                <TimelineGroup title="Próximas" items={upcoming} medicines={medicines} onTake={onTake} accent="emerald" />
            )}
            {taken.length > 0 && (
                <TimelineGroup title="Tomadas" items={taken} medicines={medicines} onTake={onTake} accent="slate" />
            )}
        </div>
    );
}

function StatBox({ label, value, color }: { label: string; value: number; color: 'rose' | 'emerald' | 'slate' }) {
    const map = {
        rose: 'from-rose-500/10 to-transparent border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400',
        emerald: 'from-emerald-500/10 to-transparent border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400',
        slate: 'from-slate-500/10 to-transparent border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400',
    };
    return (
        <div className={cn("rounded-xl border p-3 bg-gradient-to-br", map[color])}>
            <div className="text-[10px] uppercase tracking-wider font-bold opacity-70">{label}</div>
            <div className="text-2xl font-bold tabular-nums">{value}</div>
        </div>
    );
}

function TimelineGroup({ title, items, medicines, onTake, accent }: {
    title: string; items: IntakeSlot[]; medicines: Medicine[];
    onTake: (m: Medicine, time?: string) => void; accent: 'rose' | 'emerald' | 'slate';
}) {
    const accentMap = {
        rose: 'text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800',
        emerald: 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
        slate: 'text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    };
    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <header className={cn("px-3 py-2 border-b text-xs font-bold uppercase tracking-wider flex items-center gap-2", accentMap[accent])}>
                <span className={cn("w-1.5 h-1.5 rounded-full", accent === 'rose' ? 'bg-rose-500' : accent === 'emerald' ? 'bg-emerald-500' : 'bg-slate-400')} />
                {title}
                <span className="ml-auto text-[10px] tabular-nums opacity-70">{items.length}</span>
            </header>
            <div className="divide-y divide-border/60">
                {items.map((slot, i) => {
                    const med = medicines.find(m => m.id === slot.medicineId);
                    const formMeta = slot.form ? MEDICINE_FORM_META[slot.form] : MEDICINE_FORM_META.other;
                    return (
                        <div key={`${slot.medicineId}-${slot.time}-${i}`} className="flex items-center gap-3 px-3 py-2 hover:bg-accent/30 transition-colors">
                            <div className="text-center shrink-0 w-12">
                                <div className="font-mono font-bold text-sm tabular-nums">{slot.time}</div>
                                {slot.takenAt && (
                                    <div className="text-[9px] text-emerald-600 dark:text-emerald-400">
                                        ✓ {format(new Date(slot.takenAt), 'HH:mm')}
                                    </div>
                                )}
                            </div>
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                                style={{ backgroundColor: `${formMeta.color}20`, color: formMeta.color }}
                            >
                                {formMeta.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={cn("text-sm font-medium leading-tight truncate", slot.taken && "line-through opacity-60")}>
                                    {slot.medicineName}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {slot.dosage && <span className="text-[11px] text-muted-foreground">{slot.dosage}</span>}
                                    {slot.person && <span className="text-[10px] bg-muted px-1 rounded">{slot.person}</span>}
                                    {slot.mealTiming && slot.mealTiming !== 'any' && (
                                        <span className="text-[10px] text-muted-foreground" title={MEAL_TIMING_META[slot.mealTiming].label}>
                                            {MEAL_TIMING_META[slot.mealTiming].emoji}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {!slot.taken && med && (
                                <Button size="sm" variant="outline" className="h-7 text-[11px] shrink-0 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700" onClick={() => onTake(med, slot.time)}>
                                    <Check className="w-3 h-3 mr-1" /> Tomar
                                </Button>
                            )}
                            {slot.taken && (
                                <div className="text-emerald-600 dark:text-emerald-400 shrink-0">
                                    <Check className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function HistoryView({ intakes, medicines }: { intakes: Array<{ medicineId: string; name: string; date: Date; form?: MedicineForm }>; medicines: Medicine[] }) {
    // Agrupar por día — debe estar antes de cualquier early return (reglas de hooks)
    const grouped = useMemo(() => {
        const map = new Map<string, typeof intakes>();
        intakes.forEach(i => {
            const key = format(i.date, 'yyyy-MM-dd');
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(i);
        });
        return Array.from(map.entries());
    }, [intakes]);

    if (intakes.length === 0) {
        return (
            <Card className="p-12 text-center">
                <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <h3 className="text-lg font-bold mb-1">Sin historial</h3>
                <p className="text-sm text-muted-foreground">Aún no has registrado ninguna toma.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {grouped.map(([day, items]) => (
                <div key={day} className="rounded-xl border border-border bg-card overflow-hidden">
                    <header className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
                        <h3 className="text-sm font-bold capitalize">
                            {format(new Date(day), "EEEE d 'de' MMMM", { locale: es })}
                        </h3>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{items.length} tomas</span>
                    </header>
                    <div className="divide-y divide-border/60">
                        {items.map((item, i) => {
                            const formMeta = item.form ? MEDICINE_FORM_META[item.form] : MEDICINE_FORM_META.other;
                            return (
                                <div key={i} className="flex items-center gap-3 px-3 py-2">
                                    <div className="font-mono text-xs tabular-nums w-12 text-muted-foreground">
                                        {format(item.date, 'HH:mm')}
                                    </div>
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: `${formMeta.color}20`, color: formMeta.color }}>
                                        {formMeta.icon}
                                    </div>
                                    <span className="text-sm flex-1 truncate">{item.name}</span>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

function EmptyState({ onAdd, hasFilters }: { onAdd: () => void; hasFilters: boolean }) {
    return (
        <Card className="p-12 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/40 dark:to-rose-800/40 flex items-center justify-center mb-4 shadow-inner">
                <Pill className="w-10 h-10 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-lg font-bold mb-1">
                {hasFilters ? 'Sin resultados' : 'Tu botiquín está vacío'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
                {hasFilters ? 'Prueba con otros filtros.' : 'Empieza añadiendo los medicamentos de casa.'}
            </p>
            {!hasFilters && (
                <Button onClick={onAdd} className="bg-rose-600 hover:bg-rose-700">
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Añadir medicamento
                </Button>
            )}
        </Card>
    );
}
