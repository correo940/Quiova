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

    const { weatherData, city, profile, activity, departureTime } = await request.json();
    if (!weatherData) {
      return NextResponse.json({ success: false, error: 'Datos del tiempo requeridos' }, { status: 400 });
    }

    const profileText = profile === 'friolero'
      ? 'muy friolero (siente el frío más que la media, recomienda más ropa de abrigo de lo normal)'
      : profile === 'caluroso'
      ? 'muy caluroso (siente el calor más que la media, recomienda ropa más ligera de lo normal)'
      : 'con sensación térmica normal';

    const activityText = activity ? `La actividad principal del día es: ${activity}.` : '';
    const departureText = departureTime ? `El usuario sale de casa a las ${departureTime}.` : '';

    const departureField = departureTime
      ? `"hora_salida_consejo": "Consejo corto específico para salir a las ${departureTime} (1 frase)",`
      : '';

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
            content: `Eres Quioba, un asistente español con personalidad directa, coloquial y divertida. Tu misión es decirle a la gente qué ropa y accesorios necesitan según el tiempo. El usuario es ${profileText}. ${activityText} ${departureText} Usa español de España, tuteo, tono cercano y con gracia. Responde SOLO con JSON válido, sin texto adicional ni bloques de código markdown.`,
          },
          {
            role: 'user',
            content: `Ciudad: ${city || 'desconocida'}
Datos del tiempo para los próximos 7 días:
${JSON.stringify(weatherData, null, 2)}

Genera recomendaciones de ropa/accesorios. Ten en cuenta:
- El perfil térmico del usuario al decidir qué ropa recomendar
- La actividad del día si se ha indicado
- La hora de salida si se ha indicado

Devuelve SOLO este JSON:
{
  "resumen_semana": "Comentario gracioso de Quioba sobre cómo será la semana en general (2-3 frases coloquiales)",
  "dias": [
    {
      "fecha": "YYYY-MM-DD",
      "comentario_quioba": "Comentario directo y gracioso adaptado al perfil del usuario (máx 2 frases)",
      ${departureField}
      "items": [
        { "emoji": "🧥", "nombre": "Chaqueta ligera", "urgente": false }
      ],
      "resumen_tiempo": "Descripción corta del tiempo",
      "nivel_calor": "calor|templado|fresco|frio|mucho_frio"
    }
  ]
}

Items posibles: 🧥 Chaqueta/Abrigo, ☔ Paraguas, 🌂 Paraguas pequeño, 🧤 Guantes, 🧣 Bufanda, 🎩 Gorra/Sombrero, 🕶️ Gafas de sol, 🧴 Crema solar, 💧 Agua fresquita, 👟 Zapatillas ligeras, 👢 Botas de agua, 🩴 Chanclas, 👚 Ropa ligera, 🩳 Pantalón corto, 👙 Ropa de verano, 🥵 Mucha hidratación, ❄️ Ropa de abrigo extra${activity ? `, y items apropiados para ${activity}` : ''}.
"urgente" es true solo para lo imprescindible (paraguas si llueve fuerte, crema si UV alto, etc).`,
          },
        ],
        temperature: 0.8,
        max_tokens: 2500,
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
