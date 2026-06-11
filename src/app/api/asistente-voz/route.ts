import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import {
    fetchPendingTasks,
    fetchShoppingList,
    fetchMedicines,
    fetchSavingsSummary,
} from '@/lib/server/assistant-data';
import { getAuthenticatedSupabaseUser } from '@/lib/server-request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
    try {
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            return NextResponse.json({ error: 'Falta GROQ_API_KEY' }, { status: 500 });
        }

        const user = await getAuthenticatedSupabaseUser(req);
        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { message, history = [] } = await req.json();
        if (!message?.trim()) {
            return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
        }

        const ctx = { userId: user.id };
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];

        const [tasks, shopping, medicines, savings] = await Promise.all([
            fetchPendingTasks(ctx),
            fetchShoppingList(ctx),
            fetchMedicines(ctx),
            fetchSavingsSummary(ctx),
        ]);

        const { data: taskLists } = await supabaseAdmin
            .from('task_lists')
            .select('id, name')
            .eq('owner_id', user.id)
            .order('name');

        const defaultListId = taskLists?.[0]?.id ?? '';

        const systemPrompt = `Eres Quioba, el asistente personal de la app Quioba. Español, amigable, directo. Respuestas cortas (máx 2 frases).

AHORA: ${now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
Hoy=${todayStr} Mañana=${tomorrowStr}

DATOS DEL USUARIO:
Tareas hoy: ${JSON.stringify(tasks.today.map(t => ({ t: t.title, h: t.due_date })))}
Tareas próximas: ${JSON.stringify(tasks.upcoming.slice(0, 10).map(t => ({ t: t.title, f: t.due_date })))}
Tareas atrasadas: ${JSON.stringify(tasks.overdue.map(t => t.title))}
Lista compra: ${JSON.stringify((shopping as any).items?.slice(0, 20).map((i: any) => i.name) || [])}
Medicamentos: ${JSON.stringify(medicines.medicines?.map((m: any) => m.name) || [])}
Ahorros: ${savings.totalSaved.toFixed(2)}€
Lista_id_default: ${defaultListId}

INTENCIONES DETECTABLES:
- Crear tarea: "pon en tareas", "añade tarea", "recuérdame", "tengo que", "agenda", "apunta"
- Añadir a la compra: "añade a la compra", "compra", "necesito comprar", "pon en la lista"
- Consulta: cualquier pregunta sobre datos existentes

RESPONDE SOLO con JSON válido (sin markdown):
Si consulta:
{"message":"respuesta","action":null}

Si crear tarea:
{"message":"Tarea añadida: [título]","action":{"type":"ADD_TASK","data":{"title":"título limpio","due_date":"YYYY-MM-DDTHH:mm:ss o null","priority":"high|medium|low","list_id":"${defaultListId}"}}}

Si añadir a compra:
{"message":"Añadido a la lista: [producto]","action":{"type":"ADD_SHOPPING","data":{"name":"nombre producto","supermarket":null}}}

FECHA: si dicen hora sin fecha usa hoy (${todayStr}). "mañana"=${tomorrowStr}. Si no hay hora usa T09:00:00.`;

        const groq = new Groq({ apiKey: groqKey });

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.2,
            max_tokens: 400,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                ...history.slice(-8).map((m: any) => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                })),
                { role: 'user', content: message },
            ],
        });

        const raw = completion.choices[0]?.message?.content || '{}';
        let parsed: any;
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = { message: 'No entendí eso, ¿puedes repetirlo?', action: null };
        }

        let actionResult = null;

        if (parsed.action?.type === 'ADD_TASK') {
            const d = parsed.action.data;
            const { error } = await supabaseAdmin.from('tasks').insert([{
                user_id: user.id,
                list_id: d.list_id || defaultListId,
                title: d.title,
                due_date: d.due_date || tomorrowStr + 'T09:00:00',
                priority: d.priority || 'medium',
                is_completed: false,
            }]);
            actionResult = { type: 'ADD_TASK', success: !error, title: d.title };
        } else if (parsed.action?.type === 'ADD_SHOPPING') {
            const d = parsed.action.data;
            const { error } = await supabaseAdmin.from('shopping_items').insert([{
                name: d.name,
                supermarket: d.supermarket || null,
                is_checked: false,
                added_by: user.id,
            }]);
            actionResult = { type: 'ADD_SHOPPING', success: !error, name: d.name };
        }

        return NextResponse.json({
            message: parsed.message || 'Listo.',
            actionResult,
        });

    } catch (e: any) {
        console.error('[asistente-voz]', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
