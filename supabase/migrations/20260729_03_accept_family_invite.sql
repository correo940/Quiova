-- 20260729_03_accept_family_invite.sql
CREATE OR REPLACE FUNCTION accept_family_invite(p_code TEXT)
RETURNS family_members
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row family_members;
BEGIN
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
