-- 20260729_17_family_expenses.sql
-- Task 20: Familiarizar Gastos (expenses, expense_categories)
-- expense_folders/expense_partners/expense_invitations/expense_folder_members
-- already have their own multi-user sharing model, left as-is

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE expenses e SET family_id = f.id FROM families f WHERE f.owner_id = e.user_id;
ALTER TABLE expenses ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE expense_categories ec SET family_id = f.id FROM families f WHERE f.owner_id = ec.created_by;
ALTER TABLE expense_categories ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

SELECT drop_all_policies('expenses');
SELECT drop_all_policies('expense_categories');

CREATE POLICY expenses_select ON expenses FOR SELECT
  USING (has_family_access(family_id, 'mi-hogar.expenses', 'view'));
CREATE POLICY expenses_write ON expenses FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.expenses', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.expenses', 'full'));

CREATE POLICY expense_categories_select ON expense_categories FOR SELECT
  USING (family_id IS NULL OR has_family_access(family_id, 'mi-hogar.expenses', 'view'));
CREATE POLICY expense_categories_write ON expense_categories FOR ALL
  USING (family_id IS NOT NULL AND has_family_access(family_id, 'mi-hogar.expenses', 'full'))
  WITH CHECK (family_id IS NOT NULL AND has_family_access(family_id, 'mi-hogar.expenses', 'full'));
