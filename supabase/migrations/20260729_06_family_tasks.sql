-- 20260729_06_family_tasks.sql
ALTER TABLE task_lists ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE task_lists tl SET family_id = f.id FROM families f WHERE f.owner_id = tl.owner_id;
ALTER TABLE task_lists ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE task_lists ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE tasks t SET family_id = f.id FROM families f WHERE f.owner_id = t.user_id;
ALTER TABLE tasks ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

SELECT drop_all_policies('tasks');
SELECT drop_all_policies('task_lists');

CREATE POLICY tasks_select ON tasks FOR SELECT USING (has_family_access(family_id, 'mi-hogar.tasks', 'view'));
CREATE POLICY tasks_write ON tasks FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.tasks', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.tasks', 'full'));

CREATE POLICY task_lists_select ON task_lists FOR SELECT USING (has_family_access(family_id, 'mi-hogar.tasks', 'view'));
CREATE POLICY task_lists_write ON task_lists FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.tasks', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.tasks', 'full'));
