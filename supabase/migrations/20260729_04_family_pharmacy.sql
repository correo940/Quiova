-- 20260729_04_family_pharmacy.sql
ALTER TABLE medicines ADD COLUMN family_id UUID REFERENCES families(id);

UPDATE medicines m SET family_id = f.id
FROM families f WHERE f.owner_id = m.user_id;

ALTER TABLE medicines ALTER COLUMN family_id SET NOT NULL;

SELECT drop_all_policies('medicines');

CREATE POLICY medicines_select ON medicines FOR SELECT
  USING (has_family_access(family_id, 'mi-hogar.pharmacy', 'view'));
CREATE POLICY medicines_write ON medicines FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.pharmacy', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.pharmacy', 'full'));
