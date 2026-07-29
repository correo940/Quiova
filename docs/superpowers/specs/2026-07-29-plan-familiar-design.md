# Plan Individual vs Plan Familiar — permisos por app

Fecha: 2026-07-29

## 1. Objetivo

Permitir que un usuario en **plan familiar** invite a otras personas (con cuenta
propia en Quioba) y les conceda, app por app, uno de tres niveles de acceso:

- **Nada** — la app ni siquiera aparece / no puede entrar.
- **Solo ver** — puede leer los datos compartidos de la familia, no puede crear/editar/borrar.
- **Total** — mismos permisos que el dueño dentro de esa app.

Una cuenta puede seguir usándose en modo individual (sus propios datos, como
hoy) y además pertenecer a una familia ajena como miembro invitado — ambos
modos coexisten en la misma cuenta, no son excluyentes.

Los datos de una app en modo familiar son **un único espacio compartido por
familia** (igual que ya ocurre hoy con `expense_partners` /
`get_folder_members` en Gastos), no una copia por miembro.

El precio diferenciado individual/familiar se deja solo como **estructura de
datos** en esta fase; no se define cifra ni se integra cobro real.

## 2. Modelo de datos

```sql
-- Una familia = el "espacio" que posee y paga el dueño
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Miembros invitados (cada uno con su propia cuenta de Supabase Auth)
CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- null mientras está 'pending' sin cuenta aún
    invited_email TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
    nickname TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (family_id, user_id)
);

-- Permiso por miembro x app. Ausencia de fila == 'none'.
CREATE TABLE family_app_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    app_slug TEXT NOT NULL, -- ver registro de apps en sección 6
    level TEXT NOT NULL DEFAULT 'none' CHECK (level IN ('none', 'view', 'full')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (member_id, app_slug)
);

-- Estructura de precios (sin cifras reales todavía)
CREATE TABLE plan_prices (
    tier TEXT PRIMARY KEY CHECK (tier IN ('premium', 'family')),
    price_cents INTEGER,       -- NULL hasta definir cifra real
    currency TEXT DEFAULT 'EUR',
    active_from TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`profiles.subscription_tier` ya admite `'free' | 'premium' | 'family'`
(migración `20260123_profile_enhancements.sql`) — no requiere cambio.

Cada tabla de datos de una app "familiarizada" gana una columna
`family_id UUID REFERENCES families(id)`. Al activar plan familiar, las filas
existentes del dueño se retro-etiquetan con el `family_id` recién creado
(`UPDATE tabla SET family_id = ... WHERE user_id = owner_id`).

## 3. Enforcement (RLS)

Función SQL reutilizable en todas las políticas:

```sql
CREATE OR REPLACE FUNCTION has_family_access(p_family_id UUID, p_app_slug TEXT, p_min_level TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    -- el dueño de la familia siempre tiene 'full'
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
```

Patrón de política por tabla de app (ejemplo Botiquín):

```sql
DROP POLICY IF EXISTS pharmacy_select ON pharmacy_items;
CREATE POLICY pharmacy_select ON pharmacy_items FOR SELECT
  USING (has_family_access(family_id, 'mi-hogar.pharmacy', 'view'));

CREATE POLICY pharmacy_write ON pharmacy_items FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.pharmacy', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.pharmacy', 'full'));
```

Este patrón se repite por cada tabla de cada app familiarizable (ver §6).

## 4. Flujo de invitación

1. Dueño en plan familiar abre **Gestionar familia** → genera `invite_code` o
   envía email (reutilizando `lib/email`).
2. Invitado, con cuenta propia (nueva o existente), introduce el código →
   se crea/activa su fila en `family_members` (`status: pending → active`
   tras confirmar).
3. Un usuario puede aceptar la invitación sin perder su cuenta individual:
   pertenecer a una familia no cambia su `subscription_tier` propio, solo le
   da acceso a los datos compartidos de esa familia según los permisos que
   reciba.
4. El dueño puede revocar (`status = 'removed'`) en cualquier momento; sus
   filas en `family_app_permissions` quedan huérfanas pero inertes (la
   función de acceso ya filtra por `status = 'active'`).

## 5. UI — matriz de permisos

Pantalla **Gestionar familia** (solo visible si `subscription_tier = 'family'`
y `auth.uid() = families.owner_id`):

- Lista de miembros (activos / pendientes) con botón invitar y quitar.
- Por cada miembro: tabla app × nivel, agrupada por categoría (Mi Hogar, Mi
  Viaje, Huerto...), selector de 3 estados por fila. Guardar = upsert en
  `family_app_permissions`.
- Cada app, al montar, resuelve su propio nivel para el usuario actual
  (dueño → `full` implícito; miembro → consulta su permiso) antes de
  renderizar controles de edición; si el nivel es `none`, la app no es
  navegable para ese miembro (redirect o mensaje).

## 6. Alcance de la migración — registro de apps

De las apps actuales, se familiarizan (ganan `family_id` + RLS) las que
manejan datos privados de un hogar/persona:

**Mi Hogar**: pharmacy (botiquín), expenses (sustituye a `expense_partners`
por el modelo genérico), garage, tasks, roster, shopping, savings,
insurance, warranties, documents, passwords, manuals, recipes, meditation,
tiempo, asistente, workspace.

**Confesiones queda excluida** (corrección tras inspeccionar el esquema real
durante la fase de plan): `shared_thoughts` es un mecanismo de mensaje
anónimo 1:1 vía enlace/token entre cualquier par de personas
(`share_token`, `is_anonymous`, `creator_name`), no un espacio de datos del
hogar — no hay una "confesión de la familia" que compartir por diseño.

**Otras**: mi-viaje, huerto.

Quedan **fuera** de este sistema (herramientas o de uso individual/admin, sin
caso de uso de compartir en familia por ahora): watermark-remover, oficina
(ya tiene su propio control de acceso admin), debate (salas públicas, no
privadas de familia), el-campus, organizador, organizador-vital,
pausas-activas, resumen-diario, salud-ocupacional, cuadrante. Se pueden
incorporar más adelante si surge la necesidad, añadiendo su `app_slug` al
registro y su tabla al patrón de RLS.

`passwords` merece nota aparte: al dar acceso `full`/`view` a un familiar se
expone el gestor de contraseñas del hogar — se mantiene en el alcance porque
es un caso de uso real (pareja compartiendo accesos), pero se documenta como
dato sensible a tener en cuenta en el diseño de la UI de permisos (aviso
visual al conceder acceso).

## 7. Migración de `expenses`

`expense_partners` y `get_folder_members` se sustituyen por el modelo
genérico: `expense_partners` deja de usarse para invitaciones nuevas; los
pares existentes se migran a una `family` de 2 miembros con permiso `full`
mutuo, preservando compatibilidad con datos ya compartidos.

## 8. Fuera de alcance de esta fase

- Cifras de precio reales y cobro (Stripe u otro proveedor).
- Límite de miembros (sin límite fijo, según lo acordado).
- Auditoría/historial de quién hizo qué dentro del espacio compartido.
