import { NextResponse } from 'next/server';

// Gemini 2.5 Flash TTS — Google AI Studio (gratuito, sin facturación)
export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Sin GEMINI_API_KEY' }, { status: 500 });
        }

        const { text } = await req.json();
        if (!text?.trim()) {
            return NextResponse.json({ error: 'Texto vacío' }, { status: 400 });
        }

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: text.slice(0, 500) }] }],
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: 'Aoede' },
                            },
                        },
                    },
                }),
                signal: AbortSignal.timeout(10000),
            }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('[tts-google] Gemini error:', err?.error?.message);
            // 422 → el cliente usará Web Speech como fallback
            return NextResponse.json({ error: 'Gemini TTS falló' }, { status: 422 });
        }

        const data = await res.json();
        const part = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

        if (!part?.data) {
            return NextResponse.json({ error: 'Sin audio en respuesta' }, { status: 422 });
        }

        // Gemini devuelve PCM 24kHz — envolvemos en WAV para que el browser lo reproduzca
        const pcm = Buffer.from(part.data, 'base64');
        const wav = pcmToWav(pcm, 24000, 1, 16);

        return new Response(wav, {
            headers: { 'Content-Type': 'audio/wav' },
        });

    } catch (e: any) {
        console.error('[tts-google]', e.message);
        return NextResponse.json({ error: e.message }, { status: 422 });
    }
}

function pcmToWav(pcm: Buffer, sampleRate: number, channels: number, bitDepth: number): Buffer {
    const byteRate = (sampleRate * channels * bitDepth) / 8;
    const blockAlign = (channels * bitDepth) / 8;
    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitDepth, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);

    return Buffer.concat([header, pcm]);
}
