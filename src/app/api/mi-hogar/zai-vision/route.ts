import { NextResponse } from 'next/server';
import { checkApiLimit, getAuthUser, recordApiUsage } from '@/lib/api-limit';
import { requireUser } from '@/lib/require-user';

const ZAI_API_KEY = process.env.ZAI_API_KEY || '';
const ZAI_API_URL = 'https://api.z.ai/api/paas/v4/chat/completions';
const MODEL = 'glm-4.6v-flash';

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

  if (!ZAI_API_KEY) {
    return NextResponse.json(
      { error: 'Clave de Z.AI no configurada en el servidor' },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const user = await getAuthUser(request);
    if (user) {
      const limitCheck = await checkApiLimit(user.id, user.email || null, 'zai-vision');
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { error: `Límite mensual alcanzado (${limitCheck.used}/${limitCheck.limit})` },
          { status: 429, headers: corsHeaders }
        );
      }
    }

    const { base64Image, prompt } = await request.json();
    if (!base64Image || !prompt) {
      return NextResponse.json(
        { error: 'Faltan base64Image o prompt' },
        { status: 400, headers: corsHeaders }
      );
    }

    let mimeType = 'image/jpeg';
    let pureBase64 = base64Image;
    if (base64Image.startsWith('data:')) {
      const match = base64Image.match(/data:([^;]+);/);
      if (match) mimeType = match[1];
      pureBase64 = base64Image.split(',')[1] || base64Image;
    }

    const zaiRes = await fetch(ZAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ZAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${pureBase64}` } },
              { type: 'text', text: prompt },
            ],
          },
        ],
        max_tokens: 8192,
        temperature: 0.1,
        stream: false,
      }),
    });

    const data = await zaiRes.json();

    if (!zaiRes.ok) {
      console.error('[zai-vision] Z.AI error:', JSON.stringify(data));
      return NextResponse.json(
        { error: data.error?.message || `Z.AI API Error ${zaiRes.status}` },
        { status: 502, headers: corsHeaders }
      );
    }

    if (user) {
      await recordApiUsage(user.id, 'zai-vision');
    }

    const content = data.choices?.[0]?.message?.content || '';
    const tokens = data.usage?.total_tokens || 0;

    return NextResponse.json({ content, tokens }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('[zai-vision] Error:', error);
    return NextResponse.json(
      { error: `Error interno: ${error.message}` },
      { status: 500, headers: corsHeaders }
    );
  }
}
