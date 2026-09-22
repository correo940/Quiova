import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { requireUser } from '@/lib/require-user';
import { logServidor } from '@/lib/log-servidor';

const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GEMINI_MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `Eres un nutricionista experto en estimar calorías a partir de fotos de platos de comida.

En la imagen hay un plato de comida y, junto a él, un objeto de referencia de tamaño conocido (un tenedor, una cuchara, una moneda, una tarjeta...) puesto ahí para que puedas calcular el tamaño real de la comida por comparación.

INSTRUCCIONES:
- Usa el objeto de referencia para estimar el tamaño real de cada alimento del plato.
- Si no detectas ningún objeto de referencia claro, estímalo igualmente por el tamaño habitual del plato/recipiente, pero indícalo en "reference_object".
- Identifica cada alimento por separado con su peso aproximado en gramos y sus calorías.
- Responde ÚNICAMENTE con JSON válido (sin comentarios, sin markdown, sin texto adicional).

FORMATO REQUERIDO:
{
  "reference_object": "tenedor" | "moneda" | "ninguno detectado" | ...,
  "items": [
    { "name": "Nombre del alimento", "grams": 150, "calories": 250 }
  ],
  "total_calories": 250,
  "confidence": "alta" | "media" | "baja"
}`;

function extractJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function analyzeWithGroq(base64Data: string, mimeType: string): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY no configurada.');

  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: GROQ_VISION_MODEL,
    temperature: 0.1,
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SYSTEM_PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
        ],
      },
    ],
  });

  const content = completion.choices?.[0]?.message?.content || '';
  const data = extractJson(content);
  if (!data) throw new Error('Groq no devolvió JSON válido.');
  return data;
}

async function analyzeWithGemini(base64Data: string, mimeType: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada.');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              { inline_data: { mime_type: mimeType, data: base64Data } },
            ],
          },
        ],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini error: ${await response.text()}`);
  }

  const result = await response.json();
  const content = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const data = extractJson(content);
  if (!data) throw new Error('Gemini no devolvió JSON válido.');
  return data;
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { imageB64 } = body;

    if (!imageB64) {
      return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 });
    }

    const mimeMatch = imageB64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch?.[1] || 'image/jpeg';
    const base64Data = imageB64.replace(/^data:image\/\w+;base64,/, '');

    let data: any;
    let provider: 'groq' | 'gemini';

    try {
      logServidor('🍽️ Analizando plato con Groq (Llama 4 Scout)...');
      data = await analyzeWithGroq(base64Data, mimeType);
      provider = 'groq';
    } catch (groqError) {
      console.warn('⚠️ Groq falló, probando Gemini:', groqError);
      logServidor('🍽️ Analizando plato con Gemini...');
      data = await analyzeWithGemini(base64Data, mimeType);
      provider = 'gemini';
    }

    const result = {
      reference_object: data.reference_object || 'ninguno detectado',
      items: Array.isArray(data.items) ? data.items : [],
      total_calories: data.total_calories || 0,
      confidence: data.confidence || 'baja',
      provider,
    };

    logServidor('✅ Análisis de calorías completado:', result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Error en /api/calorias/analyze:', error);
    return NextResponse.json(
      { error: 'No se pudo analizar el plato. Inténtalo de nuevo.' },
      { status: 500 }
    );
  }
}
