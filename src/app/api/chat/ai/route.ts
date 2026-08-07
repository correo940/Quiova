import { NextResponse } from 'next/server';
import { getAuthenticatedSupabaseUser } from '@/lib/server-request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

const INTENT_RULES: { re: RegExp; modules: string[] }[] = [
    { re: /tarea|pendiente|todo|que hacer|completar|urgente|recordatorio/i, modules: ['tasks'] },
    { re: /compr|mercado|supermercado|lista de la compra/i, modules: ['shopping'] },
    { re: /dinero|saldo|gast|ahorro|finanz|€|presupuesto|patrimonio/i, modules: ['finance'] },
    { re: /medicin|pastilla|fármaco|medicación|dosis/i, modules: ['medicines'] },
    { re: /turno|jornada|guardia|horario laboral/i, modules: ['shifts'] },
    { re: /hipoteca|préstamo|euribor|cuota/i, modules: ['mortgages'] },
    { re: /seguro|póliza|cobertura/i, modules: ['insurance'] },
    { re: /\bluz\b|el[eé]ctric|agua|gas|internet|tarifa|suministro/i, modules: ['utilities'] },
    { re: /manual|instrucción|mantenimiento/i, modules: ['manuals'] },
    { re: /vehículo|coche|carro|garaje|itv|revisión/i, modules: ['vehicles'] },
    { re: /receta|cocin|comida|plato|ingrediente/i, modules: ['recipes'] },
    { re: /documento|factura|archivo|papel/i, modules: ['documents'] },
];

function detectModules(msg: string): Set<string> {
    const modules = new Set<string>();
    for (const rule of INTENT_RULES) {
        if (rule.re.test(msg.toLowerCase())) rule.modules.forEach(m => modules.add(m));
    }
    if (modules.size === 0) ['tasks', 'finance', 'shopping', 'medicines'].forEach(m => modules.add(m));
    return modules;
}

export async function POST(req: Request) {
    const user = await getAuthenticatedSupabaseUser(req);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const { question, familyId } = body || {};
    if (!question?.trim()) return NextResponse.json({ error: 'Pregunta vacía' }, { status: 400 });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return NextResponse.json({ error: 'IA no configurada' }, { status: 500 });

    const needed = detectModules(question);
    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7) + '-01';

    const { data: familyMembers } = await supabaseAdmin
        .from('family_members')
        .select('user_id')
        .eq('family_id', familyId)
        .eq('status', 'active');
    const memberIds = familyMembers?.map(m => m.user_id) || [user.id];

    const parts: string[] = [];

    if (needed.has('tasks')) {
        const { data } = await supabaseAdmin.from('tasks').select('title,due_date,is_completed').in('user_id', memberIds).eq('is_completed', false).limit(10);
        if (data?.length) parts.push(`TAREAS PENDIENTES: ${data.map(t => `${t.title}${t.due_date ? ` (${t.due_date.slice(0, 10)})` : ''}`).join(', ')}`);
        else parts.push('TAREAS: no hay tareas pendientes');
    }
    if (needed.has('shopping')) {
        const { data } = await supabaseAdmin.from('shopping_items').select('name,quantity').in('user_id', memberIds).eq('is_checked', false).limit(10);
        if (data?.length) parts.push(`LISTA COMPRA: ${data.map(s => `${s.name}${s.quantity ? ` x${s.quantity}` : ''}`).join(', ')}`);
        else parts.push('LISTA COMPRA: vacía');
    }
    if (needed.has('finance')) {
        const { data: savings } = await supabaseAdmin.from('savings_accounts').select('name,current_balance').in('user_id', memberIds);
        const { data: expenses } = await supabaseAdmin.from('expenses').select('title,amount').in('user_id', memberIds).gte('date', month).order('date', { ascending: false }).limit(5);
        if (savings?.length) parts.push(`AHORROS: ${savings.map(s => `${s.name}: ${s.current_balance}€`).join(', ')}`);
        if (expenses?.length) parts.push(`GASTOS RECIENTES: ${expenses.map(e => `${e.title}: ${e.amount}€`).join(', ')}`);
    }
    if (needed.has('medicines')) {
        const { data } = await supabaseAdmin.from('medicines').select('name,dosage,frequency').in('user_id', memberIds).limit(8);
        if (data?.length) parts.push(`MEDICINAS: ${data.map(m => `${m.name} ${m.dosage || ''} ${m.frequency || ''}`).join(', ')}`);
        else parts.push('MEDICINAS: no hay medicinas registradas');
    }
    if (needed.has('shifts')) {
        const { data } = await supabaseAdmin.from('work_shifts').select('title,start_time,end_time').in('user_id', memberIds).gte('start_time', today).limit(5);
        if (data?.length) parts.push(`TURNOS: ${data.map(s => `${s.title} ${s.start_time?.slice(0, 16)}`).join(', ')}`);
    }
    if (needed.has('mortgages')) {
        const { data } = await supabaseAdmin.from('v_mortgages').select('name,monthly_payment,outstanding_balance').in('user_id', memberIds);
        if (data?.length) parts.push(`HIPOTECAS: ${data.map(m => `${m.name}: cuota ${m.monthly_payment}€, pendiente ${m.outstanding_balance}€`).join(', ')}`);
    }
    if (needed.has('insurance')) {
        const { data } = await supabaseAdmin.from('v_insurance_policies').select('name,provider,expiration_date').in('user_id', memberIds);
        if (data?.length) parts.push(`SEGUROS: ${data.map(s => `${s.name} (${s.provider}) vence ${s.expiration_date?.slice(0, 10)}`).join(', ')}`);
    }
    if (needed.has('utilities')) {
        const { data } = await supabaseAdmin.from('v_utility_contracts').select('name,utility_type,provider,monthly_cost').in('user_id', memberIds);
        if (data?.length) parts.push(`SUMINISTROS: ${data.map(u => `${u.utility_type}: ${u.provider} ${u.monthly_cost}€/mes`).join(', ')}`);
    }
    if (needed.has('vehicles')) {
        const { data } = await supabaseAdmin.from('vehicles').select('brand,model,plate,next_itv').in('user_id', memberIds);
        if (data?.length) parts.push(`VEHÍCULOS: ${data.map(v => `${v.brand} ${v.model} (${v.plate})${v.next_itv ? ` ITV: ${v.next_itv}` : ''}`).join(', ')}`);
    }
    if (needed.has('recipes')) {
        const { data } = await supabaseAdmin.from('recipes').select('title').in('user_id', memberIds).limit(8);
        if (data?.length) parts.push(`RECETAS: ${data.map(r => r.title).join(', ')}`);
    }
    if (needed.has('documents')) {
        const { data } = await supabaseAdmin.from('documents').select('title,category').in('user_id', memberIds).limit(8);
        if (data?.length) parts.push(`DOCUMENTOS: ${data.map(d => `${d.title} (${d.category || 'sin categoría'})`).join(', ')}`);
    }

    const context = parts.length > 0 ? parts.join(' || ') : 'No hay datos registrados en Quioba para esta consulta.';

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
