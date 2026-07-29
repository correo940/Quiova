-- 20260729_01_family_core_schema.sql

CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (owner_id)
);
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
CREATE POLICY families_owner_rw ON families FOR ALL
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
    nickname TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (family_id, user_id)
);
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY family_members_owner_rw ON family_members FOR ALL
  USING (EXISTS (SELECT 1 FROM families f WHERE f.id = family_id AND f.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM families f WHERE f.id = family_id AND f.owner_id = auth.uid()));
CREATE POLICY family_members_self_read ON family_members FOR SELECT
  USING (user_id = auth.uid());

CREATE TABLE family_app_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    app_slug TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'none' CHECK (level IN ('none', 'view', 'full')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (member_id, app_slug)
);
ALTER TABLE family_app_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY family_app_permissions_owner_rw ON family_app_permissions FOR ALL
  USING (EXISTS (SELECT 1 FROM families f WHERE f.id = family_id AND f.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM families f WHERE f.id = family_id AND f.owner_id = auth.uid()));
CREATE POLICY family_app_permissions_self_read ON family_app_permissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM family_members fm WHERE fm.id = member_id AND fm.user_id = auth.uid()));

CREATE TABLE plan_prices (
    tier TEXT PRIMARY KEY CHECK (tier IN ('premium', 'family')),
    price_cents INTEGER,
    currency TEXT NOT NULL DEFAULT 'EUR',
    active_from TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE plan_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY plan_prices_public_read ON plan_prices FOR SELECT USING (true);
INSERT INTO plan_prices (tier, price_cents) VALUES ('premium', NULL), ('family', NULL);

-- Backfill: cada perfil existente obtiene su propia familia (dueño único, sin miembros)
INSERT INTO families (owner_id)
SELECT id FROM profiles
ON CONFLICT (owner_id) DO NOTHING;

-- Toda cuenta nueva obtiene su familia automáticamente
CREATE OR REPLACE FUNCTION create_family_for_new_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO families (owner_id) VALUES (NEW.id) ON CONFLICT (owner_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_create_family_for_new_profile
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION create_family_for_new_profile();
