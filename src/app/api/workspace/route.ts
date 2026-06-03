import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Ruta al archivo de datos en el workspace del usuario
const getFilePath = () => {
  return path.join(process.cwd(), 'content', 'workspace', 'workspace-data.json');
};

export async function GET() {
  try {
    const filePath = getFilePath();
    
    // Verificar si el archivo existe, si no, devolver un objeto base estructurado
    try {
      await fs.access(filePath);
    } catch {
      const defaultData = { ideas: [], prompts: [], blocks: [], config: { passwordHash: null } };
      // Crear directorio si no existe
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return NextResponse.json(defaultData);
    }

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Workspace API] Error al obtener datos:', error);
    return NextResponse.json(
      { error: 'Error al leer el archivo de base de datos local.', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const filePath = getFilePath();

    // Validar estructura básica
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
    }

    // Asegurarse de que el directorio existe
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Escribir los datos en formato JSON legible
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    
    return NextResponse.json({ success: true, message: 'Datos guardados correctamente en local.' });
  } catch (error: any) {
    console.error('[Workspace API] Error al guardar datos:', error);
    return NextResponse.json(
      { error: 'Error al escribir en el archivo de base de datos local.', details: error.message },
      { status: 500 }
    );
  }
}
