-- 20260729_02_has_family_access.sql
CREATE OR REPLACE FUNCTION has_family_access(p_family_id UUID, p_app_slug TEXT, p_min_level TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM families WHERE id = p_family_id AND owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM family_app_permissions fap
      JOIN family_members fm ON fm.id = fap.member_id
      WHERE fm.family_id = p_family_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
        AND fap.app_slug = p_app_slug
        AND (
          (p_min_level = 'view' AND fap.level IN ('view', 'full'))
          OR (p_min_level = 'full' AND fap.level = 'full')
        )
    );
$$;

CREATE OR REPLACE FUNCTION drop_all_policies(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = p_table LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, p_table);
  END LOOP;
END;
$$;
