'''
import { NextResponse } from 'next/server';
import pdf from 'pdf-parse';

interface RawTransaction { [key: string]: any; }

// Esta función busca patrones de movimientos en el texto extraído del PDF
const parsePdfText = (text: string): RawTransaction[] => {
    const lines = text.split('\n');
    const transactions: RawTransaction[] = [];
    // Esta expresión regular es una aproximación y puede que no funcione para todos los bancos.
    // Busca un patrón de [fecha] [descripción] [importe]
    const transactionRegex = /(\d{2}[\/.-]\d{2}[\/.-]\d{4})\s+(.*?)\s+([-\d.,]+\s*€?)$/m;

    let potentialTable = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Una heurística simple: si vemos cabeceras comunes, empezamos a analizar más en serio
        if (line.toLowerCase().includes('fecha') && line.toLowerCase().includes('concepto')) {
            potentialTable = true;
            continue;
        }

        // Intentamos casar la línea con nuestra expresión regular de transacción
        const match = line.match(transactionRegex);
        if (match) {
            // Limpiamos la descripción de posibles fechas que se hayan colado
            const description = match[2].replace(/\d{2}[\/.-]\d{2}[\/.-]\d{4}/, '').trim();
            if (description) { // Solo añadimos si hay una descripción real
                 transactions.push({
                    'Fecha (detectada)': match[1],
                    'Descripción (detectada)': description,
                    'Importe (detectado)': match[3].replace(/\s*€/, ''), // Quita el símbolo del euro si existe
                });
            }
        } 
        // Como alternativa, buscamos líneas que tengan al menos dos espacios largos, una fecha y un número al final
        // Esto puede capturar formatos de tabla donde las columnas están separadas por múltiples espacios
        else if (potentialTable && /(\d{2}[\/.-]\d{2}[\/.-]\d{4})/.test(line) && /[\d.,]+$/.test(line)) {
            const parts = line.split(/\s{2,}/); // Dividir por 2 o más espacios
            if (parts.length >= 3) { // Necesitamos al menos fecha, descripción e importe
                transactions.push({
                    'Fecha (detectada)': parts[0],
                    'Descripción (detectada)': parts.slice(1, -1).join(' '),
                    'Importe (detectado)': parts[parts.length - 1].replace(/\s*€/, ''),
                });
            }
        }
    }
    return transactions;
};


export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se ha subido ningún archivo.' }, { status: 400 });
    }

    // El Buffer funciona aquí porque estamos en el entorno del servidor (Node.js)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const data = await pdf(buffer);
    const rawTransactions = parsePdfText(data.text);

    if (rawTransactions.length === 0) {
        return NextResponse.json({ error: 'No se encontraron movimientos con un formato reconocible en el PDF.' }, { status: 400 });
    }

    return NextResponse.json(rawTransactions);

  } catch (error) {
    console.error("[PDF Parse Error]", error);
    return NextResponse.json({ error: 'No se pudo procesar el archivo PDF.' }, { status: 500 });
  }
}
'''