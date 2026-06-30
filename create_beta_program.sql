-- ============================================================================
-- QUIOBA — PROGRAMA BETA TESTERS
-- Esquema completo: usuarios beta, puntos, misiones, logros, referidos,
-- códigos secretos, auditoría admin, aprobaciones y eventos de email.
--
-- Seguridad: RLS habilitado en TODAS las tablas SIN políticas permisivas.
-- Todo el acceso pasa por API routes con service_role (supabaseAdmin).
-- Esto bloquea cualquier lectura/escritura directa desde el cliente.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. USUARIOS BETA
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beta_users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           text NOT NULL,
    nickname        text NOT NULL,
    avatar_id       text NOT NULL,
    tiktok          text,
    instagram       text,
    youtube         text,
    follows_socials boolean NOT NULL DEFAULT false,
    points          integer NOT NULL DEFAULT 0,
    status          text NOT NULL DEFAULT 'pendiente'
                    CHECK (status IN ('pendiente','validando','aprobado','rechazado','suspendido')),
    referral_code   text NOT NULL,
    referred_by     uuid REFERENCES public.beta_users(id) ON DELETE SET NULL,
    access_token    uuid NOT NULL DEFAULT gen_random_uuid(),
    auth_user_id       uuid,                   -- se rellena al aprobar (auth.users)
    email_verified_at  timestamptz,            -- null = sin verificar (nuevo flujo)
    ip                 text,
    user_agent      text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    approved_at     timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS beta_users_email_key    ON public.beta_users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS beta_users_nickname_key ON public.beta_users (lower(nickname));
