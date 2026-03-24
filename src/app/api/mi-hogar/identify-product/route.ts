import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { checkApiLimit, getAuthUser, recordApiUsage } from '@/lib/api-limit';

const apiKey = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Clave API no configurada en el servidor' },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const user = await getAuthUser(request);
    if (user) {
      const limitCheck = await checkApiLimit(user.id, user.email || null, 'identify-product');
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { success: false, error: `Límite mensual alcanzado (${limitCheck.used}/${limitCheck.limit})` },
          { status: 429, headers: corsHeaders }
        );
      }
    }

    const body = await request.json();
    const base64Image = body.image || body.base64Image;

    if (!base64Image) {
      return NextResponse.json(
        { success: false, error: 'Imagen no proporcionada' },
        { status: 400, headers: corsHeaders }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `Identifica el producto en esta imagen.
Devuelve un JSON con:
{
  "productName": "Nombre del producto",
  "supermarket": "Supermercado si se puede deducir"
}
Si no se puede identificar, devuelve {"productName":"Desconocido","supermarket":null}.`;

    const base64Data = base64Image.includes('base64,')
      ? base64Image.split('base64,')[1]
      : base64Image;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg',
        },
      },
    ]);

    const content = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(content);

    if (parsed.productName?.toLowerCase().includes('desconocido')) {
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el producto' },
        { headers: corsHeaders }
      );
    }

    if (user) {
      await recordApiUsage(user.id, 'identify-product');
    }

    return NextResponse.json(
      {
        success: true,
        productName: parsed.productName,
        supermarket: parsed.supermarket || undefined,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[Identify Product] Error:', error);
    return NextResponse.json(
      { success: false, error: `Error interno: ${error.message}` },
      { status: 500, headers: corsHeaders }
    );
  }
}
