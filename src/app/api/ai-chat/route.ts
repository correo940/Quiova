import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, userId } = body as { messages: Message[]; userId: string };

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return NextResponse.json({ error: 'Falta GROQ_API_KEY' }, { status: 500 });
    if (!userId) return NextResponse.json({ error: 'Falta userId' }, { status: 400 });

    // Supabase con service role para leer datos del usuario
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Consultas paralelas para máxima velocidad
    const today = new Date().toISOString().split('T')[0];
    const [
      { data: tasks },
      { data: shopping },
      { data: savings },
      { data: shifts },
      { data: medicines },
      { data: expenses },
    ] = await Promise.all([
      supabase.from('tasks').select('title, is_completed, due_date').eq('user_id', userId).eq('is_completed', false).limit(10),
      supabase.from('shopping_items').select('name, quantity').eq('user_id', userId).eq('is_checked', false).limit(15),
      supabase.from('savings_accounts').select('name, current_balance').eq('user_id', userId),
      supabase.from('work_shifts').select('title, start_time, end_time').eq('user_id', userId).gte('start_time', today).limit(5),
      supabase.from('medicines').select('name, dosage, frequency').eq('user_id', userId).limit(10),
      supabase.from('expenses').select('description, amount, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    ]);

    const totalBalance = savings?.reduce((sum, a) => sum + (a.current_balance || 0), 0) || 0;

    const systemPrompt = `Eres la IA de Quioba, asistente personal inteligente y cercano del usuario.
Tienes acceso a sus datos reales y puedes ayudarle con cualquier pregunta sobre su vida diaria.
Responde siempre en español, de forma concisa y útil. Nunca menciones que eres Llama ni ningún modelo externo.

DATOS ACTUALES DEL USUARIO (${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}):

💰 FINANZAS:
- Saldo total: ${totalBalance.toLocaleString('es-ES')}€
- Últimos gastos: ${expenses?.map(e => `${e.description} (${e.amount}€)`).join(', ') || 'Sin gastos recientes'}

✅ TAREAS PENDIENTES (${tasks?.length || 0}):
${tasks?.map(t => `- ${t.title}${t.due_date ? ` (vence: ${t.due_date})` : ''}`).join('\n') || '- Sin tareas pendientes'}

🛒 LISTA DE LA COMPRA (${shopping?.length || 0} items):
${shopping?.map(s => `- ${s.name}${s.quantity ? ` x${s.quantity}` : ''}`).join('\n') || '- Lista vacía'}

💼 PRÓXIMOS TURNOS:
${shifts?.map(s => {
  const start = new Date(s.start_time);
  const end = new Date(s.end_time);
  return `- ${s.title}: ${start.toLocaleDateString('es-ES')} ${start.getHours()}:${String(start.getMinutes()).padStart(2,'0')}–${end.getHours()}:${String(end.getMinutes()).padStart(2,'0')}`;
}).join('\n') || '- Sin turnos próximos'}

💊 MEDICACIÓN:
${medicines?.map(m => `- ${m.name}${m.dosage ? ` (${m.dosage})` : ''}${m.frequency ? ` — ${m.frequency}` : ''}`).join('\n') || '- Sin medicación registrada'}


FORMATO DE RESPUESTA — MUY IMPORTANTE:
Debes responder SIEMPRE y ÚNICAMENTE con JSON válido. Nunca texto plano.

Para listas (compra, tareas, documentos, turnos, medicación):
{"type":"list","title":"Título","icon":"emoji","items":[{"icon":"emoji","text":"texto"}]}

Para texto normal:
{"type":"text","content":"Tu respuesta aquí"}

EJEMPLOS:
Usuario: "¿qué tengo que comprar?"
{"type":"list","title":"Lista de la compra","icon":"🛒","items":[{"icon":"🍞","text":"Pan x1"},{"icon":"🧀","text":"Queso x1"}]}

Usuario: "¿cómo estás?"
{"type":"text","content":"¡Todo bien! ¿En qué te ayudo hoy? 😊"}

NUNCA uses markdown, viñetas ni texto fuera del JSON.`;

    const groqMessages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: 500,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq ai-chat error:', err);
      return NextResponse.json({ error: 'Error al contactar con Groq' }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? 'Lo siento, no pude procesar tu mensaje.';

    return NextResponse.json({ reply });

  } catch (error) {
    console.error('API /ai-chat error:', error);
    return NextResponse.json({ error: 'Error procesando la solicitud' }, { status: 500 });
  }
}
