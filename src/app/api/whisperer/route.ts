import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = "https://llmwhisperer-api.us-central.unstract.com/api/v2";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');
        const apiKey = req.headers.get('unstract-key');

        if (!file || !apiKey) {
            return NextResponse.json({ error: "Missing file or API key" }, { status: 400 });
        }

        // Forward to LLM Whisperer
        const upstreamFormData = new FormData();
        upstreamFormData.append("file", file);
        upstreamFormData.append("mode", "layout_preserving");
        upstreamFormData.append("output_format", "text");

        const response = await fetch(`${BASE_URL}/whisper`, {
            method: "POST",
            headers: {
                "unstract-key": apiKey
            },
            body: upstreamFormData
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("LLM Whisperer POST Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const hash = searchParams.get('hash');
        const apiKey = req.headers.get('unstract-key');

        if (!hash || !apiKey) {
            return NextResponse.json({ error: "Missing hash or API key" }, { status: 400 });
        }

        const response = await fetch(`${BASE_URL}/whisper-status?whisper_hash=${hash}`, {
            method: "GET",
            headers: {
                "unstract-key": apiKey
            }
        });

        if (!response.ok) {
            return NextResponse.json({ error: "Status Check Failed" }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("LLM Whisperer GET Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
