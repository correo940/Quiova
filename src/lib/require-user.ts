import { NextResponse } from 'next/server';
import { getAuthenticatedSupabaseUser } from '@/lib/server-request-auth';

/**
 * Exige un usuario autenticado en rutas que consumen APIs de pago (Gemini, Groq,
 * PlantNet, OCR...). Devuelve el usuario, o una respuesta 401 lista para retornar.
 */
export async function requireUser(request: Request) {
  const user = await getAuthenticatedSupabaseUser(request);

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    };
  }

  return { user, response: null };
}
