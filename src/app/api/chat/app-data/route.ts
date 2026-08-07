import { NextResponse } from 'next/server';
import { getAuthenticatedSupabaseUser } from '@/lib/server-request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
    const user = await getAuthenticatedSupabaseUser(req);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const { familyId } = body || {};
    if (!familyId) return NextResponse.json({ error: 'familyId requerido' }, { status: 400 });

    const [{ data: familyMembers }, { data: familyRow }] = await Promise.all([
        supabaseAdmin.from('family_members').select('user_id').eq('family_id', familyId).eq('status', 'active'),
        supabaseAdmin.from('families').select('owner_id').eq('id', familyId).single(),
    ]);
    const memberSet = new Set<string>([user.id]);
    familyMembers?.forEach(m => memberSet.add(m.user_id));
    if (familyRow?.owner_id) memberSet.add(familyRow.owner_id);
    const memberIds = Array.from(memberSet);

    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7) + '-01';

    const queries = await Promise.allSettled([
        supabaseAdmin.from('tasks').select('title,due_date,is_completed').in('user_id', memberIds).eq('is_completed', false).limit(15),
        supabaseAdmin.from('shopping_items').select('name,quantity,is_checked').in('user_id', memberIds).eq('is_checked', false).limit(15),
        supabaseAdmin.from('savings_accounts').select('name,current_balance').in('user_id', memberIds),
        supabaseAdmin.from('expenses').select('title,amount,date,category').in('user_id', memberIds).gte('date', month).order('date', { ascending: false }).limit(15),
        supabaseAdmin.from('medicines').select('name,dosage,frequency').in('user_id', memberIds).limit(15),
        supabaseAdmin.from('work_shifts').select('title,start_time,end_time').in('user_id', memberIds).gte('start_time', today).order('start_time', { ascending: true }).limit(8),
        supabaseAdmin.from('v_mortgages').select('name,monthly_payment,outstanding_balance').in('user_id', memberIds),
        supabaseAdmin.from('v_insurance_policies').select('name,provider,cost,expiration_date').in('user_id', memberIds),
        supabaseAdmin.from('v_utility_contracts').select('name,utility_type,provider,monthly_cost').in('user_id', memberIds),
        supabaseAdmin.from('vehicles').select('brand,model,plate,next_itv').in('user_id', memberIds),
        supabaseAdmin.from('recipes').select('title').in('user_id', memberIds).limit(15),
        supabaseAdmin.from('documents').select('title,category').in('user_id', memberIds).limit(15),
        supabaseAdmin.from('warranties').select('product_name,store,expiration_date').in('user_id', memberIds).limit(15),
        supabaseAdmin.from('passwords').select('name').in('user_id', memberIds).limit(15),
        supabaseAdmin.from('manuals').select('title,category').in('user_id', memberIds).limit(15),
    ]);

    const get = (i: number) => {
        const r = queries[i];
        return r.status === 'fulfilled' ? (r.value as any)?.data || [] : [];
    };

    const apps: Record<string, { label: string; emoji: string; count: number; items: any[] }> = {};

    const tasks = get(0);
    apps.tasks = { label: 'Tareas', emoji: '✅', count: tasks.length, items: tasks.map((t: any) => ({ text: t.title, sub: t.due_date?.slice(0, 10) })) };

    const shopping = get(1);
    apps.shopping = { label: 'Compra', emoji: '🛒', count: shopping.length, items: shopping.map((s: any) => ({ text: s.name, sub: s.quantity ? `x${s.quantity}` : undefined })) };

    const savings = get(2);
    const totalSavings = savings.reduce((s: number, a: any) => s + (a.current_balance || 0), 0);
    apps.savings = { label: 'Ahorros', emoji: '🐷', count: savings.length, items: savings.map((s: any) => ({ text: s.name, sub: `${s.current_balance?.toLocaleString('es-ES')}€` })) };

    const expenses = get(3);
    const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
    apps.expenses = { label: 'Gastos', emoji: '💸', count: expenses.length, items: expenses.map((e: any) => ({ text: e.title, sub: `${e.amount}€` })) };

    const medicines = get(4);
    apps.pharmacy = { label: 'Botiquín', emoji: '💊', count: medicines.length, items: medicines.map((m: any) => ({ text: m.name, sub: [m.dosage, m.frequency].filter(Boolean).join(' · ') })) };

    const shifts = get(5);
    apps.roster = { label: 'Turnos', emoji: '📅', count: shifts.length, items: shifts.map((s: any) => ({ text: s.title, sub: s.start_time?.slice(0, 16).replace('T', ' ') })) };

    const mortgages = get(6);
    apps.mortgages = { label: 'Hipotecas', emoji: '🏠', count: mortgages.length, items: mortgages.map((m: any) => ({ text: m.name, sub: `${m.monthly_payment}€/mes` })) };

    const insurance = get(7);
    apps.insurance = { label: 'Seguros', emoji: '🛡️', count: insurance.length, items: insurance.map((s: any) => ({ text: s.name, sub: `${s.provider} · ${s.cost}€` })) };

    const utilities = get(8);
    apps.utilities = { label: 'Suministros', emoji: '⚡', count: utilities.length, items: utilities.map((u: any) => ({ text: `${u.utility_type}: ${u.provider}`, sub: `${u.monthly_cost}€/mes` })) };

    const vehicles = get(9);
    apps.garage = { label: 'Garaje', emoji: '🚗', count: vehicles.length, items: vehicles.map((v: any) => ({ text: `${v.brand} ${v.model}`, sub: v.plate })) };

    const recipes = get(10);
    apps.recipes = { label: 'Recetas', emoji: '🍳', count: recipes.length, items: recipes.map((r: any) => ({ text: r.title })) };

    const documents = get(11);
    apps.documents = { label: 'Documentos', emoji: '📄', count: documents.length, items: documents.map((d: any) => ({ text: d.title, sub: d.category })) };

    const warranties = get(12);
    apps.warranties = { label: 'Garantías', emoji: '🔖', count: warranties.length, items: warranties.map((w: any) => ({ text: w.product_name, sub: w.expiration_date?.slice(0, 10) })) };

    const passwords = get(13);
    apps.passwords = { label: 'Claves', emoji: '🔑', count: passwords.length, items: passwords.map((p: any) => ({ text: p.name })) };

    const manuals = get(14);
    apps.manuals = { label: 'Manuales', emoji: '📘', count: manuals.length, items: manuals.map((m: any) => ({ text: m.title, sub: m.category })) };

    return NextResponse.json({ apps, totals: { savings: totalSavings, expenses: totalExpenses } });
}
