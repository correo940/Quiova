import { NextResponse } from 'next/server';
import { checkApiLimit, getAuthUser, recordApiUsage } from '@/lib/api-limit';
import { stripThinkTags } from '@/lib/strip-think';
import { requireUser } from '@/lib/require-user';

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
const GROQ_VISION_MODEL = 'qwen/qwen3.8-27b';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  if (!GROQ_API_KEY) {
    return NextResponse.json({ success: false, error: 'Clave API no configurada' }, { status: 500, headers: corsHeaders });
  }

  try {
    const user = await getAuthUser(request);
    if (user) {
      const limitCheck = await checkApiLimit(user.id, user.email || null, 'read-expiry');
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { success: false, error: `Límite mensual alcanzado (${limitCheck.used}/${limitCheck.limit})` },
          { status: 429, headers: corsHeaders }
        );
      }
    }

    const body = await request.json();
    const base64Image: string | undefined = body.image;
    if (!base64Image) {
      return NextResponse.json({ success: false, error: 'Imagen no proporcionada' }, { status: 400, headers: corsHeaders });
    }
    const base64Data = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;

    const hoy = new Date().toISOString().slice(0, 10);
    const prompt = `Esta foto es del envase de un producto. Busca la fecha de caducidad o de consumo preferente
("caducidad", "consumir antes de", "consumir preferentemente antes del", "CAD", "EXP", "BB", "best before").
Hoy es ${hoy}. Ignora fechas de envasado o fabricación. Si la fecha solo tiene mes y año, usa el último día de ese mes.
Si el año tiene dos cifras, interprétalo como 20XX. Formato de fecha española: día/mes/año.
Devuelve SOLO JSON: {"expiresAt":"AAAA-MM-DD"} o {"expiresAt":null} si no se ve ninguna fecha de caducidad legible.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
            ],
          },
        ],
        temperature: 0,
        // El modelo "piensa" antes de responder; con pocos tokens el JSON se corta.
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${await response.text()}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const cleaned = stripThinkTags(raw).replace(/```json/g, '').replace(/```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('La IA no devolvió un JSON reconocible');
    const parsed = JSON.parse(match[0]);

    if (user) {
      await recordApiUsage(user.id, 'read-expiry');
    }

    // Se descartan fechas absurdas (mal leídas): antes de 2020 o a más de 10 años.
    const value: unknown = parsed.expiresAt;
    let expiresAt: string | null = null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const t = new Date(value + 'T00:00:00Z').getTime();
      const max = Date.now() + 10 * 365 * 86400000;
      if (!Number.isNaN(t) && t >= new Date('2020-01-01T00:00:00Z').getTime() && t <= max) {
        expiresAt = value;
      }
    }

    if (!expiresAt) {
      return NextResponse.json({ success: false, error: 'No se ve una fecha de caducidad legible' }, { headers: corsHeaders });
    }
    return NextResponse.json({ success: true, expiresAt }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('[Read Expiry] Error:', error);
    return NextResponse.json({ success: false, error: `Error interno: ${error.message}` }, { status: 500, headers: corsHeaders });
  }
}
