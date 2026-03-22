import { NextRequest, NextResponse } from 'next/server';
import { checkApiLimit, recordApiUsage, getAuthUser } from '@/lib/api-limit';

const ZAI_API_KEY = "1bdabb5b5aa74056b675415c4e24a8a9.Eleh6rSO6x43XSOH";
const ZAI_API_URL = "https://api.z.ai/api/paas/v4/chat/completions";
const MODEL = "glm-4.6v-flash";

export async function POST(request: NextRequest) {
    try {
        // --- API USAGE LIMIT CHECK ---
        const user = await getAuthUser(request);
        if (user) {
            const limitCheck = await checkApiLimit(user.id, user.email || null, 'zai-ocr');
            if (!limitCheck.allowed) {
                return NextResponse.json({ error: `Límite mensual alcanzado (${limitCheck.used}/${limitCheck.limit})` }, { status: 429 });
            }
        }

        const { base64Image, prompt } = await request.json();

        if (!base64Image || !prompt) {
            return NextResponse.json({ error: 'Missing base64Image or prompt' }, { status: 400 });
        }

        // Determine mime type from base64 header
        let mimeType = 'image/jpeg';
        if (base64Image.startsWith('data:')) {
            const match = base64Image.match(/data:([^;]+);/);
            if (match) mimeType = match[1];
        }

        // Extract pure base64 data
        const pureBase64 = base64Image.includes(',')
            ? base64Image.split(',')[1]
            : base64Image;

        const body = {
            model: MODEL,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${pureBase64}`
                            }
                        },
                        {
                            type: "text",
                            text: prompt
                        }
                    ]
                }
            ],
            max_tokens: 8192,
            temperature: 0.1,
            stream: false
        };

        const response = await fetch(ZAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ZAI_API_KEY}`
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[ZAI-OCR] API Error:', data);
            return NextResponse.json(
                { error: data.error?.message || 'Z.ai API Error' },
                { status: response.status }
            );
        }

        const content = data.choices?.[0]?.message?.content || '';
        const tokens = data.usage?.total_tokens || 0;

        // Record usage
        if (user) await recordApiUsage(user.id, 'zai-ocr');

        return NextResponse.json({ content, tokens });

    } catch (error: any) {
        console.error('[ZAI-OCR] Server error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
