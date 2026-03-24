import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import * as XLSX from 'xlsx';
import { checkApiLimit, getAuthUser, recordApiUsage } from '@/lib/api-limit';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const GEMINI_MODEL = 'gemini-2.5-flash';

const PROMPT = `Eres un experto en extractos bancarios españoles y europeos. Analiza el siguiente texto y extrae todas las transacciones.
Devuelve únicamente un JSON array válido con elementos de este tipo:
{"date":"YYYY-MM-DD","description":"texto descriptivo","amount":123.45}
Importe positivo = ingreso. Importe negativo = gasto.`;

async function callGemini(textForAI: string) {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(`${PROMPT}\n\n${textForAI}`);
  return result.response.text();
}

function parseAIResponse(content: string) {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  }

  throw new Error('No se encontró JSON válido en la respuesta de la IA');
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const limitCheck = await checkApiLimit(user.id, user.email || null, 'parse-bank-statement');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Has alcanzado el límite mensual de ${limitCheck.limit} usos para esta función. (Usados: ${limitCheck.used}/${limitCheck.limit})`,
          used: limitCheck.used,
          limit: limitCheck.limit,
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se ha subido ningún archivo.' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = '';

    if (fileName.endsWith('.pdf')) {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      extractedText = textResult.text;
      await parser.destroy();
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      extractedText = XLSX.utils.sheet_to_csv(sheet, { FS: ' | ', RS: '\n' });
    } else {
      return NextResponse.json({ error: 'Formato no soportado. Usa PDF, XLSX, XLS o CSV.' }, { status: 400 });
    }

    if (extractedText.trim().length < 20) {
      return NextResponse.json(
        { error: 'No se pudo extraer texto del archivo. ¿Está vacío o es un PDF de imagen?' },
        { status: 400 }
      );
    }

    const rawResponse = await callGemini(extractedText);
    const transactions = parseAIResponse(rawResponse)
      .filter((tx: any) => tx.date && tx.description && tx.amount !== undefined)
      .map((tx: any) => ({
        date: String(tx.date),
        description: String(tx.description).slice(0, 200),
        amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount).replace(',', '.')) || 0,
      }));

    if (transactions.length === 0) {
      return NextResponse.json({ error: 'No se detectaron movimientos en el archivo.' }, { status: 400 });
    }

    await recordApiUsage(user.id, 'parse-bank-statement');

    return NextResponse.json({
      transactions,
      count: transactions.length,
      source: fileName,
      provider: 'gemini',
    });
  } catch (error: any) {
    console.error('[Parse Bank Statement] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
