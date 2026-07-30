-- 20260729_01b_family_core_schema_search_path.sql
-- Pin search_path on the SECURITY DEFINER function to close function_search_path_mutable lint.

ALTER FUNCTION create_family_for_new_profile() SET search_path = public;
