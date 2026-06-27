// Knowledge Builder: traduce un documento + su extraccion en entidades/eventos canonicos
// (knowledge_entities / knowledge_events) segun el mapeo declarativo de document_types,
// y sincroniza los eventos con tareas (Agenda). No toca syncDocumentTasks (legacy), es aditivo.

import { supabaseAdmin } from '@/lib/supabase-admin';
import { classifyInsuranceType, isCanonicalInsuranceType } from './classify-insurance';
import { classifyRateType, isCanonicalRateType } from './classify-mortgage';
import { classifyUtilityType, isCanonicalUtilityType } from './classify-utility';

const KNOWLEDGE_TASK_MARKER = '[QUIOBA_KNOWLEDGE_EVENT]';

// Fase 1: mapeo de categoria (campo libre en documents) -> key de document_types.
// Anadir Hipotecas/Prestamos/Contratos = una entrada nueva aqui, sin tocar el resto del builder.
const CATEGORY_TO_TYPE_KEY: Record<string, string> = {
  Seguro:      'seguro',
  Hipoteca:    'hipoteca',
  Suministro:  'utility_contract',
};

function readPath(source: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), source);
}

async function getOrCreateTaskListId(userId: string): Promise<string | null> {
  const { data: membershipRows } = await supabaseAdmin
    .from('task_list_members')
    .select('list_id')
    .eq('user_id', userId)
    .limit(1);

  const existingListId = membershipRows?.[0]?.list_id;
  if (existingListId) return existingListId as string;

  const { data: createdList, error: createListError } = await supabaseAdmin
    .from('task_lists')
    .insert([{ name: 'Mis Tareas', owner_id: userId }])
    .select('id')
    .single();
  if (createListError || !createdList) {
    console.error('[knowledge-builder] Error creating default task list:', createListError);
    return null;
  }

  const { error: memberError } = await supabaseAdmin
    .from('task_list_members')
    .insert([{ list_id: createdList.id, user_id: userId, role: 'owner' }]);
  if (memberError) console.error('[knowledge-builder] Error adding task list member:', memberError);

  return createdList.id as string;
}

async function syncEventToTask(userId: string, event: { id: string; title: string; due_date: string | null; synced_task_id: string | null; severity: string | null }) {
  if (!event.due_date) return null;

  const dueDateIso = `${event.due_date}T09:00:00.000Z`;
  const description = `${KNOWLEDGE_TASK_MARKER}:${event.id}\nGenerado automaticamente por la Knowledge Layer.`;
  const priority = event.severity === 'high' ? 'high' : 'medium';

  if (event.synced_task_id) {
    const { error } = await supabaseAdmin
      .from('tasks')
      .update({ title: event.title, description, due_date: dueDateIso, has_alarm: true, priority, is_completed: false })
      .eq('id', event.synced_task_id);
    if (error) {
      console.error('[knowledge-builder] Error updating synced task:', error);
      return event.synced_task_id;
    }
    return event.synced_task_id;
  }

  const listId = await getOrCreateTaskListId(userId);
  const { data: createdTask, error } = await supabaseAdmin
    .from('tasks')
    .insert([{ user_id: userId, list_id: listId, title: event.title, description, due_date: dueDateIso, has_alarm: true, is_completed: false, priority }])
    .select('id')
    .single();
  if (error || !createdTask) {
    console.error('[knowledge-builder] Error creating task for knowledge event:', error);
    return null;
  }
  return createdTask.id as string;
}

export type KnowledgeBuildResult =
  | { skipped: true; reason: string }
  | { skipped: false; entityId: string; eventIds: string[] };

