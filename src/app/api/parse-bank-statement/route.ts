import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- AI PROVIDERS ---
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
const GEMINI_MODEL = "gemini-1.5-flash"; // Generous free tier, fast, and multi-modal if needed

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

async function callGemini(textForAI: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(PROMPT + textForAI);
    const response = await result.response;
    return response.text();
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

        // --- SPLIT INTO CHUNKS IF NEEDED ---
        const MAX_CHUNK = 28000; // Groq supports 128K context, Z.ai ~32K
        const chunks: string[] = [];

        if (extractedText.length <= MAX_CHUNK) {
            chunks.push(extractedText);
        } else {
            // Split by lines to avoid cutting mid-transaction
            const lines = extractedText.split('\n');
            let currentChunk = '';
            for (const line of lines) {
                if ((currentChunk + '\n' + line).length > MAX_CHUNK && currentChunk.length > 0) {
                    chunks.push(currentChunk);
                    currentChunk = line;
                } else {
                    currentChunk += (currentChunk ? '\n' : '') + line;
                }
            }
            if (currentChunk) chunks.push(currentChunk);
            console.log(`[BANK-STATEMENT] Text split into ${chunks.length} chunks`);
        }

        // --- CALL AI FOR EACH CHUNK ---
        let allContent: string[] = [];
        let provider = 'gemini';

        async function callAI(text: string): Promise<string> {
            try {
                return await callGemini(text);
            } catch (error: any) {
                console.error('[BANK-STATEMENT] Gemini API failed:', error.message);
                throw error;
            }
        }

        for (let i = 0; i < chunks.length; i++) {
            console.log(`[BANK-STATEMENT] Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);
            try {
                const result = await callAI(chunks[i]);
                if (result) allContent.push(result);
            } catch (err: any) {
                console.error(`[BANK-STATEMENT] Chunk ${i + 1} failed:`, err.message);
                // Continue with other chunks
            }
        }

        if (allContent.length === 0) {
            return NextResponse.json(
                { error: 'Ambas IAs fallaron en todos los intentos. Inténtalo de nuevo.' },
                { status: 503 }
            );
        }

        const content = allContent.join('\n');

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