CREATE UNIQUE INDEX IF NOT EXISTS beta_users_refcode_key  ON public.beta_users (referral_code);
CREATE UNIQUE INDEX IF NOT EXISTS beta_users_token_key    ON public.beta_users (access_token);
CREATE INDEX IF NOT EXISTS beta_users_points_idx          ON public.beta_users (points DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS beta_users_status_idx          ON public.beta_users (status);

-- ---------------------------------------------------------------------------
-- 2. HISTORIAL DE PUNTOS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beta_points_history (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    beta_user_id  uuid NOT NULL REFERENCES public.beta_users(id) ON DELETE CASCADE,
    delta         integer NOT NULL,
    reason        text NOT NULL,
    meta          jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS beta_points_history_user_idx ON public.beta_points_history (beta_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. MISIONES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beta_missions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key               text NOT NULL UNIQUE,
    title             text NOT NULL,
    description       text NOT NULL DEFAULT '',
    points            integer NOT NULL DEFAULT 0,
    type              text NOT NULL DEFAULT 'custom'
                      CHECK (type IN ('register','social','referral','code','bug','share','custom')),
    -- Cómo se verifica la misión. Define el flujo de UI y la concesión de puntos:
    --   automatic  → el sistema la completa sin intervención del usuario
    --   declaration → el usuario declara haberla hecho; queda pendiente de revisión admin
    --   manual     → el usuario envía un formulario; queda pendiente de revisión admin
    verification_type text NOT NULL DEFAULT 'automatic'
                      CHECK (verification_type IN ('automatic','declaration','manual')),
    target_url        text,
    active            boolean NOT NULL DEFAULT true,
    sort_order        integer NOT NULL DEFAULT 0,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.beta_mission_completions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    beta_user_id  uuid NOT NULL REFERENCES public.beta_users(id) ON DELETE CASCADE,
    mission_id    uuid NOT NULL REFERENCES public.beta_missions(id) ON DELETE CASCADE,
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (beta_user_id, mission_id)
);

-- ---------------------------------------------------------------------------
-- 4. LOGROS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beta_achievements (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key             text NOT NULL UNIQUE,
    title           text NOT NULL,
    description     text NOT NULL DEFAULT '',
    icon            text NOT NULL DEFAULT '🏅',
    -- criterio: tipo + valor. Evaluado en servidor al otorgar puntos/referidos.
    criteria_type   text NOT NULL DEFAULT 'manual'
                    CHECK (criteria_type IN ('manual','points','referrals','rank','code')),
    criteria_value  integer NOT NULL DEFAULT 0,
    sort_order      integer NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.beta_achievement_unlocks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    beta_user_id    uuid NOT NULL REFERENCES public.beta_users(id) ON DELETE CASCADE,
    achievement_id  uuid NOT NULL REFERENCES public.beta_achievements(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (beta_user_id, achievement_id)
);

-- ---------------------------------------------------------------------------
-- 5. REFERIDOS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beta_referrals (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id  uuid NOT NULL REFERENCES public.beta_users(id) ON DELETE CASCADE,
    referred_id  uuid NOT NULL REFERENCES public.beta_users(id) ON DELETE CASCADE,
    status       text NOT NULL DEFAULT 'validated'
                 CHECK (status IN ('pending','validated','rejected')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (referred_id)               -- cada usuario solo puede ser referido una vez
);
CREATE INDEX IF NOT EXISTS beta_referrals_referrer_idx ON public.beta_referrals (referrer_id);

-- ---------------------------------------------------------------------------
-- 6. CÓDIGOS SECRETOS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beta_secret_codes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code        text NOT NULL UNIQUE,
    title       text NOT NULL DEFAULT '',
    points      integer NOT NULL DEFAULT 10,
    starts_at   timestamptz,
    ends_at     timestamptz,
    max_uses    integer,                       -- NULL = ilimitado
    uses        integer NOT NULL DEFAULT 0,
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.beta_secret_code_claims (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code_id       uuid NOT NULL REFERENCES public.beta_secret_codes(id) ON DELETE CASCADE,
    beta_user_id  uuid NOT NULL REFERENCES public.beta_users(id) ON DELETE CASCADE,
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (code_id, beta_user_id)
);

-- ---------------------------------------------------------------------------
-- 7. AUDITORÍA ADMIN Y APROBACIONES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beta_admin_actions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email    text NOT NULL,
    action         text NOT NULL,
    target_user_id uuid REFERENCES public.beta_users(id) ON DELETE SET NULL,
    meta           jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.beta_approval_logs (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    beta_user_id  uuid NOT NULL REFERENCES public.beta_users(id) ON DELETE CASCADE,
    from_status   text,
    to_status     text NOT NULL,
    admin_email   text NOT NULL,
    note          text,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 8. EVENTOS DE EMAIL
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beta_email_events (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    beta_user_id  uuid REFERENCES public.beta_users(id) ON DELETE SET NULL,
    type          text NOT NULL,
    to_email      text NOT NULL,
    subject       text NOT NULL,
    status        text NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','sent','failed')),
    provider_id   text,
    error         text,
    payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at    timestamptz NOT NULL DEFAULT now(),
    sent_at       timestamptz
);
CREATE INDEX IF NOT EXISTS beta_email_events_user_idx ON public.beta_email_events (beta_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 9. CONFIG DE PUNTOS (clave/valor editable desde panel admin)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beta_settings (
    key         text PRIMARY KEY,
    value       integer NOT NULL,
    label       text NOT NULL DEFAULT '',
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RLS: habilitar en todas, sin políticas (deny-all para anon/authenticated).
-- El service_role omite RLS, así que las API routes siguen funcionando.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'beta_users','beta_points_history','beta_missions','beta_mission_completions',
        'beta_achievements','beta_achievement_unlocks','beta_referrals','beta_secret_codes',
        'beta_secret_code_claims','beta_admin_actions','beta_approval_logs','beta_email_events',
        'beta_settings'
    ] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- TRIGGER: updated_at en beta_users
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.beta_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_beta_users_updated ON public.beta_users;
CREATE TRIGGER trg_beta_users_updated
    BEFORE UPDATE ON public.beta_users
    FOR EACH ROW EXECUTE FUNCTION public.beta_touch_updated_at();

-- ---------------------------------------------------------------------------
-- RPC: otorgar puntos de forma atómica (incrementa points + inserta historial)
-- SECURITY DEFINER para uso desde service_role (consistencia garantizada).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.beta_award_points(
    p_user_id uuid,
    p_delta   integer,
    p_reason  text,
    p_meta    jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_total integer;
BEGIN
    UPDATE public.beta_users
       SET points = points + p_delta
     WHERE id = p_user_id
     RETURNING points INTO new_total;

    IF new_total IS NULL THEN
        RAISE EXCEPTION 'beta_user % no existe', p_user_id;
    END IF;

    INSERT INTO public.beta_points_history (beta_user_id, delta, reason, meta)
    VALUES (p_user_id, p_delta, p_reason, COALESCE(p_meta, '{}'::jsonb));

    RETURN new_total;
END $$;

REVOKE ALL ON FUNCTION public.beta_award_points(uuid,integer,text,jsonb) FROM public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: completar misión de forma atómica (completion + puntos en una TX)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.beta_complete_mission(
    p_user_id     uuid,
    p_mission_key text
)
RETURNS TABLE (awarded boolean, points_earned integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_mission_id  uuid;
    v_points      integer;
    v_active      boolean;
BEGIN
    SELECT id, points, active INTO v_mission_id, v_points, v_active
    FROM public.beta_missions WHERE key = p_mission_key;
    IF NOT FOUND OR NOT v_active THEN RETURN QUERY SELECT false, 0; RETURN; END IF;

    INSERT INTO public.beta_mission_completions (beta_user_id, mission_id)
    VALUES (p_user_id, v_mission_id)
    ON CONFLICT (beta_user_id, mission_id) DO NOTHING;
    IF NOT FOUND THEN RETURN QUERY SELECT false, 0; RETURN; END IF;

    IF v_points > 0 THEN
        UPDATE public.beta_users SET points = points + v_points WHERE id = p_user_id;
        INSERT INTO public.beta_points_history (beta_user_id, delta, reason, meta)
        VALUES (p_user_id, v_points, 'mission:' || p_mission_key,
                jsonb_build_object('mission', p_mission_key));
    END IF;
    RETURN QUERY SELECT true, COALESCE(v_points, 0);
END $$;
REVOKE ALL ON FUNCTION public.beta_complete_mission(uuid, text) FROM public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: aprobar revisión de misión de forma atómica (FOR UPDATE + TX)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.beta_approve_mission_review(
    p_review_id   uuid,
    p_reviewed_by text
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id uuid; v_mission_id uuid; v_status text;
    v_key text; v_points integer; v_active boolean;
BEGIN
    SELECT r.beta_user_id, r.mission_id, r.status INTO v_user_id, v_mission_id, v_status
    FROM public.beta_mission_reviews r WHERE r.id = p_review_id FOR UPDATE;
    IF NOT FOUND THEN RETURN 'not_found'; END IF;
    IF v_status != 'pending' THEN RETURN 'not_pending'; END IF;

    SELECT key, points, active INTO v_key, v_points, v_active
    FROM public.beta_missions WHERE id = v_mission_id;

    UPDATE public.beta_mission_reviews
    SET status = 'approved', reviewed_by = p_reviewed_by, reviewed_at = now()
    WHERE id = p_review_id;

    IF v_active THEN
        INSERT INTO public.beta_mission_completions (beta_user_id, mission_id)
        VALUES (v_user_id, v_mission_id) ON CONFLICT (beta_user_id, mission_id) DO NOTHING;
        IF FOUND AND v_points > 0 THEN
            UPDATE public.beta_users SET points = points + v_points WHERE id = v_user_id;
            INSERT INTO public.beta_points_history (beta_user_id, delta, reason, meta)
            VALUES (v_user_id, v_points, 'mission:' || v_key,
                    jsonb_build_object('mission', v_key, 'review_id', p_review_id));
        END IF;
    END IF;
    RETURN 'ok';
END $$;
REVOKE ALL ON FUNCTION public.beta_approve_mission_review(uuid, text) FROM public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 10. REVISIONES DE MISIONES (misiones declaration/manual)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beta_mission_reviews (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    beta_user_id  uuid NOT NULL REFERENCES public.beta_users(id) ON DELETE CASCADE,
    mission_id    uuid NOT NULL REFERENCES public.beta_missions(id) ON DELETE CASCADE,
    status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected')),
    title         text,
    description   text,
    reviewed_by   text,
    reviewed_at   timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS beta_mission_reviews_user_idx    ON public.beta_mission_reviews (beta_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS beta_mission_reviews_status_idx  ON public.beta_mission_reviews (status);

-- ---------------------------------------------------------------------------
-- 11. NOTIFICACIONES IN-APP
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beta_notifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.beta_users(id) ON DELETE CASCADE,
    type        text NOT NULL,
    title       text NOT NULL,
    message     text NOT NULL DEFAULT '',
    is_read     boolean NOT NULL DEFAULT false,
    metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS beta_notifications_user_idx ON public.beta_notifications (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RPC: posición en el ranking de un usuario (1-based)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.beta_user_rank(p_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT count(*) + 1
    FROM public.beta_users u,
         (SELECT points, created_at FROM public.beta_users WHERE id = p_user_id) me
    WHERE u.points > me.points
       OR (u.points = me.points AND u.created_at < me.created_at)
$$;

-- ============================================================================
-- SEEDS
-- ============================================================================

-- Config de puntos por defecto
INSERT INTO public.beta_settings (key, value, label) VALUES
    ('register',        10, 'Registro'),
    ('follow_tiktok',    5, 'Seguir TikTok'),
    ('follow_instagram', 5, 'Seguir Instagram'),
    ('follow_youtube',   5, 'Seguir YouTube'),
    ('referral',        10, 'Referido validado'),
    ('secret_code',     10, 'Código secreto'),
    ('bug_report',      20, 'Reportar bug'),
    ('suggestion',      50, 'Sugerencia implementada')
ON CONFLICT (key) DO NOTHING;

-- Misiones iniciales
INSERT INTO public.beta_missions (key, title, description, points, type, target_url, sort_order) VALUES
    ('register',          'Únete a la Beta',        'Completa tu registro en el programa Beta de Quioba.',        10, 'register', NULL, 1),
    ('follow_tiktok',     'Sigue en TikTok',        'Sigue la cuenta oficial de Quioba en TikTok.',                5, 'social',   'https://www.tiktok.com/@quioba',     2),
    ('follow_instagram',  'Sigue en Instagram',     'Sigue la cuenta oficial de Quioba en Instagram.',             5, 'social',   'https://www.instagram.com/quioba',   3),
    ('follow_youtube',    'Suscríbete en YouTube',  'Suscríbete al canal oficial de Quioba en YouTube.',           5, 'social',   'https://www.youtube.com/@quioba',    4),
    ('invite_friend',     'Invita a un amigo',      'Consigue que un amigo se registre con tu enlace de referido.',10, 'referral', NULL, 5),
    ('secret_code',       'Caza un código secreto', 'Introduce un código secreto publicado en nuestras redes.',    10, 'code',     NULL, 6),
    ('report_bug',        'Cazador de bugs',        'Reporta un bug que encuentres durante la beta.',              20, 'bug',      NULL, 7),
    ('share_content',     'Comparte Quioba',        'Comparte contenido de Quioba en tus redes sociales.',         10, 'share',    NULL, 8)
ON CONFLICT (key) DO NOTHING;

-- Logros iniciales
INSERT INTO public.beta_achievements (key, title, description, icon, criteria_type, criteria_value, sort_order) VALUES
    ('first_signup',  'Primer Registro',   'Te uniste al programa Beta de Quioba.',          '🚀', 'manual',    0,  1),
    ('first_referral','Primer Referido',   'Conseguiste tu primer referido validado.',       '🤝', 'referrals', 1,  2),
    ('referrals_5',   '5 Referidos',       'Invitaste a 5 personas a la beta.',              '🔥', 'referrals', 5,  3),
    ('referrals_10',  '10 Referidos',      'Invitaste a 10 personas a la beta.',             '👑', 'referrals', 10, 4),
    ('ambassador',    'Embajador Quioba',  'Alcanzaste 100 puntos. Eres un embajador.',      '🌟', 'points',    100,5),
    ('top_50',        'Top 50',            'Entraste en el Top 50 del ranking.',             '🏆', 'rank',      50, 6),
    ('top_10',        'Top 10',            'Entraste en el Top 10 del ranking.',             '💎', 'rank',      10, 7),
    ('bug_hunter',    'Cazador de Bugs',   'Reportaste tu primer bug.',                      '🐛', 'manual',    0,  8)
ON CONFLICT (key) DO NOTHING;

-- Códigos secretos de ejemplo (inactivos por defecto, actívalos desde el panel)
INSERT INTO public.beta_secret_codes (code, title, points, active) VALUES
    ('QB001', 'Código de bienvenida', 10, false),
    ('QB002', 'Código TikTok',        10, false),
    ('QB003', 'Código Instagram',     10, false)
ON CONFLICT (code) DO NOTHING;
