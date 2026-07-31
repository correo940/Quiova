-- 20260729_07_family_roster.sql
-- Task 9: Familiarizar Turnos (work_shifts, shift_types)

-- work_shifts: root table (has user_id)
ALTER TABLE work_shifts ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE work_shifts w SET family_id = f.id FROM families f WHERE f.owner_id = w.user_id;
ALTER TABLE work_shifts ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE work_shifts ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

-- shift_types: root table (has user_id)
ALTER TABLE shift_types ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE shift_types s SET family_id = f.id FROM families f WHERE f.owner_id = s.user_id;
ALTER TABLE shift_types ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE shift_types ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

-- Drop all existing policies
SELECT drop_all_policies('work_shifts');
SELECT drop_all_policies('shift_types');

-- New family-aware RLS policies
CREATE POLICY work_shifts_select ON work_shifts FOR SELECT
  USING (has_family_access(family_id, 'mi-hogar.roster', 'view'));
CREATE POLICY work_shifts_write ON work_shifts FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.roster', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.roster', 'full'));

CREATE POLICY shift_types_select ON shift_types FOR SELECT
  USING (has_family_access(family_id, 'mi-hogar.roster', 'view'));
CREATE POLICY shift_types_write ON shift_types FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.roster', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.roster', 'full'));
