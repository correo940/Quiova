-- 20260729_08_family_shopping.sql
-- Task 10: Familiarizar Lista de la compra (shopping_items)

ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE shopping_items s SET family_id = f.id FROM families f WHERE f.owner_id = s.user_id;
ALTER TABLE shopping_items ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE shopping_items ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

SELECT drop_all_policies('shopping_items');

CREATE POLICY shopping_items_select ON shopping_items FOR SELECT
  USING (has_family_access(family_id, 'mi-hogar.shopping', 'view'));
CREATE POLICY shopping_items_write ON shopping_items FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.shopping', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.shopping', 'full'));
