-- 20260729_15_family_recipes.sql
-- Task 17: Familiarizar Recetas (recipes)
-- user_id is nullable (global recipes), so family_id also nullable

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE recipes r SET family_id = f.id FROM families f WHERE f.owner_id = r.user_id AND r.user_id IS NOT NULL;
ALTER TABLE recipes ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

SELECT drop_all_policies('recipes');

CREATE POLICY recipes_select ON recipes FOR SELECT
  USING (family_id IS NULL OR has_family_access(family_id, 'mi-hogar.recipes', 'view'));
CREATE POLICY recipes_write ON recipes FOR ALL
  USING (family_id IS NOT NULL AND has_family_access(family_id, 'mi-hogar.recipes', 'full'))
  WITH CHECK (family_id IS NOT NULL AND has_family_access(family_id, 'mi-hogar.recipes', 'full'));
