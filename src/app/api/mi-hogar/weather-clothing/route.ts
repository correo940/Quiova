import { NextResponse } from 'next/server';
import { checkApiLimit, getAuthUser, recordApiUsage } from '@/lib/api-limit';

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export async function POST(request: Request) {
  if (!GROQ_API_KEY) {
    return NextResponse.json({ success: false, error: 'Clave API no configurada' }, { status: 500 });
  }

  try {
    const user = await getAuthUser(request);
    if (user) {
      const limitCheck = await checkApiLimit(user.id, user.email || null, 'weather-clothing');
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { success: false, error: `Límite mensual alcanzado (${limitCheck.used}/${limitCheck.limit})` },
          { status: 429 }
        );
      }
    }

    const { weatherData, city } = await request.json();
    if (!weatherData) {
      return NextResponse.json({ success: false, error: 'Datos del tiempo requeridos' }, { status: 400 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: `Eres Quioba, un asistente español con personalidad directa, coloquial y divertida. Tu misión es decirle a la gente qué ropa y accesorios necesitan según el tiempo, con comentarios graciosos y cercanos, sin florituras. Usa español de España. Responde SOLO con JSON válido, sin texto adicional ni bloques de código markdown.`,
          },
          {
            role: 'user',
            content: `Ciudad: ${city || 'desconocida'}
Datos del tiempo para los próximos 7 días:
${JSON.stringify(weatherData, null, 2)}

Genera recomendaciones de ropa/accesorios para cada día. Para cada día incluye:
- Un comentario de Quioba gracioso y directo (máx 2 frases, coloquial)
- Lista de items necesarios con emoji

Devuelve SOLO este JSON:
{
  "dias": [
    {
      "fecha": "YYYY-MM-DD",
      "comentario_quioba": "Tu comentario gracioso aquí",
      "items": [
        { "emoji": "🧥", "nombre": "Chaqueta ligera", "urgente": false },
        { "emoji": "☔", "nombre": "Paraguas", "urgente": true }
      ],
      "resumen_tiempo": "Soleado y cálido",
      "nivel_calor": "calor|templado|fresco|frio|mucho_frio"
    }
  ]
}

Items posibles: 🧥 Chaqueta/Abrigo, ☔ Paraguas, 🌂 Paraguas pequeño, 🧤 Guantes, 🧣 Bufanda, 🎩 Gorra/Sombrero, 🕶️ Gafas de sol, 🧴 Crema solar, 💧 Agua fresquita, 👟 Zapatillas ligeras, 👢 Botas de agua, 🩴 Chanclas, 👚 Ropa ligera, 🩳 Pantalón corto, 👙 Ropa de verano, 🥵 Mucha hidratación, 🌡️ Protección calor, ❄️ Ropa de abrigo extra.

El campo "urgente" es true solo para lo imprescindible (ej: paraguas si llueve fuerte, crema si UV alto).`,
          },
        ],
        temperature: 0.8,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error: ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());

    if (user) {
      await recordApiUsage(user.id, 'weather-clothing');
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('[Weather Clothing] Error:', error);
    return NextResponse.json({ success: false, error: `Error interno: ${error.message}` }, { status: 500 });
  }
}
