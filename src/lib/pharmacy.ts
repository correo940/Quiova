// ============ TIPOS ============
export type MedicineForm =
    | 'tablet' | 'capsule' | 'syrup' | 'drops' | 'cream'
    | 'injection' | 'suppository' | 'inhaler' | 'patch'
    | 'powder' | 'spray' | 'other';

export type MedicineCategory =
    | 'analgesic' | 'antibiotic' | 'antiinflammatory' | 'antihistamine'
    | 'antipyretic' | 'vitamin' | 'cardiac' | 'digestive'
    | 'respiratory' | 'dermatologic' | 'psychiatric' | 'ophthalmic'
    | 'contraceptive' | 'other';

export type MealTiming = 'any' | 'before' | 'with' | 'after' | 'empty_stomach';

export interface MedicineMeta {
    form?: MedicineForm;
    category?: MedicineCategory;
    person?: string;             // nombre libre o user_id del miembro
    stock?: { current: number; initial: number; unit?: string };
    schedule?: {
        every_hours?: number;       // pauta cada X horas
        duration_days?: number;     // durante Y días
        start_date?: string;        // ISO date
        meal_timing?: MealTiming;
    };
    notes?: string;               // notas adicionales del médico
    prescription?: string;        // nº receta médica
    photo_url?: string;
    side_effects?: string;
    intakes?: string[];           // historial de ISO timestamps de tomas
    contraindications?: string;
}

export const MEDICINE_FORM_META: Record<MedicineForm, { label: string; icon: string; color: string }> = {
    tablet: { label: 'Pastilla', icon: '💊', color: '#3b82f6' },
    capsule: { label: 'Cápsula', icon: '💊', color: '#8b5cf6' },
    syrup: { label: 'Jarabe', icon: '🧴', color: '#f59e0b' },
    drops: { label: 'Gotas', icon: '💧', color: '#06b6d4' },
    cream: { label: 'Crema/Pomada', icon: '🧴', color: '#ec4899' },
    injection: { label: 'Inyección', icon: '💉', color: '#ef4444' },
    suppository: { label: 'Supositorio', icon: '💊', color: '#a855f7' },
    inhaler: { label: 'Inhalador', icon: '🌬️', color: '#0ea5e9' },
    patch: { label: 'Parche', icon: '🩹', color: '#84cc16' },
    powder: { label: 'Polvo / Sobre', icon: '🥄', color: '#eab308' },
    spray: { label: 'Spray', icon: '💨', color: '#14b8a6' },
    other: { label: 'Otro', icon: '📦', color: '#64748b' },
};

export const MEDICINE_CATEGORY_META: Record<MedicineCategory, { label: string; color: string; emoji: string }> = {
    analgesic: { label: 'Analgésico', color: '#3b82f6', emoji: '🤕' },
    antibiotic: { label: 'Antibiótico', color: '#10b981', emoji: '🦠' },
    antiinflammatory: { label: 'Antiinflamatorio', color: '#f97316', emoji: '🔥' },
    antihistamine: { label: 'Antihistamínico', color: '#ec4899', emoji: '🤧' },
    antipyretic: { label: 'Antipirético', color: '#ef4444', emoji: '🌡️' },
    vitamin: { label: 'Vitamina', color: '#eab308', emoji: '🍊' },
    cardiac: { label: 'Cardíaco', color: '#dc2626', emoji: '❤️' },
    digestive: { label: 'Digestivo', color: '#84cc16', emoji: '🫃' },
    respiratory: { label: 'Respiratorio', color: '#0ea5e9', emoji: '🫁' },
    dermatologic: { label: 'Dermatológico', color: '#a855f7', emoji: '🧴' },
    psychiatric: { label: 'Psiquiátrico', color: '#6366f1', emoji: '🧠' },
    ophthalmic: { label: 'Oftálmico', color: '#06b6d4', emoji: '👁️' },
    contraceptive: { label: 'Anticonceptivo', color: '#d946ef', emoji: '🛡️' },
    other: { label: 'Otro', color: '#64748b', emoji: '💊' },
};

export const MEAL_TIMING_META: Record<MealTiming, { label: string; emoji: string }> = {
    any: { label: 'Sin restricción', emoji: '🆗' },
    before: { label: 'Antes de comer', emoji: '⏳' },
    with: { label: 'Con la comida', emoji: '🍽️' },
    after: { label: 'Después de comer', emoji: '⏱️' },
    empty_stomach: { label: 'En ayunas', emoji: '☕' },
};

// ============ META PARSING (sin migración DB — se guarda en description) ============

const META_RE = /^\{pharma:(\{[\s\S]*?\})\}\n?/;

export function parseMeta(description?: string | null): { meta: MedicineMeta; rest: string } {
    if (!description) return { meta: {}, rest: '' };
    const m = description.match(META_RE);
    if (!m) return { meta: {}, rest: description };
    try {
        return { meta: JSON.parse(m[1]), rest: description.replace(META_RE, '') };
    } catch {
        return { meta: {}, rest: description };
    }
}

