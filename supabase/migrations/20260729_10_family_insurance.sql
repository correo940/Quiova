-- 20260729_10_family_insurance.sql
-- Task 12: Familiarizar Seguros (insurances)

ALTER TABLE insurances ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE insurances i SET family_id = f.id FROM families f WHERE f.owner_id = i.user_id;
ALTER TABLE insurances ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE insurances ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

SELECT drop_all_policies('insurances');

CREATE POLICY insurances_select ON insurances FOR SELECT
  USING (has_family_access(family_id, 'mi-hogar.insurance', 'view'));
CREATE POLICY insurances_write ON insurances FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.insurance', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.insurance', 'full'));
