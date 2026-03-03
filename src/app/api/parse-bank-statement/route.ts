import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import Groq from 'groq-sdk';

// --- AI PROVIDERS ---
const ZAI_API_KEY = "1bdabb5b5aa74056b675415c4e24a8a9.Eleh6rSO6x43XSOH";
const ZAI_API_URL = "https://api.z.ai/api/paas/v4/chat/completions";
const ZAI_MODEL = "glm-4.6v-flash";

const groq = new Groq({ apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || "" });
const GROQ_MODEL = "llama-3.3-70b-versatile";

const PROMPT = `Eres un experto en extractos bancarios españoles y europeos. Analiza el siguiente texto extraído de un extracto bancario y extrae TODAS las transacciones/movimientos que encuentres.

REGLAS ESTRICTAS:
1. Devuelve ÚNICAMENTE un JSON array válido, sin texto adicional, sin markdown, sin explicaciones.
2. Cada elemento debe tener exactamente este formato: {"date":"YYYY-MM-DD","description":"texto descriptivo","amount":123.45}
3. amount POSITIVO = ingreso/abono. amount NEGATIVO = gasto/cargo/débito.
4. Convierte TODAS las fechas al formato YYYY-MM-DD. Si el año no aparece, usa 2025.
5. NO incluyas líneas de saldo, totales, o resúmenes. Solo movimientos individuales.
6. Si un importe usa coma como decimal (ej: 1.234,56), conviértelo a punto decimal (ej: 1234.56).
7. Limpia las descripciones: quita espacios extra, caracteres raros, y códigos internos del banco.

Texto del extracto:
`;

// --- AI CALL FUNCTIONS ---

async function callZai(textForAI: string): Promise<string> {
    const body = {
        model: ZAI_MODEL,
        messages: [{ role: "user", content: PROMPT + textForAI }],
        max_tokens: 8192,
        temperature: 0.05,
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

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Z.ai error ${response.status}: ${err.error?.message || 'API Error'}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

async function callGroq(textForAI: string): Promise<string> {
    const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: PROMPT + textForAI }],
        model: GROQ_MODEL,
        temperature: 0.05,
        max_tokens: 8192,
        stream: false
    });

    return chatCompletion.choices?.[0]?.message?.content || '';
}

// --- PARSE JSON FROM AI ---

function parseAIResponse(content: string): any[] {
    let cleaned = content.trim();

    // Strategy 1: Remove markdown code blocks
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```$/i, '');

    // Strategy 2: Try direct parse
    try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return parsed;
    } catch { /* continue */ }

    // Strategy 3: Find JSON array within the text using regex
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
        try { return JSON.parse(jsonMatch[0]); } catch { /* continue */ }
    }

    // Strategy 4: Find individual JSON objects with "date" key
    const objectMatches = content.match(/\{[^{}]*"date"[^{}]*\}/g);
    if (objectMatches && objectMatches.length > 0) {
        try { return JSON.parse('[' + objectMatches.join(',') + ']'); } catch { /* continue */ }
    }

    throw new Error('No se encontró JSON válido en la respuesta de la IA');
}

// --- MAIN HANDLER ---

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No se ha subido ningún archivo.' }, { status: 400 });
        }

        const fileName = file.name.toLowerCase();
        let extractedText = '';

        // --- EXTRACT TEXT BASED ON FILE TYPE ---
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (fileName.endsWith('.pdf')) {
            const pdfModule = await import('pdf-parse') as any;
            const pdfParse = pdfModule.default || pdfModule;
            const pdfData = await pdfParse(buffer);
            extractedText = pdfData.text;
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            extractedText = XLSX.utils.sheet_to_csv(sheet, { FS: ' | ', RS: '\n' });
        } else {
            return NextResponse.json({ error: 'Formato no soportado. Usa PDF, XLSX, XLS o CSV.' }, { status: 400 });
        }

        if (!extractedText || extractedText.trim().length < 20) {
            return NextResponse.json({ error: 'No se pudo extraer texto del archivo. ¿Está vacío o es un PDF de imagen?' }, { status: 400 });
        }

        // Truncate if too long
        const maxChars = 12000;
        const textForAI = extractedText.length > maxChars
            ? extractedText.substring(0, maxChars) + '\n\n[...texto truncado por longitud...]'
            : extractedText;

        // --- TRY Z.AI FIRST, FALLBACK TO GROQ ---
        let content = '';
        let provider = 'z.ai';

        try {
            console.log('[BANK-STATEMENT] Trying Z.ai...');
            content = await callZai(textForAI);
        } catch (zaiError: any) {
            console.warn('[BANK-STATEMENT] Z.ai failed:', zaiError.message, '— Falling back to Groq...');
            try {
                provider = 'groq';
                content = await callGroq(textForAI);
            } catch (groqError: any) {
                console.error('[BANK-STATEMENT] Groq also failed:', groqError.message);
                return NextResponse.json(
                    { error: 'Ambas IAs fallaron. Inténtalo de nuevo en unos segundos.' },
                    { status: 503 }
                );
            }
        }

        if (!content) {
            return NextResponse.json({ error: 'La IA no devolvió contenido.' }, { status: 422 });
        }

        // --- PARSE AI RESPONSE ---
        let transactions: any[] = [];
        try {
            transactions = parseAIResponse(content);

            // Validate and clean
            transactions = transactions
                .filter(tx => tx.date && tx.description && tx.amount !== undefined)
                .map(tx => ({
                    date: String(tx.date),
                    description: String(tx.description).substring(0, 200),
                    amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount).replace(',', '.')) || 0
                }));

        } catch (parseError) {
            console.error('[BANK-STATEMENT] JSON Parse Error:', parseError, '\nRaw:', content.substring(0, 300));
            return NextResponse.json(
                { error: 'La IA no devolvió un formato válido. Intenta de nuevo o con otro archivo.' },
                { status: 422 }
            );
        }

        if (transactions.length === 0) {
            return NextResponse.json({ error: 'No se detectaron movimientos en el archivo.' }, { status: 400 });
        }

        return NextResponse.json({
            transactions,
            count: transactions.length,
            source: fileName,
            provider
        });

    } catch (error: any) {
        console.error('[BANK-STATEMENT] Server error:', error);
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
