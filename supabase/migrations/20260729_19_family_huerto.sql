-- 20260729_19_family_huerto.sql
-- Task 22: Familiarizar Huerto (huerto_plants, huerto_plant_history)

ALTER TABLE huerto_plants ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE huerto_plants hp SET family_id = f.id FROM families f WHERE f.owner_id = hp.user_id;
ALTER TABLE huerto_plants ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE huerto_plants ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

ALTER TABLE huerto_plant_history ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_huerto_plant_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM huerto_plants WHERE id = NEW.plant_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_family_id_huerto_plant_history ON huerto_plant_history;
CREATE TRIGGER trg_sync_family_id_huerto_plant_history
BEFORE INSERT OR UPDATE OF plant_id ON huerto_plant_history
FOR EACH ROW EXECUTE FUNCTION sync_family_id_huerto_plant_history();
UPDATE huerto_plant_history hph SET family_id = hp.family_id FROM huerto_plants hp WHERE hp.id = hph.plant_id;

SELECT drop_all_policies('huerto_plants');
SELECT drop_all_policies('huerto_plant_history');

CREATE POLICY huerto_plants_select ON huerto_plants FOR SELECT USING (has_family_access(family_id, 'huerto', 'view'));
CREATE POLICY huerto_plants_write ON huerto_plants FOR ALL
  USING (has_family_access(family_id, 'huerto', 'full')) WITH CHECK (has_family_access(family_id, 'huerto', 'full'));

CREATE POLICY huerto_plant_history_select ON huerto_plant_history FOR SELECT USING (has_family_access(family_id, 'huerto', 'view'));
CREATE POLICY huerto_plant_history_write ON huerto_plant_history FOR ALL
  USING (has_family_access(family_id, 'huerto', 'full')) WITH CHECK (has_family_access(family_id, 'huerto', 'full'));
