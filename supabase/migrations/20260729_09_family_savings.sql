-- 20260729_09_family_savings.sql
-- Task 11: Familiarizar Ahorros (7 tablas)

-- Root tables (have user_id)
ALTER TABLE savings_accounts ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE savings_accounts a SET family_id = f.id FROM families f WHERE f.owner_id = a.user_id;
ALTER TABLE savings_accounts ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE savings_goals g SET family_id = f.id FROM families f WHERE f.owner_id = g.user_id;
ALTER TABLE savings_goals ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

ALTER TABLE savings_recurring_transactions ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE savings_recurring_transactions r SET family_id = f.id FROM families f WHERE f.owner_id = r.user_id;
ALTER TABLE savings_recurring_transactions ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

ALTER TABLE savings_recurring_items ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE savings_recurring_items i SET family_id = f.id FROM families f WHERE f.owner_id = i.user_id;
ALTER TABLE savings_recurring_items ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE savings_recurring_items ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();

-- Child tables (get family_id via trigger from parent)
ALTER TABLE savings_records ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_savings_records()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM savings_accounts WHERE id = NEW.account_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_family_id_savings_records ON savings_records;
CREATE TRIGGER trg_sync_family_id_savings_records
BEFORE INSERT OR UPDATE OF account_id ON savings_records
FOR EACH ROW EXECUTE FUNCTION sync_family_id_savings_records();
UPDATE savings_records r SET family_id = a.family_id FROM savings_accounts a WHERE a.id = r.account_id;

ALTER TABLE savings_account_transactions ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_savings_account_tx()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM savings_accounts WHERE id = NEW.account_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_family_id_savings_account_tx ON savings_account_transactions;
CREATE TRIGGER trg_sync_family_id_savings_account_tx
BEFORE INSERT OR UPDATE OF account_id ON savings_account_transactions
FOR EACH ROW EXECUTE FUNCTION sync_family_id_savings_account_tx();
UPDATE savings_account_transactions t SET family_id = a.family_id FROM savings_accounts a WHERE a.id = t.account_id;

ALTER TABLE savings_goal_transactions ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_savings_goal_tx()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM savings_goals WHERE id = NEW.goal_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_family_id_savings_goal_tx ON savings_goal_transactions;
CREATE TRIGGER trg_sync_family_id_savings_goal_tx
BEFORE INSERT OR UPDATE OF goal_id ON savings_goal_transactions
FOR EACH ROW EXECUTE FUNCTION sync_family_id_savings_goal_tx();
UPDATE savings_goal_transactions t SET family_id = g.family_id FROM savings_goals g WHERE g.id = t.goal_id;

-- Drop all existing policies
SELECT drop_all_policies('savings_accounts');
SELECT drop_all_policies('savings_goals');
SELECT drop_all_policies('savings_recurring_transactions');
SELECT drop_all_policies('savings_recurring_items');
SELECT drop_all_policies('savings_records');
SELECT drop_all_policies('savings_account_transactions');
SELECT drop_all_policies('savings_goal_transactions');

-- New family-aware RLS policies
CREATE POLICY savings_accounts_select ON savings_accounts FOR SELECT USING (has_family_access(family_id, 'mi-hogar.savings', 'view'));
CREATE POLICY savings_accounts_write ON savings_accounts FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.savings', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.savings', 'full'));

CREATE POLICY savings_goals_select ON savings_goals FOR SELECT USING (has_family_access(family_id, 'mi-hogar.savings', 'view'));
CREATE POLICY savings_goals_write ON savings_goals FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.savings', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.savings', 'full'));

CREATE POLICY savings_recurring_transactions_select ON savings_recurring_transactions FOR SELECT USING (has_family_access(family_id, 'mi-hogar.savings', 'view'));
CREATE POLICY savings_recurring_transactions_write ON savings_recurring_transactions FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.savings', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.savings', 'full'));

CREATE POLICY savings_recurring_items_select ON savings_recurring_items FOR SELECT USING (has_family_access(family_id, 'mi-hogar.savings', 'view'));
CREATE POLICY savings_recurring_items_write ON savings_recurring_items FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.savings', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.savings', 'full'));

CREATE POLICY savings_records_select ON savings_records FOR SELECT USING (has_family_access(family_id, 'mi-hogar.savings', 'view'));
CREATE POLICY savings_records_write ON savings_records FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.savings', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.savings', 'full'));

CREATE POLICY savings_account_transactions_select ON savings_account_transactions FOR SELECT USING (has_family_access(family_id, 'mi-hogar.savings', 'view'));
CREATE POLICY savings_account_transactions_write ON savings_account_transactions FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.savings', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.savings', 'full'));

CREATE POLICY savings_goal_transactions_select ON savings_goal_transactions FOR SELECT USING (has_family_access(family_id, 'mi-hogar.savings', 'view'));
CREATE POLICY savings_goal_transactions_write ON savings_goal_transactions FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.savings', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.savings', 'full'));
