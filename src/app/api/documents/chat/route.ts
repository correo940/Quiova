import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-limit';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { extractStructuredJson } from '@/lib/document-engine/llm-extract';

export const runtime = 'nodejs';

const GENERAL_POLICY_QUESTION = /qu[ée]\s+(seguros|p[óo]lizas)\s+tengo|mis\s+p[óo]lizas/i;

type Fact = {
  label: string;
  attributes: Record<string, any>;
  due_dates: { event: string; date: string }[];
  source_document_id: string | null;
  source_title: string | null;
};

async function collectFactsForDocument(userId: string, documentId: string): Promise<Fact[]> {
  const { data: document } = await supabaseAdmin
    .from('documents')
    .select('id, title, summary, category, issuer, expiration_date, metadata')
    .eq('id', documentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!document) return [];

  const { data: entity } = await supabaseAdmin
    .from('knowledge_entities')
    .select('id, entity_type, attributes, valid_until, status')
    .eq('source_document_id', documentId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!entity) {
    // Sin entidad de conocimiento todavia (tipo no mapeado): usamos el propio documento como hecho.
    return [
      {
        label: document.category || 'Documento',
        attributes: { titulo: document.title, emisor: document.issuer, resumen: document.summary, ...(document.metadata || {}) },
        due_dates: document.expiration_date ? [{ event: 'vencimiento', date: document.expiration_date }] : [],
        source_document_id: document.id,
        source_title: document.title,
      },
    ];
  }

  const { data: events } = await supabaseAdmin
    .from('knowledge_events')
    .select('event_type, due_date')
    .eq('entity_id', entity.id)
    .eq('status', 'pending');

  return [
    {
      label: entity.entity_type,
      attributes: entity.attributes || {},
      due_dates: (events || []).filter((e) => e.due_date).map((e) => ({ event: e.event_type, date: e.due_date as string })),
      source_document_id: document.id,
      source_title: document.title,
    },
  ];
}

async function collectActivePolicies(userId: string): Promise<Fact[]> {
  const { data: entities } = await supabaseAdmin
    .from('knowledge_entities')
    .select('id, attributes, source_document_id, valid_until')
    .eq('user_id', userId)
    .eq('entity_type', 'insurance_policy')
    .eq('status', 'active');

  if (!entities || entities.length === 0) return [];

  const documentIds = entities.map((e) => e.source_document_id).filter(Boolean);
  const { data: documents } = await supabaseAdmin.from('documents').select('id, title').in('id', documentIds);
  const titleById = new Map((documents || []).map((d) => [d.id, d.title]));

  return entities.map((entity) => ({
    label: 'insurance_policy',
    attributes: entity.attributes || {},
    due_dates: entity.valid_until ? [{ event: 'vencimiento', date: entity.valid_until }] : [],
    source_document_id: entity.source_document_id,
    source_title: entity.source_document_id ? titleById.get(entity.source_document_id) || null : null,
  }));
}

function factsToPromptText(facts: Fact[]): string {
  return facts
    .map((fact, index) => {
      const attrLines = Object.entries(fact.attributes)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => `  - ${key}: ${value}`)
        .join('\n');
      const dueLines = fact.due_dates.map((d) => `  - ${d.event}: ${d.date}`).join('\n');
      return `Hecho ${index + 1} (documento: "${fact.source_title || 'desconocido'}", id: ${fact.source_document_id || 'n/a'}):\n${attrLines}\n${dueLines}`;
    })
    .join('\n\n');
}

const CHAT_SYSTEM_PROMPT = `Eres la IA de QUIOBA respondiendo preguntas sobre los documentos del usuario.
Responde UNICAMENTE usando los hechos proporcionados. No inventes datos que no esten en los hechos.
Si los hechos no contienen la respuesta, dilo explicitamente en el campo answer.
Responde solo JSON valido con este esquema exacto:
{ "answer": "string en espanol, breve y directo", "confidence": 0.0 }`;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const question = typeof body?.question === 'string' ? body.question.trim() : '';
    const documentId = typeof body?.document_id === 'string' ? body.document_id : null;

    if (!question) {
      return NextResponse.json({ error: 'question es obligatorio.' }, { status: 400 });
    }

    let facts: Fact[] = [];
    let resolvedFrom: 'document' | 'general_policies' | 'none' = 'none';

    if (documentId) {
      facts = await collectFactsForDocument(user.id, documentId);
      if (facts.length > 0) resolvedFrom = 'document';
    } else if (GENERAL_POLICY_QUESTION.test(question)) {
      facts = await collectActivePolicies(user.id);
      if (facts.length > 0) resolvedFrom = 'general_policies';
    }

    if (facts.length === 0) {
      return NextResponse.json({
        answer: 'No tengo informacion suficiente registrada todavia para responder a eso con seguridad.',
        confidence: 0,
        sources: [],
        resolved_from: 'none',
      });
    }

    const userPrompt = `Hechos disponibles:\n${factsToPromptText(facts)}\n\nPregunta del usuario: ${question}`;
    const { data: parsed } = await extractStructuredJson(CHAT_SYSTEM_PROMPT, userPrompt);

    const answer = typeof parsed?.answer === 'string' && parsed.answer.trim()
      ? parsed.answer.trim()
      : 'No he podido generar una respuesta a partir de la informacion disponible.';
    const confidence = typeof parsed?.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5;

    const sources = facts
      .filter((fact) => fact.source_document_id)
      .map((fact) => ({ document_id: fact.source_document_id, title: fact.source_title }));

    return NextResponse.json({ answer, confidence, sources, resolved_from: resolvedFrom });
  } catch (error: any) {
    console.error('[documents/chat] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
