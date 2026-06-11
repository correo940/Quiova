import { NextResponse } from 'next/server';
import { checkApiLimit, getAuthUser, recordApiUsage } from '@/lib/api-limit';

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_MODEL_FALLBACK = 'gemini-2.5-flash-lite';

function parseJsonContent(content: string): any {
  let text = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (match) text = match[0];
  return JSON.parse(text);
}

async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }, // garantiza JSON válido
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    const errObj = JSON.parse(err).error ?? {};
    if (res.status === 429 || errObj.type === 'rate_limit_exceeded' || errObj.type === 'tokens') {
      throw Object.assign(new Error('rate_limit'), { isRateLimit: true });
    }
    throw new Error(`Groq error: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGeminiModel(model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 5000,
        responseMimeType: 'application/json', // garantiza JSON válido
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    if (res.status === 503 || res.status === 429) {
      throw Object.assign(new Error(`Gemini ${model} no disponible: ${err}`), { isRetryable: true });
    }
    throw new Error(`Gemini error: ${err}`);
  }
  const data = await res.json();
  // Collect all non-thinking text parts
  const parts: any[] = data.candidates?.[0]?.content?.parts ?? [];
  return parts.filter((p: any) => !p.thought && p.text).map((p: any) => p.text).join('') || '';
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    return await callGeminiModel(GEMINI_MODEL, systemPrompt, userPrompt);
  } catch (err: any) {
    if (err.isRetryable) {
      console.log(`[Weather Clothing] ${GEMINI_MODEL} sobrecargado, probando ${GEMINI_MODEL_FALLBACK}`);
      return await callGeminiModel(GEMINI_MODEL_FALLBACK, systemPrompt, userPrompt);
    }
    throw err;
  }
}

export async function POST(request: Request) {
  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
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

    const systemPrompt = `Eres Quioba, un asistente español con personalidad directa, coloquial y divertida. Tu misión es decirle a la gente qué ropa y accesorios necesitan según el tiempo, dividiéndolo por franjas horarias del día para que tenga sentido real (por ejemplo: fresco por la mañana → chaqueta; calor por la tarde → camiseta). El usuario es ${profileText}. ${activityText} ${departureText} Usa español de España, tuteo, tono cercano y con gracia. Responde SOLO con JSON válido, sin texto adicional ni bloques de código markdown.`;

    const userPrompt = `Ciudad: ${city || 'desconocida'}
Datos del tiempo${weatherData[0]?.manana ? ' con franjas horarias' : ''}:
${JSON.stringify(weatherData)}

Genera recomendaciones de ropa/accesorios POR FRANJA HORARIA. Es crucial que las recomendaciones de cada franja sean coherentes con su temperatura: si hace calor por la tarde no pongas chaqueta en esa franja. Ten en cuenta el perfil térmico del usuario en cada franja.

Devuelve SOLO este JSON (un objeto por día, con sus 3 franjas mañana/tarde/noche):
{"resumen_semana":"Comentario gracioso de Quioba sobre la semana (2-3 frases coloquiales)","dias":[{"fecha":"YYYY-MM-DD","comentario_quioba":"Comentario del día adaptado al perfil (1-2 frases)",${departureField}"franjas":[{"franja":"mañana","emoji":"🌅","horas":"7-13h","temp_max":"20°","temp_min":"15°","comentario":"Frase corta y graciosa (máx 1 frase)","items":[{"emoji":"🧥","nombre":"Chaqueta ligera","urgente":false}]},{"franja":"tarde","emoji":"☀️","horas":"13-20h",...},{"franja":"noche","emoji":"🌙","horas":"20-0h",...}],"resumen_tiempo":"Descripción corta del tiempo del día","nivel_calor":"calor|templado|fresco|frio|mucho_frio"}]}

Items posibles: 🧥 Chaqueta/Abrigo, ☔ Paraguas, 🌂 Paraguas pequeño, 🧤 Guantes, 🧣 Bufanda, 🎩 Gorra/Sombrero, 🕶️ Gafas de sol, 🧴 Crema solar, 💧 Agua fresquita, 👟 Zapatillas ligeras, 👢 Botas de agua, 🩴 Chanclas, 👚 Ropa ligera, 🩳 Pantalón corto, 👙 Ropa de verano, 🥵 Mucha hidratación, ❄️ Ropa de abrigo extra${activity ? `, y items apropiados para ${activity}` : ''}.
"urgente" es true solo para lo imprescindible (paraguas si llueve fuerte, crema si UV alto, etc).
IMPORTANTE: las franjas deben ser coherentes entre sí. Si por la tarde hace 28°, NO pongas chaqueta en esa franja.`;

    // Try Groq first, fall back to Gemini on rate limit
    let content = '';
    let usedFallback = false;

    if (GROQ_API_KEY) {
      try {
        content = await callGroq(systemPrompt, userPrompt);
      } catch (err: any) {
        if (err.isRateLimit && GEMINI_API_KEY) {
          console.log('[Weather Clothing] Groq rate limited, falling back to Gemini');
          content = await callGemini(systemPrompt, userPrompt);
          usedFallback = true;
        } else {
          throw err;
        }
      }
    } else if (GEMINI_API_KEY) {
      content = await callGemini(systemPrompt, userPrompt);
      usedFallback = true;
    }

    const parsed = parseJsonContent(content);

    if (user) {
      await recordApiUsage(user.id, 'weather-clothing');
    }

    return NextResponse.json({ success: true, data: parsed, provider: usedFallback ? 'gemini' : 'groq' });
  } catch (error: any) {
    console.error('[Weather Clothing] Error:', error);
    return NextResponse.json({ success: false, error: `Error interno: ${error.message}` }, { status: 500 });
  }
}