export async function applyKnowledgeMapping(documentId: string, userId: string): Promise<KnowledgeBuildResult> {
  const { data: document, error: documentError } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (documentError || !document) {
    return { skipped: true, reason: 'document_not_found' };
  }

  // 1) Extraccion estructurada (idempotente: una fila por documento)
  const { error: extractionError } = await supabaseAdmin
    .from('document_extractions')
    .upsert(
      {
        document_id: documentId,
        user_id: userId,
        schema_version: 1,
        fields: document.metadata || {},
        confidence: typeof document.metadata?.confidence === 'number' ? document.metadata.confidence : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'document_id' }
    );
  if (extractionError) {
    console.error('[knowledge-builder] Error upserting document_extractions:', extractionError);
  }

  // 2) Resolver el tipo documental y su mapeo declarativo
  const typeKey = CATEGORY_TO_TYPE_KEY[document.category];
  if (!typeKey) {
    return { skipped: true, reason: `no_mapping_for_category:${document.category}` };
  }

  const { data: documentType, error: typeError } = await supabaseAdmin
    .from('document_types')
    .select('*')
    .eq('key', typeKey)
    .maybeSingle();

  if (typeError || !documentType) {
    return { skipped: true, reason: 'document_type_not_found' };
  }

  const mapping = documentType.knowledge_mapping as { entity?: any; events?: any[] };
  if (!mapping?.entity?.type) {
    return { skipped: true, reason: 'invalid_knowledge_mapping' };
  }

  const sourceView = { ...document, metadata: document.metadata || {} };
  const businessKeyField = mapping.entity?.business_key_field as string | undefined;
  const businessKeyValue = businessKeyField ? readPath(sourceView, businessKeyField) : null;
  const businessKey = String(businessKeyValue || documentId);

  const attributes: Record<string, any> = {};
  for (const [attrName, path] of Object.entries(mapping.entity.attributes || {})) {
    const value = readPath(sourceView, path as string);
    if (value !== undefined && value !== null && value !== '') attributes[attrName] = value;
  }

  // Normalizar insurance_type a clave canónica del catálogo
  if (mapping.entity.type === 'insurance_policy') {
    const rawSignal = `${attributes.insurance_type ?? ''} ${attributes.name ?? ''}`.trim();
    if (!isCanonicalInsuranceType(attributes.insurance_type)) {
      attributes.insurance_type = classifyInsuranceType(rawSignal);
    }

    // Fallback annual_cost: el LLM puede usar claves no estándar según el documento.
    // Buscar en orden de especificidad hasta encontrar un valor.
    if (!attributes.annual_cost) {
      const raw = sourceView.metadata?.prima
        ?? sourceView.metadata?.prima_anual
        ?? sourceView.metadata?.importe
        ?? sourceView.metadata?.coste_anual
        ?? sourceView.metadata?.precio_anual
        ?? null;
      if (raw) attributes.annual_cost = String(raw);
    }
  }

  // Normalizar rate_type de hipoteca a clave canónica
  if (mapping.entity.type === 'mortgage') {
    const rawSignal = `${attributes.rate_type ?? ''} ${attributes.reference_index ?? ''}`.trim();
    if (!isCanonicalRateType(attributes.rate_type)) {
      attributes.rate_type = classifyRateType(rawSignal);
    }
  }

  // Normalizar utility_type a clave canónica + fallback monthly_cost
  if (mapping.entity.type === 'utility_contract') {
    const rawSignal = `${attributes.utility_type ?? ''} ${attributes.name ?? ''}`.trim();
    if (!isCanonicalUtilityType(attributes.utility_type)) {
      attributes.utility_type = classifyUtilityType(rawSignal);
    }

    if (!attributes.monthly_cost) {
      const raw = sourceView.metadata?.importe_mensual
        ?? sourceView.metadata?.importe
        ?? sourceView.metadata?.cuota
        ?? sourceView.metadata?.coste_mensual
        ?? sourceView.metadata?.total_factura
        ?? null;
      if (raw) attributes.monthly_cost = String(raw);
    }
  }

  // 3) Fetch entidad existente para merge aditivo de atributos
  const { data: existingEntity } = await supabaseAdmin
    .from('knowledge_entities')
    .select('id, attributes, valid_until')
    .eq('user_id', userId)
    .eq('entity_type', mapping.entity.type)
    .eq('business_key', businessKey)
    .maybeSingle();

  // Base previa + capa nueva: los campos extraídos de este documento sobreescriben,
  // los campos no mencionados por este documento (filtrados arriba como null/vacío) se preservan.
  const mergedAttributes = { ...(existingEntity?.attributes ?? {}), ...attributes };

  // valid_until: solo sobreescribir si el nuevo documento aporta fecha; si no, preservar la existente.
  const resolvedValidUntil = document.expiration_date
    ? document.expiration_date
    : (existingEntity?.valid_until ?? null);

  // 4) Upsert de la entidad canonica con atributos fusionados
  const { data: entity, error: entityError } = await supabaseAdmin
    .from('knowledge_entities')
    .upsert(
      {
        user_id: userId,
        entity_type: mapping.entity.type,
        business_key: businessKey,
        source_document_id: documentId,
        attributes: mergedAttributes,
        status: 'active',
        valid_until: resolvedValidUntil,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,entity_type,business_key' }
    )
    .select('id')
    .single();

  if (entityError || !entity) {
    console.error('[knowledge-builder] Error upserting knowledge_entities:', entityError);
    return { skipped: true, reason: 'entity_upsert_failed' };
  }

  // 5) Si este documento es una renovacion, marcar la entidad anterior como superseded
  if (document.renewal_of) {
    const { data: previousEntity } = await supabaseAdmin
      .from('knowledge_entities')
      .select('id')
      .eq('source_document_id', document.renewal_of)
      .eq('entity_type', mapping.entity.type)
      .neq('id', entity.id)
      .maybeSingle();

    if (previousEntity) {
      await supabaseAdmin
        .from('knowledge_entities')
        .update({ status: 'superseded', superseded_by: entity.id, updated_at: new Date().toISOString() })
        .eq('id', previousEntity.id);
    }
  }

  // 6) Upsert de eventos derivados (vencimiento, etc.) + sync a tareas
  const eventIds: string[] = [];
  for (const eventMapping of mapping.events || []) {
    const dueDate = readPath(sourceView, eventMapping.date_field);
    if (!dueDate) continue;

    const daysUntilDue = (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const severity = (eventMapping.severity_override as string | undefined) ?? (daysUntilDue <= 30 ? 'high' : 'medium');
    const title = `${eventMapping.title}: ${document.title}`;

    const { data: existingEvent } = await supabaseAdmin
      .from('knowledge_events')
      .select('id, synced_task_id')
      .eq('entity_id', entity.id)
      .eq('event_type', eventMapping.type)
      .maybeSingle();

    const { data: event, error: eventError } = await supabaseAdmin
      .from('knowledge_events')
      .upsert(
        {
          user_id: userId,
          entity_id: entity.id,
          source_document_id: documentId,
          event_type: eventMapping.type,
          due_date: dueDate,
          title,
          severity,
          status: 'pending',
          synced_task_id: existingEvent?.synced_task_id || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'entity_id,event_type' }
      )
      .select('id, title, due_date, synced_task_id, severity')
      .single();

    if (eventError || !event) {
      console.error('[knowledge-builder] Error upserting knowledge_events:', eventError);
      continue;
    }

    eventIds.push(event.id);

    const taskId = await syncEventToTask(userId, event);
    if (taskId && taskId !== event.synced_task_id) {
      await supabaseAdmin.from('knowledge_events').update({ synced_task_id: taskId }).eq('id', event.id);
    }
  }

  return { skipped: false, entityId: entity.id, eventIds };
}
