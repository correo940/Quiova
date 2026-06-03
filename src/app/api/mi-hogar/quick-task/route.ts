import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
    try {
        const { text } = await req.json();
        if (!text?.trim()) {
            return NextResponse.json({ error: 'No text' }, { status: 400 });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ title: text.trim(), due_date: null, priority: 'medium' });
        }

        const groq = new Groq({ apiKey });
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            temperature: 0,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `Eres un asistente que extrae tareas de texto en español.
Hoy es ${now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
Hoy = ${todayStr}. Mañana = ${tomorrowStr}.
Extrae el título limpio, la fecha/hora (si se menciona) y la prioridad.
Responde SOLO con JSON sin markdown:
{
  "title": "título limpio de la tarea",
  "due_date": "YYYY-MM-DDTHH:mm:ss" o null si no hay fecha,
  "priority": "high" | "medium" | "low"
}
Prioridad: urgente/importante/alta→high, baja/cuando pueda→low, resto→medium.
Si hay día sin hora, usa 09:00. Si no hay fecha, due_date es null.`
                },
                { role: 'user', content: text }
            ]
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error('Empty Groq response');

        const parsed = JSON.parse(content);
        return NextResponse.json({
            title: parsed.title || text.trim(),
            due_date: parsed.due_date || null,
            priority: parsed.priority || 'medium'
        });

    } catch (e: any) {
        console.error('[quick-task]', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
