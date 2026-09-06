import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { isSuperAdminEmail } from '@/lib/server-request-auth';

/**
 * Exige una sesion del panel de administracion que ademas pertenezca al
 * administrador. Tener sesion no basta: cualquiera con una cuenta de GitHub
 * podia obtener una.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || !isSuperAdminEmail(session.user?.email)) {
    return {
      session: null,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    };
  }

  return { session, response: null };
}
