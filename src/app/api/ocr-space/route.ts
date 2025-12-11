import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
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
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("OCR.space Proxy Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
