import { NextRequest, NextResponse } from 'next/server';
import { checkApiLimit, getAuthUser, recordApiUsage } from '@/lib/api-limit';
import { extractTextFromFile } from '@/lib/document-engine/ocr';
import { extractStructuredJson } from '@/lib/document-engine/llm-extract';

export const runtime = 'nodejs';

const ALLOWED_TYPES = ['flight', 'hotel', 'activity', 'transport', 'other'];
const MIN_EXTRACTED_TEXT_LENGTH = 10;

type DocumentAnalysis = {
    asset_type: string;
    title: string;
    reference_code: string | null;
    event_date: string | null;
    location: string | null;
    summary: string;
    confidence: number;
};

function sanitizeText(value: string | null | undefined) {
    return value?.trim() || null;
}

function buildFallbackAnalysis(fileName: string, extractedText: string): DocumentAnalysis {
    const lower = `${fileName} ${extractedText}`.toLowerCase();

    let asset_type = 'other';
    if (/(vuelo|flight|boarding|tarjeta de embarque|aerolinea|iberia|ryanair|vueling)/.test(lower)) asset_type = 'flight';
    else if (/(hotel|reserva|check-in|booking\.com|alojamiento)/.test(lower)) asset_type = 'hotel';
    else if (/(tren|renfe|bus|autobus|alquiler de coche|transporte)/.test(lower)) asset_type = 'transport';
    else if (/(entrada|tour|visita guiada|museo|actividad)/.test(lower)) asset_type = 'activity';

    const rawTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
    const title = (rawTitle.length > 3 ? rawTitle : 'Documento de viaje').slice(0, 60);

    return {
        asset_type,
        title,
        reference_code: null,
        event_date: null,
        location: null,
        summary: extractedText.trim().slice(0, 150),
        confidence: extractedText.trim() ? 0.4 : 0.1,
    };
}

function normalizeAnalysis(data: any, fallback: DocumentAnalysis): DocumentAnalysis {
    const asset_type = ALLOWED_TYPES.includes(data?.asset_type) ? data.asset_type : fallback.asset_type;
    const confidence = typeof data?.confidence === 'number'
        ? Math.max(0, Math.min(1, data.confidence))
        : fallback.confidence;

    return {
        asset_type,
        title: typeof data?.title === 'string' && data.title.trim() ? data.title.trim().slice(0, 80) : fallback.title,
        reference_code: sanitizeText(data?.reference_code),
        event_date: sanitizeText(data?.event_date),
        location: sanitizeText(data?.location),
        summary: typeof data?.summary === 'string' && data.summary.trim() ? data.summary.trim() : fallback.summary,
        confidence,
    };
}

const TRIP_DOCUMENT_SYSTEM_PROMPT = `Eres un asistente que extrae informacion clave de documentos de viaje (billetes de avion, tarjetas de embarque, reservas de hotel, entradas, billetes de tren/bus) a partir de texto OCR. Responde en JSON estricto con este esquema exacto:
{
  "asset_type": "flight|hotel|activity|transport|other",
  "title": "string breve, ej. 'Vuelo IB3172 Madrid-Lisboa' o 'Hotel Alfama'",
  "reference_code": "codigo de reserva/localizador o null",
  "event_date": "YYYY-MM-DDTHH:mm:ss o YYYY-MM-DD si no hay hora, o null",
  "location": "ciudad/direccion relevante o null",
  "summary": "resumen breve en espanol",
  "confidence": 0.0
}
Si un dato no esta claro, usa null.`;

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
        }

        const limitCheck = await checkApiLimit(user.id, user.email || null, 'trip-document-analysis');
        if (!limitCheck.allowed) {
            return NextResponse.json(
                { error: `Has alcanzado el límite mensual de ${limitCheck.limit} escaneos. (${limitCheck.used}/${limitCheck.limit})` },
                { status: 429 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file');

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'No se ha enviado ningún documento.' }, { status: 400 });
        }

        const fileName = file.name || 'documento';
        const fileType = file.type || '';
        const isPdf = fileType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
        const isImage = fileType.startsWith('image/');

        if (!isImage && !isPdf) {
            return NextResponse.json({ error: 'Solo se admiten PNG/JPG o PDF.' }, { status: 400 });
        }

        const extractedText = await extractTextFromFile(file, fileName, fileType || (isPdf ? 'application/pdf' : 'image/jpeg'));

        if (!extractedText || extractedText.trim().length < MIN_EXTRACTED_TEXT_LENGTH) {
            return NextResponse.json(
                { error: 'No se detectó texto en el documento. Asegúrate de que la foto sea nítida.' },
                { status: 422 }
            );
        }

        const fallback = buildFallbackAnalysis(fileName, extractedText);
        let analysis = fallback;

        const userPrompt = `Nombre del archivo: ${fileName}\n\nTexto extraído:\n${extractedText.slice(0, 14000)}`;
        const { data: parsed, provider } = await extractStructuredJson(TRIP_DOCUMENT_SYSTEM_PROMPT, userPrompt);
        if (parsed) {
            analysis = normalizeAnalysis(parsed, fallback);
        }

        await recordApiUsage(user.id, 'trip-document-analysis');

        return NextResponse.json({
            analysis,
            extracted_text: extractedText,
            model: provider || 'fallback',
        });
    } catch (error: any) {
        console.error('[Trip Document Analyze] Error:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
