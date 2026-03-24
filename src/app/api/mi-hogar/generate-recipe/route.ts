import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { checkApiLimit, getAuthUser, recordApiUsage } from '@/lib/api-limit';

const apiKey = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '';

export async function POST(request: Request) {
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Clave API no configurada' }, { status: 500 });
  }

  try {
    const user = await getAuthUser(request);
    if (user) {
      const limitCheck = await checkApiLimit(user.id, user.email || null, 'generate-recipe');
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { success: false, error: `Límite mensual alcanzado (${limitCheck.used}/${limitCheck.limit})` },
          { status: 429 }
        );
      }
    }

    const { pantryItems } = await request.json();
    if (!Array.isArray(pantryItems) || pantryItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'La despensa está vacía. Añade productos primero.' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(`Actúa como un chef y crea una receta con estos ingredientes: ${pantryItems.join(', ')}.
Devuelve solo JSON:
{
  "title": "Nombre",
  "description": "Resumen apetitoso",
  "cooking_time": "Tiempo",
  "difficulty": "Fácil/Media/Difícil",
  "ingredients": [{"name":"Ingrediente","quantity":"Cantidad","has_it":true}],
  "steps": ["Paso 1", "Paso 2"]
}`);

    const parsed = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

    if (user) {
      await recordApiUsage(user.id, 'generate-recipe');
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('[Generate Recipe] Error:', error);
    return NextResponse.json({ success: false, error: `Error interno: ${error.message}` }, { status: 500 });
  }
}
