-- Utility Contract v1: añade utility_contract como dominio canónico.
-- Cubre: electricidad, agua, gas, internet, telefonía móvil y futuros contratos recurrentes.
--
-- Nota de diseño — Utility Contract v2:
--   knowledge_events podrá incorporar event_type = 'bill' para registrar facturas individuales
--   y permitir análisis histórico de gasto. El esquema actual lo soporta sin cambios:
--   knowledge_events acepta cualquier event_type; amount y metadata son extensibles.

INSERT INTO public.document_types (key, label, knowledge_mapping)
VALUES (
  'utility_contract',
  'Contrato de Suministro',
  '{
    "entity": {
      "type": "utility_contract",
      "business_key_field": "metadata.referencia_contrato",
      "attributes": {
        "name":            "title",
        "provider":        "issuer",
        "utility_type":    "document_type",
        "contract_number": "metadata.referencia_contrato",
        "address":         "metadata.direccion_suministro",
        "monthly_cost":    "metadata.importe_mensual",
        "billing_period":  "metadata.periodo_facturacion",
        "start_date":      "metadata.fecha_inicio",
        "tariff":          "metadata.tarifa",
        "cups":            "metadata.cups"
      }
    },
    "events": [
      {
        "type":       "contract_renewal",
        "title":      "Revisión de contrato de suministro",
        "date_field": "expiration_date"
      }
    ]
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE
  SET label            = EXCLUDED.label,
      knowledge_mapping = EXCLUDED.knowledge_mapping;

-- Vista canónica de contratos de suministro
CREATE OR REPLACE VIEW public.v_utility_contracts
WITH (security_invoker = true) AS
SELECT
  ke.id,
  ke.user_id,
  COALESCE(ke.attributes->>'name', 'Suministro')              AS name,
  ke.attributes->>'utility_type'                               AS utility_type,
  ke.attributes->>'provider'                                   AS provider,
  ke.attributes->>'contract_number'                            AS contract_number,
  ke.attributes->>'address'                                    AS address,
  NULLIF(
    regexp_replace(COALESCE(ke.attributes->>'monthly_cost', ''), '[^0-9.]', '', 'g'),
    ''
  )::numeric                                                   AS monthly_cost,
  ke.attributes->>'billing_period'                             AS billing_period,
  ke.attributes->>'start_date'                                 AS start_date,
  ke.attributes->>'tariff'                                     AS tariff,
  ke.attributes->>'cups'                                       AS cups,
  ke.valid_until::date                                         AS renewal_date,
  ke.business_key,
  ke.source_document_id,
  ke.status,
  ke.created_at,
  ke.updated_at
FROM public.knowledge_entities ke
WHERE ke.entity_type = 'utility_contract'
  AND ke.status = 'active';

GRANT SELECT ON public.v_utility_contracts TO authenticated;
