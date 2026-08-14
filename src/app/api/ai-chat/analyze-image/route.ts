import { NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export async function POST(req: Request) {
  try {
    const { image, userId } = await req.json();

    if (!GROQ_API_KEY) {
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

    const prompt = `Eres Quioba, un asistente IA familiar inteligente. Analiza esta imagen y determina qué tipo de contenido muestra.

DEBES responder SOLO con JSON válido (sin markdown, sin \`\`\`).

Analiza la imagen y clasifica en una o varias de estas categorías:
1. "shopping" — Si ves un producto, alimento, objeto que se puede comprar, una lista de compras, un estante de tienda
2. "task" — Si ves texto con fechas, citas, eventos, recordatorios, capturas de mensajes con información de agenda (ej: "dentista a las 17:00", "reunión el lunes")
3. "receipt" — Si ves un ticket, factura o recibo de compra
4. "medicine" — Si ves un medicamento, caja de pastillas, prospecto
5. "info" — Si es cualquier otra cosa (paisaje, documento genérico, foto personal, etc.)

Para CADA categoría detectada, genera una sugerencia de acción que el usuario pueda ejecutar.

FORMATO DE RESPUESTA:
{
  "analysis": "Descripción breve y amigable de lo que ves en la imagen (1-2 frases en español)",
  "suggestions": [
    {
      "type": "shopping",
      "action": "add_to_shopping",
      "label": "Texto del botón de acción",
      "icon": "emoji apropiado",
      "data": {
        "name": "nombre del producto",
        "category": "categoría (Lácteos, Carnes, Frutas, Verduras, Limpieza, Higiene, Bebidas, Panadería, Congelados, Otros)"
      }
    },
    {
      "type": "task",
      "action": "create_task",
      "label": "Texto del botón de acción",
      "icon": "emoji apropiado",
      "data": {
        "title": "título de la tarea",
        "due_date": "YYYY-MM-DD si se detecta fecha",
        "due_time": "HH:MM si se detecta hora",
        "description": "detalles adicionales"
      }
    }
  ]
}

REGLAS:
- Si ves un PRODUCTO: sugiere añadir a la compra Y opcionalmente crear recordatorio de compra
- Si ves TEXTO con FECHAS/EVENTOS: extrae CADA evento como sugerencia de tarea separada. Lee bien nombres, fechas y horas
- Si ves un RECIBO: sugiere registrar el gasto
- Si ves un MEDICAMENTO: sugiere añadirlo a medicación
- Si no puedes clasificar claramente: usa tipo "info" con una descripción útil
- Siempre incluye al menos 1 sugerencia
- Máximo 4 sugerencias
- Fecha de hoy: ${new Date().toISOString().split('T')[0]}
- Idioma: español`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
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
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[analyze-image] Groq error:', err);
      return NextResponse.json({ error: 'Error al analizar la imagen' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      result = {
        analysis: 'No he podido analizar la imagen correctamente.',
        suggestions: [{ type: 'info', action: 'none', label: 'Intenta con otra imagen', icon: '🔄', data: {} }],
      };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[analyze-image] Error:', error.message);
    return NextResponse.json({ error: 'Error interno al procesar la imagen' }, { status: 500 });
  }
}
