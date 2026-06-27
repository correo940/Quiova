-- Clasificación semántica de insurance_type en knowledge_entities existentes.
-- Aplica las mismas reglas que classify-insurance.ts sobre (insurance_type + name) concatenados.
-- Idempotente: solo actúa sobre entidades sin tipo canónico ya asignado.

UPDATE public.knowledge_entities
SET
  attributes = attributes || jsonb_build_object(
    'insurance_type',
    CASE
      WHEN LOWER(COALESCE(attributes->>'insurance_type','') || ' ' || COALESCE(attributes->>'name',''))
           ~ 'responsabilidad.{0,10}civil|liability'              THEN 'liability'
      WHEN LOWER(COALESCE(attributes->>'insurance_type','') || ' ' || COALESCE(attributes->>'name',''))
           ~ 'comunidad|community|vecino'                         THEN 'community'
      WHEN LOWER(COALESCE(attributes->>'insurance_type','') || ' ' || COALESCE(attributes->>'name',''))
           ~ 'mascota|pet |animal'                                THEN 'pet'
      WHEN LOWER(COALESCE(attributes->>'insurance_type','') || ' ' || COALESCE(attributes->>'name',''))
           ~ 'viaje|travel|vacacion'                              THEN 'travel'
      WHEN LOWER(COALESCE(attributes->>'insurance_type','') || ' ' || COALESCE(attributes->>'name',''))
           ~ 'salud|m[eé]dic|health|cl[ií]nica|hospital'         THEN 'health'
      WHEN LOWER(COALESCE(attributes->>'insurance_type','') || ' ' || COALESCE(attributes->>'name',''))
           ~ 'hogar|vivienda|home'                                THEN 'home'
      WHEN LOWER(COALESCE(attributes->>'insurance_type','') || ' ' || COALESCE(attributes->>'name',''))
           ~ 'coche|auto[^r]|veh[ií]culo|moto |vehicle'          THEN 'vehicle'
      WHEN LOWER(COALESCE(attributes->>'insurance_type','') || ' ' || COALESCE(attributes->>'name',''))
           ~ '\mvida\M|life insur'                                THEN 'life'
      ELSE 'other'
    END
  ),
  updated_at = now()
WHERE entity_type = 'insurance_policy'
  AND (
    attributes->>'insurance_type' IS NULL
    OR attributes->>'insurance_type' NOT IN
       ('home','vehicle','health','life','pet','travel','community','liability','other')
  );
