-- 20260729_11_family_warranties.sql
-- Task 13: Familiarizar Garantías (warranties)

ALTER TABLE warranties ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE warranties w SET family_id = f.id FROM families f WHERE f.owner_id = w.user_id;
ALTER TABLE warranties ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE warranties ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

SELECT drop_all_policies('warranties');

CREATE POLICY warranties_select ON warranties FOR SELECT
  USING (has_family_access(family_id, 'mi-hogar.warranties', 'view'));
CREATE POLICY warranties_write ON warranties FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.warranties', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.warranties', 'full'));
