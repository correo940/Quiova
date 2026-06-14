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
    auth_user_id    uuid,                      -- se rellena al aprobar (auth.users)
    ip              text,
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
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key         text NOT NULL UNIQUE,
    title       text NOT NULL,
    description text NOT NULL DEFAULT '',
    points      integer NOT NULL DEFAULT 0,
    type        text NOT NULL DEFAULT 'custom'
                CHECK (type IN ('register','social','referral','code','bug','share','custom')),
    target_url  text,
    active      boolean NOT NULL DEFAULT true,
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
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
