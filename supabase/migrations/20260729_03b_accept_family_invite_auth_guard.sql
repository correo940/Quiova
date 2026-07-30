-- 20260729_03b_accept_family_invite_auth_guard.sql
-- Fix: accept_family_invite() was callable by unauthenticated `anon` callers
-- (auth.uid() IS NULL inside the function) with no internal check, letting
-- anyone who knows/guesses a pending invite_code burn it via PostgREST
-- directly, bypassing the Next.js route's getUser() check. Add an explicit
-- guard, and revoke EXECUTE from anon as belt-and-suspenders.

CREATE OR REPLACE FUNCTION accept_family_invite(p_code TEXT)
RETURNS family_members
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row family_members;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no autenticado';
  END IF;

  UPDATE family_members
  SET user_id = auth.uid(), status = 'active'
  WHERE invite_code = p_code AND status = 'pending'
  RETURNING * INTO v_row;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'codigo invalido o ya usado';
  END IF;

  RETURN v_row;
END;
$$;

-- PostgreSQL grants EXECUTE to PUBLIC by default on function creation, and
-- anon/authenticated inherit PUBLIC privileges regardless of a per-role
-- REVOKE, so PUBLIC must be revoked explicitly too.
REVOKE EXECUTE ON FUNCTION accept_family_invite(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION accept_family_invite(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION accept_family_invite(TEXT) TO authenticated;
