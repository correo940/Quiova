import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

const pdf = require('pdf-parse');

const ZAI_API_KEY = "1bdabb5b5aa74056b675415c4e24a8a9.Eleh6rSO6x43XSOH";
const ZAI_API_URL = "https://api.z.ai/api/paas/v4/chat/completions";
const MODEL = "glm-4.6v-flash";

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
            // PDF: extract text with pdf-parse
            const pdfData = await pdf(buffer);
            extractedText = pdfData.text;
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
            // Excel/CSV: parse with xlsx
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Convert to CSV text for AI to analyze
            extractedText = XLSX.utils.sheet_to_csv(sheet, { FS: ' | ', RS: '\n' });
        } else {
            return NextResponse.json({ error: 'Formato no soportado. Usa PDF, XLSX, XLS o CSV.' }, { status: 400 });
        }

        if (!extractedText || extractedText.trim().length < 20) {
            return NextResponse.json({ error: 'No se pudo extraer texto del archivo. ¿Está vacío o es un PDF de imagen?' }, { status: 400 });
        }

        // Truncate if too long (Z.ai has token limits)
        const maxChars = 12000;
        const textForAI = extractedText.length > maxChars
            ? extractedText.substring(0, maxChars) + '\n\n[...texto truncado por longitud...]'
            : extractedText;

        // --- SEND TO Z.AI ---
        const body = {
            model: MODEL,
            messages: [
                {
                    role: "user",
                    content: PROMPT + textForAI
                }
            ],
            max_tokens: 8192,
            temperature: 0.05,
            stream: false
        };

        // --- RETRY LOGIC FOR RATE LIMITS (kept short for Vercel timeout) ---
        const MAX_RETRIES = 1;
        let response: Response | null = null;
        let data: any = null;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            response = await fetch(ZAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ZAI_API_KEY}`
                },
                body: JSON.stringify(body)
            });

            data = await response.json();

            if (response.ok) break;

            // If rate limited (429), wait briefly and retry once
            if (response.status === 429 && attempt < MAX_RETRIES) {
                console.log(`[BANK-STATEMENT] Rate limited (429). Retrying in 1.5s...`);
                await new Promise(resolve => setTimeout(resolve, 1500));
                continue;
            }

            // Non-retryable error or max retries exceeded
            console.error('[BANK-STATEMENT] Z.ai API Error:', data);
            return NextResponse.json(
                {
                    error: response.status === 429
                        ? 'La IA está sobrecargada. Espera unos segundos e inténtalo de nuevo.'
                        : (data.error?.message || 'Error de la API de IA')
                },
                { status: response.status }
            );
        }

        const content = data.choices?.[0]?.message?.content || '';

        // --- PARSE AI RESPONSE ---
        // Robust JSON extraction: handles markdown code blocks, surrounding text, etc.
        let transactions: any[] = [];
        try {
            let cleaned = content.trim();

            // Strategy 1: Remove markdown code blocks
            cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```$/i, '');

            // Strategy 2: Try direct parse
            try {
                const parsed = JSON.parse(cleaned);
                transactions = Array.isArray(parsed) ? parsed : [];
            } catch {
                // Strategy 3: Find JSON array within the text using regex
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    transactions = JSON.parse(jsonMatch[0]);
                } else {
                    // Strategy 4: Try to find individual JSON objects and wrap them
                    const objectMatches = content.match(/\{[^{}]*"date"[^{}]*\}/g);
                    if (objectMatches && objectMatches.length > 0) {
                        transactions = JSON.parse('[' + objectMatches.join(',') + ']');
                    } else {
                        throw new Error('No se encontró JSON válido en la respuesta');
                    }
                }
            }

            if (!Array.isArray(transactions)) {
                throw new Error('La respuesta no es un array');
            }

            // Validate and clean each transaction
            transactions = transactions
                .filter(tx => tx.date && tx.description && tx.amount !== undefined)
                .map(tx => ({
                    date: String(tx.date),
                    description: String(tx.description).substring(0, 200),
                    amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount).replace(',', '.')) || 0
                }));

        } catch (parseError) {
            console.error('[BANK-STATEMENT] JSON Parse Error:', parseError, '\nRaw content:', content);
            return NextResponse.json(
                { error: 'La IA no devolvió un formato válido. Intenta de nuevo o con otro archivo.', raw: content.substring(0, 500) },
                { status: 422 }
            );
        }

        if (transactions.length === 0) {
            return NextResponse.json(
                { error: 'No se detectaron movimientos en el archivo.' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            transactions,
            count: transactions.length,
            source: fileName
        });

    } catch (error: any) {
        console.error('[BANK-STATEMENT] Server error:', error);
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
