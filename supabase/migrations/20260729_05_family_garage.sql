-- 20260729_05_family_garage.sql
-- Fix pre-existing bug: trigger update_vehicles_updated_at (BEFORE UPDATE) references
-- NEW.updated_at, but vehicles never had that column, so ANY update to vehicles
-- (in the app or in this migration's backfill) failed with 42703. Add the column.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE vehicles v SET family_id = f.id FROM families f WHERE f.owner_id = v.user_id;
ALTER TABLE vehicles ALTER COLUMN family_id SET NOT NULL;

-- vehicles.family_id has no populating trigger (unlike vehicle_events, which is
-- keyed off vehicle_id). Give it a DEFAULT so inserts that don't set family_id
-- explicitly (the app's current insert payload) still satisfy the NOT NULL + RLS
-- WITH CHECK below, resolved from whichever family the inserting user belongs to.
CREATE OR REPLACE FUNCTION resolve_current_family_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT id FROM families WHERE owner_id = auth.uid()),
    (SELECT family_id FROM family_members WHERE user_id = auth.uid() AND status = 'active' LIMIT 1)
  );
$$;
ALTER TABLE vehicles ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

ALTER TABLE vehicle_events ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);

CREATE OR REPLACE FUNCTION sync_family_id_vehicle_events()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM vehicles WHERE id = NEW.vehicle_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sync_family_id_vehicle_events
BEFORE INSERT OR UPDATE OF vehicle_id ON vehicle_events
FOR EACH ROW EXECUTE FUNCTION sync_family_id_vehicle_events();

UPDATE vehicle_events ve SET family_id = v.family_id FROM vehicles v WHERE v.id = ve.vehicle_id;
ALTER TABLE vehicle_events ALTER COLUMN family_id SET NOT NULL;

SELECT drop_all_policies('vehicles');
SELECT drop_all_policies('vehicle_events');

CREATE POLICY vehicles_select ON vehicles FOR SELECT USING (has_family_access(family_id, 'mi-hogar.garage', 'view'));
CREATE POLICY vehicles_write ON vehicles FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.garage', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.garage', 'full'));

CREATE POLICY vehicle_events_select ON vehicle_events FOR SELECT USING (has_family_access(family_id, 'mi-hogar.garage', 'view'));
CREATE POLICY vehicle_events_write ON vehicle_events FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.garage', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.garage', 'full'));
