import { NextResponse } from 'next/server';

export const maxDuration = 30;

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
const GROQ_VISION_MODEL = 'qwen/qwen3.6-27b';

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Error al leer la petición' }, { status: 400 });
    }
    const { image, userId } = body;

    if (!GROQ_API_KEY) {
      console.error('[analyze-image] No GROQ_API_KEY found');
      return NextResponse.json({ error: 'Clave API no configurada' }, { status: 500 });
    }
    if (!image) {
      return NextResponse.json({ error: 'Imagen no proporcionada' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }

    const base64Data = image.includes('base64,')
      ? image.split('base64,')[1]
      : image;

    const sizeKB = Math.round(base64Data.length / 1024);
    console.log(`[analyze-image] Image size: ${sizeKB}KB base64`);

    if (sizeKB > 4000) {
      return NextResponse.json({ error: `Imagen demasiado grande (${sizeKB}KB). Máximo 4MB.` }, { status: 400 });
    }

    const mimeMatch = image.match(/data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const today = new Date().toISOString().split('T')[0];

    const prompt = `Eres Quioba, un asistente IA familiar inteligente. Analiza esta imagen y determina qué tipo de contenido muestra.

Analiza la imagen y clasifica en una o varias de estas categorías:
1. "shopping" — Si ves un producto, alimento, objeto que se puede comprar, una lista de compras, un estante de tienda
2. "task" — Si ves texto con fechas, citas, eventos, recordatorios, capturas de mensajes con información de agenda (ej: "dentista a las 17:00", "reunión el lunes")
3. "receipt" — Si ves un ticket, factura o recibo de compra
4. "medicine" — Si ves un medicamento, caja de pastillas, prospecto
5. "info" — Si es cualquier otra cosa (paisaje, documento genérico, foto personal, etc.)

Para CADA categoría detectada, genera una sugerencia de acción que el usuario pueda ejecutar.

RESPONDE SOLO CON JSON VÁLIDO (sin markdown, sin backticks). El formato EXACTO:
{"analysis":"Descripción breve de lo que ves en español","suggestions":[{"type":"shopping","action":"add_to_shopping","label":"Añadir X a la compra","icon":"🛒","data":{"name":"nombre","category":"categoría"}},{"type":"task","action":"create_task","label":"Crear tarea X","icon":"📋","data":{"title":"título","due_date":"${today}","description":"detalles"}}]}

Categorías válidas para compra: Lácteos, Carnes, Frutas, Verduras, Limpieza, Higiene, Bebidas, Panadería, Congelados, Otros

REGLAS:
- Si ves un PRODUCTO: sugiere añadir a la compra con action "add_to_shopping"
- Si ves TEXTO con FECHAS/EVENTOS: crea sugerencias con action "create_task"
- Si ves un MEDICAMENTO: sugiere con action "add_medicine"
- Siempre incluye al menos 1 sugerencia, máximo 4
- Fecha de hoy: ${today}
- Idioma: español`;

    const groqBody = {
      model: GROQ_VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 800,
    };

    console.log(`[analyze-image] Calling Groq API with model ${GROQ_VISION_MODEL}`);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groqBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[analyze-image] Groq API error:', response.status, errText);

      let userError = `Error de IA (${response.status})`;
      if (response.status === 401) userError = 'Clave API inválida';
      else if (response.status === 413) userError = 'Imagen demasiado grande para el modelo';
      else if (response.status === 429) userError = 'Demasiadas peticiones, espera un momento';
      else if (response.status === 400) {
        if (errText.includes('too large') || errText.includes('maximum')) userError = 'Imagen demasiado grande para el modelo';
        else userError = `Error en la petición: ${errText.substring(0, 100)}`;
      }

      return NextResponse.json({ error: userError }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('[analyze-image] Raw response:', content.substring(0, 300));

    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      console.error('[analyze-image] JSON parse error. Content:', cleaned.substring(0, 200));
      const analysisText = cleaned || 'No he podido analizar la imagen correctamente.';
      result = {
        analysis: analysisText.length > 200 ? analysisText.substring(0, 200) + '...' : analysisText,
        suggestions: [{ type: 'info', action: 'none', label: 'Intenta con otra imagen', icon: '🔄', data: {} }],
      };
    }

    if (!result.suggestions || !Array.isArray(result.suggestions)) {
      result.suggestions = [{ type: 'info', action: 'none', label: 'No se detectaron acciones', icon: 'ℹ️', data: {} }];
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[analyze-image] Error:', error.message, error.stack);
    return NextResponse.json({ error: `Error interno: ${error.message}` }, { status: 500 });
  }
}
