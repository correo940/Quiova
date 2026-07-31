-- 20260729_13_family_passwords.sql
-- Task 15: Familiarizar Contraseñas (passwords)

ALTER TABLE passwords ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE passwords p SET family_id = f.id FROM families f WHERE f.owner_id = p.user_id;
ALTER TABLE passwords ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE passwords ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

SELECT drop_all_policies('passwords');

CREATE POLICY passwords_select ON passwords FOR SELECT
  USING (has_family_access(family_id, 'mi-hogar.passwords', 'view'));
CREATE POLICY passwords_write ON passwords FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.passwords', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.passwords', 'full'));
