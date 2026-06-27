import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-limit';
import { applyKnowledgeMapping } from '@/lib/document-engine/knowledge-builder';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const documentId = body?.document_id;
    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json({ error: 'document_id es obligatorio.' }, { status: 400 });
    }

    const result = await applyKnowledgeMapping(documentId, user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[sync-knowledge] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
