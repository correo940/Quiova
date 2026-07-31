-- 20260729_16_family_assistant.sql
-- Task 18: Familiarizar Asistente (assistant_conversations)

ALTER TABLE assistant_conversations ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE assistant_conversations a SET family_id = f.id FROM families f WHERE f.owner_id = a.user_id;
ALTER TABLE assistant_conversations ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE assistant_conversations ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

SELECT drop_all_policies('assistant_conversations');

CREATE POLICY assistant_conversations_select ON assistant_conversations FOR SELECT
  USING (has_family_access(family_id, 'mi-hogar.asistente', 'view'));
CREATE POLICY assistant_conversations_write ON assistant_conversations FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.asistente', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.asistente', 'full'));
