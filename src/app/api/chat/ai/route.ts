import { NextResponse } from 'next/server';
import { getAuthenticatedSupabaseUser } from '@/lib/server-request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
    const user = await getAuthenticatedSupabaseUser(req);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const { question, familyId } = body || {};
    if (!question?.trim()) return NextResponse.json({ error: 'Pregunta vacía' }, { status: 400 });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return NextResponse.json({ error: 'IA no configurada' }, { status: 500 });

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
        supabaseAdmin.from('tasks').select('title,due_date').in('user_id', memberIds).eq('is_completed', false).limit(10),
        supabaseAdmin.from('shopping_items').select('name,quantity').in('user_id', memberIds).eq('is_checked', false).limit(10),
        supabaseAdmin.from('savings_accounts').select('name,current_balance').in('user_id', memberIds),
        supabaseAdmin.from('expenses').select('title,amount,date').in('user_id', memberIds).gte('date', month).order('date', { ascending: false }).limit(8),
        supabaseAdmin.from('medicines').select('name,dosage,frequency').in('user_id', memberIds).limit(10),
        supabaseAdmin.from('work_shifts').select('title,start_time,end_time').in('user_id', memberIds).gte('start_time', today).limit(5),
        supabaseAdmin.from('v_mortgages').select('name,monthly_payment,outstanding_balance,tin,rate_type').in('user_id', memberIds),
        supabaseAdmin.from('v_insurance_policies').select('name,provider,cost,expiration_date').in('user_id', memberIds),
        supabaseAdmin.from('v_utility_contracts').select('name,utility_type,provider,monthly_cost').in('user_id', memberIds),
        supabaseAdmin.from('vehicles').select('brand,model,plate,next_itv').in('user_id', memberIds),
        supabaseAdmin.from('recipes').select('title').in('user_id', memberIds).limit(10),
        supabaseAdmin.from('documents').select('title,category').in('user_id', memberIds).limit(10),
        supabaseAdmin.from('warranties').select('product_name,store,expiration_date').in('user_id', memberIds).limit(10),
        supabaseAdmin.from('passwords').select('name').in('user_id', memberIds).limit(10),
        supabaseAdmin.from('manuals').select('title,category').in('user_id', memberIds).limit(10),
        // Conocimiento IA: personal del usuario + familiar
        supabaseAdmin.from('ai_knowledge').select('title,content,scope,family_id').or(`user_id.eq.${user.id},and(scope.eq.family,family_id.eq.${familyId})`).order('created_at', { ascending: false }).limit(8),
    ]);

    const get = (i: number) => {
        const r = queries[i];
        return r.status === 'fulfilled' ? (r.value as any)?.data || [] : [];
    };

    const parts: string[] = [];

    const tasks = get(0);
    if (tasks.length) parts.push(`TAREAS PENDIENTES: ${tasks.map((t: any) => `${t.title}${t.due_date ? ` (${t.due_date.slice(0, 10)})` : ''}`).join(', ')}`);

    const shopping = get(1);
    if (shopping.length) parts.push(`LISTA COMPRA: ${shopping.map((s: any) => `${s.name}${s.quantity ? ` x${s.quantity}` : ''}`).join(', ')}`);

    const savings = get(2);
    if (savings.length) parts.push(`AHORROS: ${savings.map((s: any) => `${s.name}: ${s.current_balance}€`).join(', ')}`);

    const expenses = get(3);
    if (expenses.length) {
        const total = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
        parts.push(`GASTOS ESTE MES (total ${total.toFixed(0)}€): ${expenses.map((e: any) => `${e.title}: ${e.amount}€`).join(', ')}`);
    }

    const medicines = get(4);
    if (medicines.length) parts.push(`MEDICINAS: ${medicines.map((m: any) => `${m.name} ${m.dosage || ''} ${m.frequency || ''}`.trim()).join(', ')}`);

    const shifts = get(5);
    if (shifts.length) parts.push(`TURNOS PRÓXIMOS: ${shifts.map((s: any) => `${s.title} ${s.start_time?.slice(0, 16)}`).join(', ')}`);

    const mortgages = get(6);
    if (mortgages.length) parts.push(`HIPOTECAS: ${mortgages.map((m: any) => `${m.name}: cuota ${m.monthly_payment}€, pendiente ${m.outstanding_balance}€, TIN ${m.tin}% (${m.rate_type})`).join(', ')}`);

    const insurance = get(7);
    if (insurance.length) parts.push(`SEGUROS: ${insurance.map((s: any) => `${s.name} (${s.provider}) ${s.cost}€, vence ${s.expiration_date?.slice(0, 10)}`).join(', ')}`);

    const utilities = get(8);
    if (utilities.length) parts.push(`SUMINISTROS: ${utilities.map((u: any) => `${u.utility_type}: ${u.provider} ${u.monthly_cost}€/mes`).join(', ')}`);

    const vehicles = get(9);
    if (vehicles.length) parts.push(`VEHÍCULOS: ${vehicles.map((v: any) => `${v.brand} ${v.model} (${v.plate})${v.next_itv ? ` ITV: ${v.next_itv}` : ''}`).join(', ')}`);

    const recipes = get(10);
    if (recipes.length) parts.push(`RECETAS: ${recipes.map((r: any) => r.title).join(', ')}`);

    const documents = get(11);
    if (documents.length) parts.push(`DOCUMENTOS: ${documents.map((d: any) => `${d.title} (${d.category || 'sin cat.'})`).join(', ')}`);

    const warranties = get(12);
    if (warranties.length) parts.push(`GARANTÍAS: ${warranties.map((w: any) => `${w.product_name} (${w.store || '?'}) vence ${w.expiration_date?.slice(0, 10) || '?'}`).join(', ')}`);

    const passwords = get(13);
    if (passwords.length) parts.push(`CONTRASEÑAS GUARDADAS: ${passwords.map((p: any) => p.name).join(', ')}`);

    const manuals = get(14);
    if (manuals.length) parts.push(`MANUALES: ${manuals.map((m: any) => `${m.title} (${m.category || 'general'})`).join(', ')}`);

    const knowledge = get(15);
    if (knowledge.length) parts.push(`CONOCIMIENTO IA: ${knowledge.map((k: any) => `[${k.scope === 'family' ? 'Familia' : 'Personal'}] ${k.title}: ${(k.content || '').slice(0, 200)}`).join(' | ')}`);

    const context = parts.length > 0 ? parts.join('\n') : 'No hay datos registrados en Quioba.';

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: `Eres Quioba IA, el asistente de la familia dentro de su chat. SOLO puedes responder con la información que te proporciono a continuación. Si la pregunta no se puede responder con estos datos, di "No tengo esa información registrada en Quioba". Nunca inventes datos ni uses conocimiento externo. Responde en español, conciso (2-3 frases). No uses markdown.\n\nDATOS DE LA FAMILIA:\n${context}` },
                    { role: 'user', content: question },
                ],
                max_tokens: 300,
                temperature: 0.3,
            }),
        });
        const data = await res.json();
        const answer = data?.choices?.[0]?.message?.content || 'No pude generar una respuesta.';
        return NextResponse.json({ answer });
    } catch {
        return NextResponse.json({ error: 'Error al consultar IA' }, { status: 500 });
    }
}
