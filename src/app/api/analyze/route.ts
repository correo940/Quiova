import { NextResponse } from 'next/server';
import OpenAI from 'openai';
// Usar require para compatibilidad con pdf-parse
const pdf = require('pdf-parse');
import fs from 'fs';
import os from 'os';
import path from 'path';

// Inicializar OpenAI solo si existe la API key
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(request: Request) {
  try {
    // Verificar que OpenAI esté configurado
    if (!openai) {
      return NextResponse.json({ 
        error: 'OpenAI API key no está configurada. Por favor, configura OPENAI_API_KEY en las variables de entorno.' 
      }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Crear un directorio temporal seguro para el archivo
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subasta-'));
    const tempFilePath = path.join(tempDir, file.name);
    
    try {
      // Guardar el archivo subido en el directorio temporal
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(tempFilePath, fileBuffer);

      // Extraer texto del PDF
      const dataBuffer = fs.readFileSync(tempFilePath);
      const pdfData = await pdf(dataBuffer);
      const pdfText = pdfData.text;

      // Llamar a OpenAI para el análisis
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en subastas inmobiliarias en España. Analiza el siguiente documento de una subasta inmobiliaria y proporciona un análisis exhaustivo en formato JSON con los siguientes campos:

{
  "inmueble": { "tipo": "tipo de inmueble", "ubicacion": "ubicación", "superficie": "superficie en m²", "dormitorios": "número", "baños": "número", "año_construccion": "año", "descripcion": "descripción general" },
  "cargas": { "ibi": "monto o estado", "comunidad": "monto o estado", "hipoteca": "descripción", "embargos": "descripción", "otros": "otras cargas" },
  "riesgos": ["riesgo 1", "riesgo 2"],
  "oportunidades": ["oportunidad 1", "oportunidad 2"],
  "presupuesto": { "precio_puja": "estimación", "itp": "estimación (típicamente 6-11%)", "cargas_preferentes": "estimación", "reformas": "estimación", "gastos": "estimación", "total": "total estimado" },
  "rentabilidad": { "valor_mercado": "estimación", "valor_post_reforma": "estimación", "beneficio_potencial": "estimación", "roi": "porcentaje estimado" },
  "recomendacion": { "puja_maxima": "cantidad recomendada", "viabilidad": "Alta/Media/Baja", "explicacion": "breve explicación" }
}

Extrae la información del documento proporcionado y completa el JSON con los datos encontrados.`,
          },
          {
            role: 'user',
            content: `Por favor analiza este documento de subasta:\n\n${pdfText}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      const analysisText = response.choices[0].message?.content || '{}';
      const analysis = JSON.parse(analysisText);

      return NextResponse.json({ success: true, analysis });

    } finally {
      // Limpiar el archivo y el directorio temporal para no dejar basura
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      fs.rmdirSync(tempDir);
    }

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error processing PDF', details: errorMessage }, { status: 500 });
  }
}
