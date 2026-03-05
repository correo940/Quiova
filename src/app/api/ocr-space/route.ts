import { NextRequest, NextResponse } from 'next/server';
import { checkApiLimit, recordApiUsage, getAuthUser } from '@/lib/api-limit';

export async function POST(req: NextRequest) {
    try {
        // --- API USAGE LIMIT CHECK ---
        const user = await getAuthUser(req);
        if (user) {
            const limitCheck = await checkApiLimit(user.id, user.email || null, 'ocr-space');
            if (!limitCheck.allowed) {
                return NextResponse.json({ error: `Límite mensual alcanzado (${limitCheck.used}/${limitCheck.limit})` }, { status: 429 });
            }
        }

        const formData = await req.formData();

        // Forward to OCR.space
        // We need to reconstruct the FormData because passing it directly can be tricky with boundaries
        const upstreamFormData = new FormData();
        // Append all fields from the incoming request
        for (const [key, value] of formData.entries()) {
            upstreamFormData.append(key, value);
        }

        const response = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            headers: {
                "apikey": upstreamFormData.get("apikey") as string || "helloworld", // Header or Body
                // boundaries are automatic with FormData
            },
            body: upstreamFormData
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: "OCR.space API Error", details: errorText }, { status: response.status });
        }

        const data = await response.json();

        // Record usage
        if (user) await recordApiUsage(user.id, 'ocr-space');

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("OCR.space Proxy Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