export function buildDescription(text: string, meta: MedicineMeta): string {
    const cleanMeta: MedicineMeta = {};
    (Object.keys(meta) as (keyof MedicineMeta)[]).forEach(k => {
        const v = meta[k];
        if (v === undefined || v === null) return;
        if (Array.isArray(v) && v.length === 0) return;
        if (typeof v === 'string' && v === '') return;
        if (typeof v === 'object' && Object.keys(v).length === 0) return;
        (cleanMeta as any)[k] = v;
    });
    const hasMeta = Object.keys(cleanMeta).length > 0;
    const body = (text || '').trim();
    if (!hasMeta) return body;
    return `{pharma:${JSON.stringify(cleanMeta)}}\n${body}`;
}

// ============ STOCK & TOMAS ============

export function decrementStock(meta: MedicineMeta, units = 1): MedicineMeta {
    if (!meta.stock) return meta;
    return { ...meta, stock: { ...meta.stock, current: Math.max(0, meta.stock.current - units) } };
}

export function recordIntake(meta: MedicineMeta, when: Date = new Date()): MedicineMeta {
    const intakes = meta.intakes ? [...meta.intakes] : [];
    intakes.push(when.toISOString());
    return { ...meta, intakes };
}

export function stockPercentage(meta: MedicineMeta): number | null {
    if (!meta.stock || !meta.stock.initial) return null;
    return Math.round((meta.stock.current / meta.stock.initial) * 100);
}

export function stockColor(pct: number | null): string {
    if (pct === null) return 'bg-muted';
    if (pct <= 15) return 'bg-rose-500';
    if (pct <= 35) return 'bg-amber-500';
    return 'bg-emerald-500';
}

// ============ EXPIRY ============

export interface ExpiryStatus {
    state: 'expired' | 'critical' | 'warning' | 'ok' | 'unknown';
    days: number;
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
}

export function getExpiryStatus(dateStr?: string | null): ExpiryStatus {
    if (!dateStr) return {
        state: 'unknown', days: 0, label: 'Sin fecha',
        bgClass: 'bg-slate-100 dark:bg-slate-800',
        textClass: 'text-slate-600 dark:text-slate-400',
        borderClass: 'border-slate-200 dark:border-slate-700',
    };
    const expiry = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.floor((expiry.getTime() - today.getTime()) / 86400000);

    if (days < 0) return {
        state: 'expired', days, label: 'CADUCADO',
        bgClass: 'bg-rose-100 dark:bg-rose-950/40',
        textClass: 'text-rose-700 dark:text-rose-400',
        borderClass: 'border-rose-300 dark:border-rose-800',
    };
    if (days <= 30) return {
        state: 'critical', days, label: `Caduca en ${days}d`,
        bgClass: 'bg-orange-100 dark:bg-orange-950/40',
        textClass: 'text-orange-700 dark:text-orange-400',
        borderClass: 'border-orange-300 dark:border-orange-800',
    };
    if (days <= 90) return {
        state: 'warning', days, label: `${Math.floor(days / 30)} meses`,
        bgClass: 'bg-amber-100 dark:bg-amber-950/40',
        textClass: 'text-amber-700 dark:text-amber-400',
        borderClass: 'border-amber-300 dark:border-amber-800',
    };
    return {
        state: 'ok', days, label: `${Math.floor(days / 30)} meses`,
        bgClass: 'bg-emerald-100 dark:bg-emerald-950/40',
        textClass: 'text-emerald-700 dark:text-emerald-400',
        borderClass: 'border-emerald-300 dark:border-emerald-800',
    };
}

// ============ INTAKES DEL DÍA ============

export interface IntakeSlot {
    medicineId: string;
    medicineName: string;
    dosage?: string;
    time: string;       // HH:MM
    taken: boolean;     // si ya hay un intake registrado hoy a esa hora (±30min)
    takenAt?: string;   // timestamp ISO si está taken
    form?: MedicineForm;
    person?: string;
    mealTiming?: MealTiming;
    notes?: string;
}

export function getTodayIntakeSlots(
    medicines: Array<{ id: string; name: string; dosage?: string; alarm_times?: string[]; description?: string }>
): IntakeSlot[] {
    const slots: IntakeSlot[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    medicines.forEach(med => {
        const { meta } = parseMeta(med.description);
        const todayIntakes = (meta.intakes || []).filter(t => t.startsWith(todayStr));

        (med.alarm_times || []).forEach(time => {
            // Match si alguna toma de hoy está dentro de ±30 min de esta alarma
            const [h, m] = time.split(':').map(Number);
            const slotDate = new Date();
            slotDate.setHours(h, m, 0, 0);
            const matchingIntake = todayIntakes.find(iso => {
                const intakeDate = new Date(iso);
                return Math.abs(intakeDate.getTime() - slotDate.getTime()) < 30 * 60 * 1000;
            });
            slots.push({
                medicineId: med.id,
                medicineName: med.name,
                dosage: med.dosage,
                time,
                taken: !!matchingIntake,
                takenAt: matchingIntake,
                form: meta.form,
                person: meta.person,
                mealTiming: meta.schedule?.meal_timing,
                notes: meta.notes,
            });
        });
    });

    return slots.sort((a, b) => a.time.localeCompare(b.time));
}
