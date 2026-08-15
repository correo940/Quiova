import { NextResponse } from 'next/server';
import { stripThinkTags } from '@/lib/strip-think';

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
const GROQ_MODEL = 'openai/gpt-oss-120b';

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Error al leer la petición' }, { status: 400 });
    }
    const { text, userId } = body;

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'Clave API no configurada' }, { status: 500 });
    }
    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Texto no proporcionado' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const prompt = `Eres Quioba, un asistente IA familiar. Analiza este mensaje de chat y detecta si contiene información accionable.

MENSAJE: "${text}"

Clasifica el contenido:
1. "shopping" — Menciona comprar algo, necesitar algo, un producto, un alimento
2. "task" — Menciona una cita, evento, recordatorio, algo que hacer, una fecha/hora
3. "receipt" — Menciona un gasto, un precio, cuánto costó algo
4. "medicine" — Menciona un medicamento, tomar pastillas, ir al médico
5. "info" — No hay acción clara

RESPONDE SOLO CON JSON VÁLIDO (sin markdown, sin backticks):
{"analysis":"Resumen breve de lo detectado","suggestions":[{"type":"shopping","action":"add_to_shopping","label":"Añadir X a la compra","icon":"🛒","data":{"name":"nombre","category":"categoría"}},{"type":"task","action":"create_task","label":"Crear tarea X","icon":"📋","data":{"title":"título","due_date":"${today}","description":"detalles"}}]}

REGLAS:
- "mañana" = ${tomorrow}, "hoy" = ${today}
- Si dice "comprar X" o "necesitamos X" → add_to_shopping
- Si dice "dentista", "reunión", "ir a", "a las X" → create_task
- Si dice "cuesta X", "me cobró X" → create_task con el gasto
- Máximo 3 sugerencias, mínimo 1
- Idioma: español`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[analyze-text] Groq API error:', response.status, errText);
      let userError = `Error de IA (${response.status})`;
      if (response.status === 401) userError = 'Clave API inválida';
      else if (response.status === 429) userError = 'Demasiadas peticiones, espera un momento';
      return NextResponse.json({ error: userError }, { status: 500 });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    const content = stripThinkTags(rawContent);
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      result = {
        analysis: 'No he encontrado acciones claras en este mensaje.',
        suggestions: [{ type: 'info', action: 'none', label: 'Sin acciones detectadas', icon: 'ℹ️', data: {} }],
      };
    }

    if (!result.suggestions || !Array.isArray(result.suggestions)) {
      result.suggestions = [{ type: 'info', action: 'none', label: 'Sin acciones detectadas', icon: 'ℹ️', data: {} }];
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[analyze-text] Error:', error.message);
    return NextResponse.json({ error: `Error interno: ${error.message}` }, { status: 500 });
  }
}
