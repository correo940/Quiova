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
      const limitCheck = await checkApiLimit(user.id, user.email || null, 'identify-medicine');
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { success: false, error: `Límite mensual alcanzado (${limitCheck.used}/${limitCheck.limit})` },
          { status: 429 }
        );
      }
    }

    const { base64Image } = await request.json();
    if (!base64Image) {
      return NextResponse.json({ success: false, error: 'Imagen no proporcionada' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent([
      `Analiza esta imagen de una caja de medicamento y devuelve solo JSON:
{
  "name": "Nombre del medicamento",
  "description": "Para qué sirve en una frase",
  "expiration_date": "YYYY-MM-DD o null"
}`,
      {
        inlineData: {
          data: base64Image.replace(/^data:image\/\w+;base64,/, ''),
          mimeType: 'image/jpeg',
        },
      },
    ]);

    const parsed = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

    if (user) {
      await recordApiUsage(user.id, 'identify-medicine');
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('[Identify Medicine] Error:', error);
    return NextResponse.json({ success: false, error: `Error interno: ${error.message}` }, { status: 500 });
  }
}
