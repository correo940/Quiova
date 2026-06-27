-- Knowledge Layer del Motor Documental Universal (Fase 1)
-- Tablas aditivas: no modifican documents/document_versions/document_reminders/document_ingestion_bridge.

-- 1) Registro de tipos documentales (global, no por usuario)
CREATE TABLE IF NOT EXISTS document_types (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  classification_keywords TEXT[] NOT NULL DEFAULT '{}',
  requires_expiration BOOLEAN NOT NULL DEFAULT false,
  knowledge_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read document types"
  ON document_types FOR SELECT
  USING (auth.role() = 'authenticated');

INSERT INTO document_types (key, label, classification_keywords, requires_expiration, knowledge_mapping)
VALUES (
  'seguro',
  'Seguro',
  ARRAY['poliza', 'seguro', 'aseguradora', 'prima'],
  true,
  '{
    "entity": {
      "type": "insurance_policy",
      "attributes": { "aseguradora": "issuer", "prima": "metadata.prima", "coberturas": "metadata.coberturas" }
    },
    "events": [
      { "type": "expiration", "date_field": "expiration_date", "title": "Vencimiento de poliza" }
    ]
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 2) Extraccion estructurada por documento (1:1 con documents en esta fase)
CREATE TABLE IF NOT EXISTS document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL DEFAULT 1,
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS document_extractions_document_id_key
  ON document_extractions(document_id);

ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own document extractions"
  ON document_extractions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3) Entidades de conocimiento (representacion canonica de hechos de negocio)
CREATE TABLE IF NOT EXISTS knowledge_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  business_key TEXT NOT NULL,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'closed')),
  valid_from DATE,
  valid_until DATE,
  superseded_by UUID REFERENCES knowledge_entities(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_entities_unique_key
  ON knowledge_entities(user_id, entity_type, business_key);

ALTER TABLE knowledge_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own knowledge entities"
  ON knowledge_entities FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4) Eventos de conocimiento (vencimientos, renovaciones, pagos...)
CREATE TABLE IF NOT EXISTS knowledge_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES knowledge_entities(id) ON DELETE CASCADE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  due_date DATE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  synced_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_events_unique_per_entity
  ON knowledge_events(entity_id, event_type)
  WHERE entity_id IS NOT NULL;

ALTER TABLE knowledge_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own knowledge events"
  ON knowledge_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
