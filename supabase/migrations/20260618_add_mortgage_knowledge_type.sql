-- Mortgage v1: añade hipoteca como dominio de conocimiento canónico.
-- 1. Actualiza seguro con business_key_field (prerequisito para builder declarativo).
-- 2. Crea document_types 'hipoteca' con su knowledge_mapping completo.
-- 3. Crea la vista v_mortgages con SECURITY INVOKER.

-- 1) Añadir business_key_field a 'seguro' sin tocar el resto del mapping
UPDATE public.document_types
SET knowledge_mapping = jsonb_set(
  knowledge_mapping,
  '{entity,business_key_field}',
  '"metadata.numero_poliza"'::jsonb
)
WHERE key = 'seguro';

-- 2) Crear tipo documental 'hipoteca'
INSERT INTO public.document_types (key, label, knowledge_mapping)
VALUES (
  'hipoteca',
  'Hipoteca',
  '{
    "entity": {
      "type": "mortgage",
      "business_key_field": "metadata.numero_prestamo",
      "attributes": {
        "name":              "title",
        "lender":            "issuer",
        "loan_number":       "metadata.numero_prestamo",
        "property_address":  "metadata.direccion_inmueble",
        "original_amount":   "metadata.capital_inicial",
        "outstanding_balance": "metadata.capital_pendiente",
        "monthly_payment":   "metadata.cuota_mensual",
        "tin":               "metadata.tin",
        "tae":               "metadata.tae",
        "spread":            "metadata.diferencial",
        "rate_type":         "metadata.tipo_tasa",
        "reference_index":   "metadata.indice_referencia",
        "start_date":        "metadata.fecha_inicio",
        "rate_review_date":  "metadata.fecha_revision",
        "coverage_summary":  "metadata.condiciones"
      }
    },
    "events": [
      {
        "type":      "rate_review",
        "title":     "Revisión tipo interés",
        "date_field": "metadata.fecha_revision"
      },
      {
        "type":             "maturity",
        "title":            "Vencimiento hipoteca",
        "date_field":       "expiration_date",
        "severity_override": "low"
      }
    ]
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label,
      knowledge_mapping = EXCLUDED.knowledge_mapping;

-- 3) Vista canónica de hipotecas
CREATE OR REPLACE VIEW public.v_mortgages
WITH (security_invoker = true) AS
SELECT
  ke.id,
  ke.user_id,
  COALESCE(ke.attributes->>'name', 'Hipoteca')            AS name,
  ke.attributes->>'lender'                                AS lender,
  COALESCE(ke.attributes->>'loan_number', ke.business_key) AS loan_number,
  ke.attributes->>'property_address'                      AS property_address,
  NULLIF(regexp_replace(COALESCE(ke.attributes->>'original_amount',''),   '[^0-9.]','','g'),'')::numeric AS original_amount,
  NULLIF(regexp_replace(COALESCE(ke.attributes->>'outstanding_balance',''),'[^0-9.]','','g'),'')::numeric AS outstanding_balance,
  NULLIF(regexp_replace(COALESCE(ke.attributes->>'monthly_payment',''),   '[^0-9.]','','g'),'')::numeric AS monthly_payment,
  ke.attributes->>'tin'                                   AS tin,
  ke.attributes->>'tae'                                   AS tae,
  ke.attributes->>'spread'                                AS spread,
  ke.attributes->>'rate_type'                             AS rate_type,
  ke.attributes->>'reference_index'                       AS reference_index,
  ke.attributes->>'start_date'                            AS start_date,
  ke.attributes->>'rate_review_date'                      AS rate_review_date,
  ke.attributes->>'coverage_summary'                      AS notes,
  ke.valid_until::date                                    AS maturity_date,
  ke.business_key                                         AS loan_number_key,
  ke.source_document_id,
  ke.status,
  ke.created_at,
  ke.updated_at
FROM public.knowledge_entities ke
WHERE ke.entity_type = 'mortgage'
  AND ke.status = 'active';

GRANT SELECT ON public.v_mortgages TO authenticated;
