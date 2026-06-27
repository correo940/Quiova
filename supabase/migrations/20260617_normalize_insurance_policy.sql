-- Normalización del contrato de datos insurance_policy
-- Define el esquema canónico de atributos y migra entidades existentes.

-- 1. Actualizar knowledge_mapping en document_types para 'seguro'
--    El knowledge-builder es declarativo: este cambio ya controla qué extrae para toda póliza futura.
UPDATE public.document_types
SET knowledge_mapping = '{
  "entity": {
    "type": "insurance_policy",
    "attributes": {
      "name": "title",
      "insurance_type": "document_type",
      "provider": "issuer",
      "policy_number": "metadata.numero_poliza",
      "annual_cost": "metadata.prima",
      "phone": "metadata.telefono_asistencia",
      "coverage_summary": "metadata.coberturas"
    }
  },
  "events": [
    {
      "type": "expiration",
      "title": "Vencimiento de póliza",
      "date_field": "expiration_date"
    }
  ]
}'::jsonb
WHERE key = 'seguro';

-- 2. Migrar entidades ya existentes al esquema estándar
--    Traduce claves legacy (aseguradora, prima, coberturas, nombre_seguro, tipo_seguro)
--    al contrato nuevo. Idempotente: si ya tiene las claves nuevas, las preserva.
UPDATE public.knowledge_entities
SET
  attributes = jsonb_strip_nulls(jsonb_build_object(
    'name', CASE
      WHEN (attributes->>'name') IS NOT NULL THEN attributes->>'name'
      WHEN (attributes->>'aseguradora') IS NOT NULL
        THEN TRIM(
          COALESCE(attributes->>'tipo_seguro', attributes->>'nombre_seguro', 'Seguro')
          || ' ' || (attributes->>'aseguradora')
        )
      ELSE COALESCE(attributes->>'nombre_seguro', attributes->>'tipo_seguro', 'Seguro')
    END,
    'insurance_type', COALESCE(
      attributes->>'insurance_type',
      attributes->>'tipo_seguro',
      attributes->>'nombre_seguro'
    ),
    'provider',        COALESCE(attributes->>'provider',        attributes->>'aseguradora'),
    'policy_number',   COALESCE(attributes->>'policy_number',   business_key),
    'annual_cost',     COALESCE(attributes->>'annual_cost',     attributes->>'prima'),
    'phone',           COALESCE(attributes->>'phone',           attributes->>'telefono_asistencia'),
    'coverage_summary', COALESCE(
      attributes->>'coverage_summary',
      attributes->>'coberturas',
      attributes->>'notas'
    )
  )),
  updated_at = now()
WHERE entity_type = 'insurance_policy';

-- 3. Actualizar la VIEW para leer claves estándar (con fallback a legacy para seguridad)
CREATE OR REPLACE VIEW public.v_insurance_policies
WITH (security_invoker = true) AS
SELECT
  ke.id,
  ke.user_id,
  COALESCE(ke.attributes->>'name',            ke.attributes->>'nombre_seguro', ke.attributes->>'tipo_seguro', 'Seguro') AS name,
  COALESCE(ke.attributes->>'insurance_type',  ke.attributes->>'tipo_seguro',   ke.attributes->>'nombre_seguro', 'Seguro') AS type,
  COALESCE(ke.attributes->>'provider',        ke.attributes->>'aseguradora')   AS provider,
  CASE
    WHEN COALESCE(ke.attributes->>'annual_cost', ke.attributes->>'prima') IS NOT NULL
     AND COALESCE(ke.attributes->>'annual_cost', ke.attributes->>'prima') != ''
    THEN NULLIF(
      regexp_replace(COALESCE(ke.attributes->>'annual_cost', ke.attributes->>'prima'), '[^0-9.]', '', 'g'),
      ''
    )::numeric
    ELSE NULL
  END                                                                           AS cost,
  ke.valid_until::date                                                          AS expiration_date,
  ke.valid_until::date                                                          AS renewal_date,
  COALESCE(ke.attributes->>'coverage_summary', ke.attributes->>'coberturas',   ke.attributes->>'notas') AS notes,
  COALESCE(ke.attributes->>'policy_number',    ke.business_key)                AS policy_number,
  ke.attributes->>'phone'                                                       AS phone,
  ke.source_document_id,
  ke.status,
  ke.created_at,
  ke.updated_at
FROM public.knowledge_entities ke
WHERE ke.entity_type = 'insurance_policy'
  AND ke.status = 'active';

GRANT SELECT ON public.v_insurance_policies TO authenticated;
