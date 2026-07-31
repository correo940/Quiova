-- 20260729_18_family_trips.sql
-- Task 21: Familiarizar Mi Viaje (trips, trip_events, trip_checklist_items, trip_assets)

ALTER TABLE trips ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE trips t SET family_id = f.id FROM families f WHERE f.owner_id = t.user_id;
ALTER TABLE trips ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE trips ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

ALTER TABLE trip_events ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_trip_events()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM trips WHERE id = NEW.trip_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_family_id_trip_events ON trip_events;
CREATE TRIGGER trg_sync_family_id_trip_events
BEFORE INSERT OR UPDATE OF trip_id ON trip_events
FOR EACH ROW EXECUTE FUNCTION sync_family_id_trip_events();
UPDATE trip_events te SET family_id = t.family_id FROM trips t WHERE t.id = te.trip_id;

ALTER TABLE trip_checklist_items ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_trip_checklist_items()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM trips WHERE id = NEW.trip_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_family_id_trip_checklist_items ON trip_checklist_items;
CREATE TRIGGER trg_sync_family_id_trip_checklist_items
BEFORE INSERT OR UPDATE OF trip_id ON trip_checklist_items
FOR EACH ROW EXECUTE FUNCTION sync_family_id_trip_checklist_items();
UPDATE trip_checklist_items ci SET family_id = t.family_id FROM trips t WHERE t.id = ci.trip_id;

ALTER TABLE trip_assets ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_trip_assets()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM trips WHERE id = NEW.trip_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_family_id_trip_assets ON trip_assets;
CREATE TRIGGER trg_sync_family_id_trip_assets
BEFORE INSERT OR UPDATE OF trip_id ON trip_assets
FOR EACH ROW EXECUTE FUNCTION sync_family_id_trip_assets();
UPDATE trip_assets ta SET family_id = t.family_id FROM trips t WHERE t.id = ta.trip_id;

SELECT drop_all_policies('trips');
SELECT drop_all_policies('trip_events');
SELECT drop_all_policies('trip_checklist_items');
SELECT drop_all_policies('trip_assets');

CREATE POLICY trips_select ON trips FOR SELECT USING (has_family_access(family_id, 'mi-hogar.trips', 'view'));
CREATE POLICY trips_write ON trips FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.trips', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.trips', 'full'));

CREATE POLICY trip_events_select ON trip_events FOR SELECT USING (has_family_access(family_id, 'mi-hogar.trips', 'view'));
CREATE POLICY trip_events_write ON trip_events FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.trips', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.trips', 'full'));

CREATE POLICY trip_checklist_items_select ON trip_checklist_items FOR SELECT USING (has_family_access(family_id, 'mi-hogar.trips', 'view'));
CREATE POLICY trip_checklist_items_write ON trip_checklist_items FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.trips', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.trips', 'full'));

CREATE POLICY trip_assets_select ON trip_assets FOR SELECT USING (has_family_access(family_id, 'mi-hogar.trips', 'view'));
CREATE POLICY trip_assets_write ON trip_assets FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.trips', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.trips', 'full'));
