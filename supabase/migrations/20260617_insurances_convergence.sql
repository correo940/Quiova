-- Convergencia insurances → knowledge_entities
-- La tabla insurances queda obsoleta. v_insurance_policies es la interfaz de lectura.

-- 1. Vista de lectura con shape idéntico a la tabla insurances
CREATE OR REPLACE VIEW public.v_insurance_policies
WITH (security_invoker = true) AS
SELECT
  ke.id,
  ke.user_id,
  COALESCE(ke.attributes->>'nombre_seguro', ke.attributes->>'tipo_seguro', 'Seguro') AS name,
  COALESCE(ke.attributes->>'tipo_seguro', ke.attributes->>'nombre_seguro', 'Seguro') AS type,
  (ke.attributes->>'aseguradora')                                                     AS provider,
  CASE
    WHEN ke.attributes->>'prima' IS NOT NULL AND ke.attributes->>'prima' != ''
    THEN NULLIF(regexp_replace(ke.attributes->>'prima', '[^0-9.]', '', 'g'), '')::numeric
    ELSE NULL
  END                                                                                  AS cost,
  ke.valid_until::date                                                                 AS expiration_date,
  ke.valid_until::date                                                                 AS renewal_date,
  (ke.attributes->>'notas')                                                            AS notes,
  ke.business_key                                                                      AS policy_number,
  ke.source_document_id,
  ke.status,
  ke.created_at,
  ke.updated_at
FROM public.knowledge_entities ke
WHERE ke.entity_type = 'insurance_policy'
  AND ke.status = 'active';

GRANT SELECT ON public.v_insurance_policies TO authenticated;

-- 2. Migrar filas existentes de insurances → knowledge_entities (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'insurances') THEN
    INSERT INTO public.knowledge_entities (
      user_id,
      entity_type,
      business_key,
      attributes,
      valid_until,
      status,
      created_at,
      updated_at
    )
    SELECT
      i.user_id,
      'insurance_policy',
      COALESCE(NULLIF(i.policy_number, ''), 'legacy_' || i.id::text) AS business_key,
      jsonb_strip_nulls(jsonb_build_object(
        'nombre_seguro', COALESCE(i.name, i.type, 'Seguro'),
        'tipo_seguro',   COALESCE(i.type, i.name, 'Seguro'),
        'aseguradora',   i.provider,
        'prima',         CASE WHEN i.cost IS NOT NULL THEN i.cost::text ELSE NULL END,
        'notas',         i.notes
      )) AS attributes,
      i.expiration_date,
      'active',
      COALESCE(i.created_at, now()),
      now()
    FROM public.insurances i
    ON CONFLICT (user_id, entity_type, business_key) DO NOTHING;
  END IF;
END $$;
