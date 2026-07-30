-- 20260729_04b_family_pharmacy_default.sql
-- Backport of the Task 7 fix: medicines.family_id is NOT NULL with no default
-- and no populating trigger, and the pharmacy frontend insert never sets it,
-- so adding a medicine currently fails RLS in production for every user.
ALTER TABLE medicines ALTER COLUMN family_id SET DEFAULT resolve_current_family_id();
