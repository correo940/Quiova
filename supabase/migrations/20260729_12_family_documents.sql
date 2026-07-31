-- 20260729_12_family_documents.sql
-- Task 14: Familiarizar Documentos (documents, document_reminders, document_versions)

ALTER TABLE documents ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE documents d SET family_id = f.id FROM families f WHERE f.owner_id = d.user_id;
ALTER TABLE documents ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

ALTER TABLE document_reminders ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_document_reminders()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM documents WHERE id = NEW.document_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_family_id_document_reminders ON document_reminders;
CREATE TRIGGER trg_sync_family_id_document_reminders
BEFORE INSERT OR UPDATE OF document_id ON document_reminders
FOR EACH ROW EXECUTE FUNCTION sync_family_id_document_reminders();
UPDATE document_reminders r SET family_id = d.family_id FROM documents d WHERE d.id = r.document_id;

ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_document_versions()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM documents WHERE id = NEW.document_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_family_id_document_versions ON document_versions;
CREATE TRIGGER trg_sync_family_id_document_versions
BEFORE INSERT OR UPDATE OF document_id ON document_versions
FOR EACH ROW EXECUTE FUNCTION sync_family_id_document_versions();
UPDATE document_versions v SET family_id = d.family_id FROM documents d WHERE d.id = v.document_id;

SELECT drop_all_policies('documents');
SELECT drop_all_policies('document_reminders');
SELECT drop_all_policies('document_versions');

CREATE POLICY documents_select ON documents FOR SELECT USING (has_family_access(family_id, 'mi-hogar.documents', 'view'));
CREATE POLICY documents_write ON documents FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.documents', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.documents', 'full'));

CREATE POLICY document_reminders_select ON document_reminders FOR SELECT USING (has_family_access(family_id, 'mi-hogar.documents', 'view'));
CREATE POLICY document_reminders_write ON document_reminders FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.documents', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.documents', 'full'));

CREATE POLICY document_versions_select ON document_versions FOR SELECT USING (has_family_access(family_id, 'mi-hogar.documents', 'view'));
CREATE POLICY document_versions_write ON document_versions FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.documents', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.documents', 'full'));
