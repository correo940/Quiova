-- 20260729_14_family_manuals.sql
-- Task 16: Familiarizar Manuales (manuals, manual_tags, manual_reminders, manual_versions)

ALTER TABLE manuals ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE manuals m SET family_id = f.id FROM families f WHERE f.owner_id = m.user_id;
ALTER TABLE manuals ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE manuals ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

ALTER TABLE manual_tags ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_manual_tags()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM manuals WHERE id = NEW.manual_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_family_id_manual_tags ON manual_tags;
CREATE TRIGGER trg_sync_family_id_manual_tags
BEFORE INSERT OR UPDATE OF manual_id ON manual_tags
FOR EACH ROW EXECUTE FUNCTION sync_family_id_manual_tags();
UPDATE manual_tags t SET family_id = m.family_id FROM manuals m WHERE m.id = t.manual_id;

ALTER TABLE manual_reminders ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_manual_reminders()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM manuals WHERE id = NEW.manual_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_family_id_manual_reminders ON manual_reminders;
CREATE TRIGGER trg_sync_family_id_manual_reminders
BEFORE INSERT OR UPDATE OF manual_id ON manual_reminders
FOR EACH ROW EXECUTE FUNCTION sync_family_id_manual_reminders();
UPDATE manual_reminders r SET family_id = m.family_id FROM manuals m WHERE m.id = r.manual_id;

ALTER TABLE manual_versions ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_manual_versions()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM manuals WHERE id = NEW.manual_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_family_id_manual_versions ON manual_versions;
CREATE TRIGGER trg_sync_family_id_manual_versions
BEFORE INSERT OR UPDATE OF manual_id ON manual_versions
FOR EACH ROW EXECUTE FUNCTION sync_family_id_manual_versions();
UPDATE manual_versions v SET family_id = m.family_id FROM manuals m WHERE m.id = v.manual_id;

SELECT drop_all_policies('manuals');
SELECT drop_all_policies('manual_tags');
SELECT drop_all_policies('manual_reminders');
SELECT drop_all_policies('manual_versions');

CREATE POLICY manuals_select ON manuals FOR SELECT USING (has_family_access(family_id, 'mi-hogar.manuals', 'view'));
CREATE POLICY manuals_write ON manuals FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.manuals', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.manuals', 'full'));

CREATE POLICY manual_tags_select ON manual_tags FOR SELECT USING (has_family_access(family_id, 'mi-hogar.manuals', 'view'));
CREATE POLICY manual_tags_write ON manual_tags FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.manuals', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.manuals', 'full'));

CREATE POLICY manual_reminders_select ON manual_reminders FOR SELECT USING (has_family_access(family_id, 'mi-hogar.manuals', 'view'));
CREATE POLICY manual_reminders_write ON manual_reminders FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.manuals', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.manuals', 'full'));

CREATE POLICY manual_versions_select ON manual_versions FOR SELECT USING (has_family_access(family_id, 'mi-hogar.manuals', 'view'));
CREATE POLICY manual_versions_write ON manual_versions FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.manuals', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.manuals', 'full'));
