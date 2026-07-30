# Plan Familiar — Permisos por App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un usuario en plan familiar invite a otras personas (con cuenta propia) y les conceda, app por app, acceso `none`/`view`/`full` sobre un espacio de datos compartido por familia, en las 20 apps de Quioba que manejan datos de hogar/persona.

**Architecture:** Tablas centrales (`families`, `family_members`, `family_app_permissions`, `plan_prices`) + una función RLS reutilizable `has_family_access()`. Cada tabla de datos de cada app gana una columna `family_id`; las políticas RLS existentes se sustituyen por una que llama a `has_family_access()`. Los dos sistemas de sharing ad-hoc ya existentes (`expense_partners`/`expense_folders` en Gastos, `task_list_members`/`task_list_invitations` en Tareas) se migran al modelo genérico.

**Tech Stack:** Next.js (App Router) + Supabase (Postgres/RLS) + `@supabase/supabase-js`. Proyecto Supabase: `bszdqnocnyhezgqehawh`. Sin framework de test unitario (no hay vitest/jest); las verificaciones de RLS se hacen con SQL directo (patrón `set_config('request.jwt.claims', ...)` + `SET LOCAL ROLE authenticated`) ejecutado con la MCP tool `execute_sql` o el SQL editor de Supabase.

## Global Constraints

- Este proyecto tiene datos reales de usuarios en producción (8 `profiles`, 55 `tasks`, 62 `work_shifts`, 60 `shopping_items`, etc.). El plan Supabase de este proyecto **no soporta branching** (`create_branch` falla con `PaymentRequiredException`, requiere plan Pro), así que **todas las migraciones de este plan se aplican directamente al proyecto de producción `bszdqnocnyhezgqehawh`** vía `mcp: apply_migration`, con cuidado: cada migración se revisa antes de aplicarse y se verifica inmediatamente después con las consultas de comprobación de cada tarea.
- **Verificación con usuarios de prueba dedicados, no cuentas reales.** El "patrón de dos usuarios" de cada tarea de Phase 1 usa dos cuentas de prueba creadas específicamente para esto (ver Task 2, Step 3), nunca IDs de `profiles` reales — evita mezclar datos de prueba con cuentas de usuarios reales en producción. Cada tarea limpia (`DELETE`) las filas de prueba que creó en la tabla que acaba de migrar, al final de su propia verificación.
- `profiles.subscription_tier` ya admite `'free' | 'premium' | 'family'` (migración `20260123_profile_enhancements.sql`) — no se toca ese CHECK.
- Toda tabla nueva lleva RLS activado desde su creación (`ENABLE ROW LEVEL SECURITY`).
- Convención de nombres de migración: `supabase/migrations/20260729_<NN>_<descripcion>.sql`, numeradas en el orden de las tareas de este plan.
- `app_slug` usa el formato `<seccion>.<app>` para apps dentro de Mi Hogar (ej. `mi-hogar.pharmacy`) y `<app>` a secas para apps de nivel superior (`mi-viaje`, `huerto`).
- Fuera de alcance de este plan (ya documentado en el spec): cifras de precio reales, cobro con Stripe, límite de miembros, auditoría de quién hizo qué.
- **Nota de seguridad no relacionada, detectada al inspeccionar el esquema:** `public.beta_mission_reviews` y `public.oficina_tablon` tienen RLS desactivado en producción. No se corrige en este plan (fuera de alcance) — está reportado aparte al usuario.

---

## PHASE 0 — Núcleo

### Task 1: Esquema central de familias

**Files:**
- Create: `supabase/migrations/20260729_01_family_core_schema.sql`

**Interfaces:**
- Produces: tablas `families(id, owner_id, created_at)`, `family_members(id, family_id, user_id, invited_email, invite_code, status, nickname, created_at)`, `family_app_permissions(id, family_id, member_id, app_slug, level, updated_at)`, `plan_prices(tier, price_cents, currency, active_from)`. Todo `profiles.id` existente tiene exactamente una fila en `families` con `owner_id = profiles.id`.

- [ ] **Step 1: Confirmar project_id de producción**

Este proyecto Supabase no soporta branching (plan actual no es Pro). Todas las migraciones de este plan se aplican directamente al proyecto de producción, `project_id = bszdqnocnyhezgqehawh`. Usar `mcp: list_projects` para confirmar que este es el único proyecto y que sigue activo antes de aplicar nada.

- [ ] **Step 2: Escribir la migración del esquema**

```sql
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
```

- [ ] **Step 3: Aplicar la migración en producción**

Usar `mcp: apply_migration` con `project_id = bszdqnocnyhezgqehawh` y el SQL de arriba. Esta migración solo crea tablas nuevas y un trigger sobre `INSERT` en `profiles` — no modifica ninguna tabla ni fila existente aparte del backfill de `families`, así que es de bajo riesgo para los datos actuales.

- [ ] **Step 4: Verificar con SQL, y crear los dos usuarios de prueba dedicados**

```sql
-- cada profile tiene exactamente 1 family
SELECT count(*) FROM profiles p WHERE NOT EXISTS (SELECT 1 FROM families f WHERE f.owner_id = p.id);
-- Esperado: 0

-- crear un profile de prueba y comprobar que dispara el trigger (se limpia al final de este step)
INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'qa-family-trigger-test@quioba.internal') RETURNING id;
-- (usar el id devuelto) INSERT INTO profiles (id) VALUES ('<id>');
SELECT * FROM families WHERE owner_id = '<id>';
-- Esperado: 1 fila

-- limpiar el profile de prueba del trigger
DELETE FROM auth.users WHERE email = 'qa-family-trigger-test@quioba.internal'; -- el ON DELETE CASCADE limpia families/profiles

-- Crear los DOS usuarios de prueba dedicados que usarán todas las tareas de Phase 1
-- (no se borran aquí: se reutilizan en cada tarea posterior y se eliminan en Task 24)
INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'qa-family-owner@quioba.internal') RETURNING id; -- guardar como <QA_OWNER_ID>
INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'qa-family-member@quioba.internal') RETURNING id; -- guardar como <QA_MEMBER_ID>
INSERT INTO profiles (id) VALUES ('<QA_OWNER_ID>'), ('<QA_MEMBER_ID>');
-- El trigger crea automáticamente una `families` row para cada uno; anotar el id de la familia de <QA_OWNER_ID>
SELECT id AS qa_family_id FROM families WHERE owner_id = '<QA_OWNER_ID>';
```

Anotar `<QA_OWNER_ID>`, `<QA_MEMBER_ID>` y `qa_family_id` en el reporte de esta tarea — todas las tareas de Phase 1 (6 a 23) los reutilizan como "los dos usuarios de prueba".

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260729_01_family_core_schema.sql
git commit -m "feat(db): esquema central de familias y permisos por app"
```

---

### Task 2: Función RLS `has_family_access`

**Files:**
- Create: `supabase/migrations/20260729_02_has_family_access.sql`

**Interfaces:**
- Consumes: `families`, `family_members`, `family_app_permissions` de Task 1.
- Produces: `has_family_access(p_family_id UUID, p_app_slug TEXT, p_min_level TEXT) RETURNS BOOLEAN` — usada por todas las políticas RLS de Phase 1. `p_min_level` acepta `'view'` o `'full'`. También produce `drop_all_policies(p_table TEXT) RETURNS VOID` — helper usado por las 19 migraciones de Phase 1 para eliminar las políticas RLS previas de una tabla sin conocer sus nombres de antemano.

- [ ] **Step 1: Escribir la función**

```sql
-- 20260729_02_has_family_access.sql
CREATE OR REPLACE FUNCTION has_family_access(p_family_id UUID, p_app_slug TEXT, p_min_level TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
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
LANGUAGE plpgsql AS $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = p_table LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, p_table);
  END LOOP;
END;
$$;
```

- [ ] **Step 2: Aplicar en producción**

`mcp: apply_migration` con `project_id = bszdqnocnyhezgqehawh` y el SQL de arriba.

- [ ] **Step 3: Verificar con SQL usando los dos usuarios de prueba de Task 1**

Este es el "patrón de dos usuarios" al que se refieren todas las tareas de Phase 1: usa siempre `<QA_OWNER_ID>` y `<QA_MEMBER_ID>` (creados en Task 1, Step 4) y `qa_family_id` — nunca IDs de usuarios reales.

```sql
-- Dar a QA_MEMBER_ID nivel 'view' en 'mi-hogar.pharmacy' dentro de la familia de QA_OWNER_ID
INSERT INTO family_members (family_id, user_id, invited_email, invite_code, status)
VALUES ('<qa_family_id>', '<QA_MEMBER_ID>', 'qa-family-member@quioba.internal', 'QATEST01', 'active')
RETURNING id; -- guardar como <qa_member_row_id>

INSERT INTO family_app_permissions (family_id, member_id, app_slug, level)
VALUES ('<qa_family_id>', '<qa_member_row_id>', 'mi-hogar.pharmacy', 'view');

SELECT set_config('request.jwt.claims', json_build_object('sub', '<QA_OWNER_ID>')::text, true);
SET LOCAL ROLE authenticated;
SELECT has_family_access('<qa_family_id>', 'mi-hogar.pharmacy', 'full');
-- Esperado: true (QA_OWNER_ID es dueño)
RESET ROLE;

SELECT set_config('request.jwt.claims', json_build_object('sub', '<QA_MEMBER_ID>')::text, true);
SET LOCAL ROLE authenticated;
SELECT has_family_access('<qa_family_id>', 'mi-hogar.pharmacy', 'view');
-- Esperado: true (QA_MEMBER_ID tiene 'view')
SELECT has_family_access('<qa_family_id>', 'mi-hogar.pharmacy', 'full');
-- Esperado: false (QA_MEMBER_ID no tiene 'full')
RESET ROLE;

-- Dejar la membresía de prueba en 'none' para no interferir con las tareas siguientes,
-- que ajustan el nivel de 'mi-hogar.pharmacy' a lo que cada una necesite verificar.
UPDATE family_app_permissions SET level = 'none' WHERE member_id = '<qa_member_row_id>' AND app_slug = 'mi-hogar.pharmacy';
```

Anotar `<qa_member_row_id>` en el reporte de esta tarea — las tareas de Phase 1 lo reutilizan para dar/quitar permiso por `app_slug` sin volver a crear la fila de `family_members`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_02_has_family_access.sql
git commit -m "feat(db): funcion has_family_access para RLS de plan familiar"
```

---

### Task 3: Flujo de invitación (API)

**Files:**
- Create: `src/app/api/family/invite/route.ts`
- Create: `src/app/api/family/accept/route.ts`
- Create: `src/app/api/family/members/route.ts`
- Create: `src/lib/family/invite-code.ts`

**Interfaces:**
- Consumes: tablas de Task 1; `supabase` client de `src/lib/supabase`; `lib/email` existente para el envío.
- Produces: `generateInviteCode(): string` (8 caracteres alfanuméricos en mayúsculas); endpoints `POST /api/family/invite {email}`, `POST /api/family/accept {code}`, `GET /api/family/members`, `DELETE /api/family/members?id=`.

- [ ] **Step 1: Escribir `invite-code.ts`**

```typescript
// src/lib/family/invite-code.ts
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O/0/I/1 ambiguos

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
```

- [ ] **Step 2: Escribir `POST /api/family/invite`**

```typescript
// src/app/api/family/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateInviteCode } from '@/lib/family/invite-code';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email requerido' }, { status: 400 });
  }

  const authHeader = req.headers.get('authorization');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader ?? '' } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no autenticado' }, { status: 401 });

  const { data: family } = await supabase
    .from('families')
    .select('id')
    .eq('owner_id', user.id)
    .single();
  if (!family) return NextResponse.json({ error: 'familia no encontrada' }, { status: 404 });

  const invite_code = generateInviteCode();
  const { data: member, error } = await supabase
    .from('family_members')
    .insert({ family_id: family.id, invited_email: email, invite_code, status: 'pending' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ member });
}
```

- [ ] **Step 3: Escribir `POST /api/family/accept`**

```typescript
// src/app/api/family/accept/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: 'code requerido' }, { status: 400 });

  const authHeader = req.headers.get('authorization');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader ?? '' } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no autenticado' }, { status: 401 });

  // Requiere permiso: family_members_owner_rw solo deja escribir al dueño,
  // así que la asignación de user_id/status se hace via RPC security definer.
  const { data, error } = await supabase.rpc('accept_family_invite', { p_code: code });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ result: data });
}
```

- [ ] **Step 4: Migración con la función RPC que usa `accept`**

```sql
-- 20260729_03_accept_family_invite.sql
CREATE OR REPLACE FUNCTION accept_family_invite(p_code TEXT)
RETURNS family_members
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
```

Aplicar con `mcp: apply_migration` en producción (`project_id = bszdqnocnyhezgqehawh`).

- [ ] **Step 5: Escribir `GET/DELETE /api/family/members`**

```typescript
// src/app/api/family/members/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function client(req: NextRequest) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: req.headers.get('authorization') ?? '' } } }
  );
}

export async function GET(req: NextRequest) {
  const supabase = client(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no autenticado' }, { status: 401 });

  const { data: family } = await supabase.from('families').select('id').eq('owner_id', user.id).single();
  if (!family) return NextResponse.json({ members: [] });

  const { data: members, error } = await supabase
    .from('family_members')
    .select('id, invited_email, nickname, status, created_at')
    .eq('family_id', family.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ members });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const supabase = client(req);
  const { error } = await supabase.from('family_members').update({ status: 'removed' }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Verificar manualmente**

Con los dos usuarios de prueba de Task 1 (`qa-family-owner@quioba.internal` / `qa-family-member@quioba.internal`, usando `supabase.auth.admin.generateLink` o el flujo normal de login para obtener sus tokens), o con `curl` y dos tokens de sesión distintos:

```bash
curl -X POST http://localhost:3000/api/family/invite -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d '{"email":"b@example.com"}'
# devuelve member con invite_code
curl -X POST http://localhost:3000/api/family/accept -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" -d '{"code":"<invite_code>"}'
# devuelve status: active
curl http://localhost:3000/api/family/members -H "Authorization: Bearer $TOKEN_A"
# lista a B con status active
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/family supabase/migrations/20260729_03_accept_family_invite.sql src/lib/family
git commit -m "feat(family): flujo de invitacion (invite/accept/members)"
```

---

### Task 4: UI — Gestionar familia (matriz de permisos)

**Files:**
- Create: `src/app/apps/mi-hogar/familia/page.tsx`
- Create: `src/components/apps/mi-hogar/familia/family-manager.tsx`
- Create: `src/components/apps/mi-hogar/familia/permission-matrix.tsx`

**Interfaces:**
- Consumes: `/api/family/invite`, `/api/family/accept`, `/api/family/members` de Task 3; tabla `family_app_permissions` (upsert directo vía supabase-js, protegida por `family_app_permissions_owner_rw`).
- Produces: componente `<FamilyManager />` montado en `/apps/mi-hogar/familia`.

- [ ] **Step 1: Definir el registro de apps para la matriz**

```typescript
// src/lib/family/app-registry.ts
export const FAMILY_APP_REGISTRY = [
  { category: 'Mi Hogar', slug: 'mi-hogar.pharmacy', label: 'Botiquín' },
  { category: 'Mi Hogar', slug: 'mi-hogar.garage', label: 'Garaje' },
  { category: 'Mi Hogar', slug: 'mi-hogar.tasks', label: 'Tareas' },
  { category: 'Mi Hogar', slug: 'mi-hogar.roster', label: 'Turnos' },
  { category: 'Mi Hogar', slug: 'mi-hogar.shopping', label: 'Lista de la compra' },
  { category: 'Mi Hogar', slug: 'mi-hogar.savings', label: 'Ahorros' },
  { category: 'Mi Hogar', slug: 'mi-hogar.insurance', label: 'Seguros' },
  { category: 'Mi Hogar', slug: 'mi-hogar.warranties', label: 'Garantías' },
  { category: 'Mi Hogar', slug: 'mi-hogar.documents', label: 'Documentos' },
  { category: 'Mi Hogar', slug: 'mi-hogar.passwords', label: 'Contraseñas' },
  { category: 'Mi Hogar', slug: 'mi-hogar.manuals', label: 'Manuales' },
  { category: 'Mi Hogar', slug: 'mi-hogar.recipes', label: 'Recetas' },
  { category: 'Mi Hogar', slug: 'mi-hogar.asistente', label: 'Asistente' },
  { category: 'Mi Hogar', slug: 'mi-hogar.expenses', label: 'Gastos' },
  { category: 'Mi Hogar', slug: 'mi-hogar.workspace', label: 'Workspace' },
  { category: 'Mi Hogar', slug: 'mi-hogar.meditation', label: 'Meditación' },
  { category: 'Mi Hogar', slug: 'mi-hogar.tiempo', label: 'Tiempo' },
  { category: 'Otras', slug: 'mi-viaje', label: 'Mi Viaje' },
  { category: 'Otras', slug: 'huerto', label: 'Huerto' },
] as const;

export type FamilyAppSlug = typeof FAMILY_APP_REGISTRY[number]['slug'];
export type PermissionLevel = 'none' | 'view' | 'full';
```

- [ ] **Step 2: `permission-matrix.tsx`**

```tsx
// src/components/apps/mi-hogar/familia/permission-matrix.tsx
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FAMILY_APP_REGISTRY, PermissionLevel } from '@/lib/family/app-registry';

type Props = {
  memberId: string;
  familyId: string;
  initialLevels: Record<string, PermissionLevel>;
};

export function PermissionMatrix({ memberId, familyId, initialLevels }: Props) {
  const [levels, setLevels] = useState<Record<string, PermissionLevel>>(initialLevels);
  const [saving, setSaving] = useState<string | null>(null);

  const setLevel = async (appSlug: string, level: PermissionLevel) => {
    setSaving(appSlug);
    setLevels((prev) => ({ ...prev, [appSlug]: level }));
    await supabase.from('family_app_permissions').upsert(
      { family_id: familyId, member_id: memberId, app_slug: appSlug, level },
      { onConflict: 'member_id,app_slug' }
    );
    setSaving(null);
  };

  const categories = Array.from(new Set(FAMILY_APP_REGISTRY.map((a) => a.category)));

  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <div key={cat}>
          <h3 className="font-semibold mb-2">{cat}</h3>
          <table className="w-full text-sm">
            <tbody>
              {FAMILY_APP_REGISTRY.filter((a) => a.category === cat).map((app) => (
                <tr key={app.slug} className="border-b">
                  <td className="py-2">{app.label}</td>
                  {(['none', 'view', 'full'] as const).map((lvl) => (
                    <td key={lvl}>
                      <label className="flex items-center gap-1 px-2">
                        <input
                          type="radio"
                          name={`${memberId}-${app.slug}`}
                          checked={levels[app.slug] === lvl}
                          disabled={saving === app.slug}
                          onChange={() => setLevel(app.slug, lvl)}
                        />
                        {lvl === 'none' ? 'Nada' : lvl === 'view' ? 'Solo ver' : 'Total'}
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `family-manager.tsx`**

```tsx
// src/components/apps/mi-hogar/familia/family-manager.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PermissionMatrix } from './permission-matrix';

type Member = { id: string; invited_email: string; nickname: string | null; status: string };

export function FamilyManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [levels, setLevels] = useState<Record<string, 'none' | 'view' | 'full'>>({});

  const loadMembers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/family/members', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const json = await res.json();
    setMembers(json.members ?? []);
  };

  useEffect(() => {
    loadMembers();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('families').select('id').eq('owner_id', user.id).single();
      setFamilyId(data?.id ?? null);
    });
  }, []);

  const invite = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/family/invite', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setEmail('');
    loadMembers();
  };

  const selectMember = async (memberId: string) => {
    setSelected(memberId);
    const { data } = await supabase
      .from('family_app_permissions')
      .select('app_slug, level')
      .eq('member_id', memberId);
    const map: Record<string, 'none' | 'view' | 'full'> = {};
    (data ?? []).forEach((row) => { map[row.app_slug] = row.level as any; });
    setLevels(map);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@ejemplo.com" className="border px-2 py-1 rounded" />
        <button onClick={invite} className="px-3 py-1 rounded bg-[#1a5c2e] text-white">Invitar</button>
      </div>
      <ul className="space-y-1">
        {members.map((m) => (
          <li key={m.id}>
            <button onClick={() => selectMember(m.id)} className="underline">
              {m.nickname ?? m.invited_email} ({m.status})
            </button>
          </li>
        ))}
      </ul>
      {selected && familyId && (
        <PermissionMatrix memberId={selected} familyId={familyId} initialLevels={levels} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Página**

```tsx
// src/app/apps/mi-hogar/familia/page.tsx
import { FamilyManager } from '@/components/apps/mi-hogar/familia/family-manager';

export default function FamiliaPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Gestionar familia</h1>
      <FamilyManager />
    </div>
  );
}
```

- [ ] **Step 5: Verificar manualmente en el navegador**

Arrancar el dev server (`preview_start`), navegar a `/apps/mi-hogar/familia`, invitar un email, seleccionar el miembro y marcar un nivel en la matriz; confirmar en Supabase (`SELECT * FROM family_app_permissions`) que el upsert se guardó.

- [ ] **Step 6: Commit**

```bash
git add src/app/apps/mi-hogar/familia src/components/apps/mi-hogar/familia src/lib/family/app-registry.ts
git commit -m "feat(family): UI de gestion de familia y matriz de permisos"
```

---

### Task 5: Hook compartido `useAppPermission`

**Files:**
- Create: `src/hooks/useAppPermission.ts`

**Interfaces:**
- Consumes: `family_members`, `family_app_permissions`, `families` (lectura vía supabase-js, protegida por las políticas `_self_read` de Task 1).
- Produces: `useAppPermission(appSlug: FamilyAppSlug): { level: 'owner' | 'none' | 'view' | 'full', loading: boolean }`. Usado por las 20 tareas de Phase 1 para bloquear/permitir edición en el frontend (complemento de la RLS, que es la barrera real de seguridad).

- [ ] **Step 1: Escribir el hook**

```typescript
// src/hooks/useAppPermission.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { FamilyAppSlug } from '@/lib/family/app-registry';

type Level = 'owner' | 'none' | 'view' | 'full';

export function useAppPermission(appSlug: FamilyAppSlug) {
  const [level, setLevel] = useState<Level>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) { setLevel('none'); setLoading(false); } return; }

      const { data: ownFamily } = await supabase.from('families').select('id').eq('owner_id', user.id).single();
      if (ownFamily) { if (active) { setLevel('owner'); setLoading(false); } return; }

      const { data: membership } = await supabase
        .from('family_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (!membership) { if (active) { setLevel('none'); setLoading(false); } return; }

      const { data: perm } = await supabase
        .from('family_app_permissions')
        .select('level')
        .eq('member_id', membership.id)
        .eq('app_slug', appSlug)
        .maybeSingle();

      if (active) { setLevel((perm?.level as Level) ?? 'none'); setLoading(false); }
    })();
    return () => { active = false; };
  }, [appSlug]);

  return { level, loading };
}
```

- [ ] **Step 2: Verificar con un caso de uso mínimo**

En una página cualquiera temporal (o la de Botiquín en Task 6), renderizar `const { level, loading } = useAppPermission('mi-hogar.pharmacy')` y comprobar en el navegador (React DevTools o un `console.log`) que devuelve `'owner'` para el dueño y `'none'` para un usuario sin membresía.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAppPermission.ts
git commit -m "feat(family): hook useAppPermission para gating de UI por app"
```

---

## PHASE 1 — Migración por app

Patrón repetido en cada tarea: (1) migración SQL que añade `family_id`, backfillea desde `families` vía el dueño actual, y sustituye las políticas RLS por `has_family_access()`; (2) verificación SQL con dos usuarios simulados; (3) integrar `useAppPermission` en la página para bloquear edición cuando el nivel es `'view'` y ocultar la app cuando es `'none'`; (4) commit.

Para eliminar políticas existentes sin conocer sus nombres de antemano, cada migración llama a la función `drop_all_policies(text)` creada en Task 2 (ver Interfaces de Task 2): `SELECT drop_all_policies('<tabla>');` para una tabla, o `SELECT drop_all_policies(unnest(ARRAY['<t1>','<t2>']));` para varias.

### Task 6: Botiquín (`medicines`)

**Files:**
- Create: `supabase/migrations/20260729_04_family_pharmacy.sql`
- Modify: `src/app/apps/mi-hogar/pharmacy/page.tsx`

**Interfaces:**
- Consumes: `has_family_access` (Task 2), `useAppPermission('mi-hogar.pharmacy')` (Task 5).

- [ ] **Step 1: Migración**

```sql
-- 20260729_04_family_pharmacy.sql
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);

UPDATE medicines m SET family_id = f.id
FROM families f WHERE f.owner_id = m.user_id;

ALTER TABLE medicines ALTER COLUMN family_id SET NOT NULL;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='medicines' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON medicines', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY medicines_select ON medicines FOR SELECT
  USING (has_family_access(family_id, 'mi-hogar.pharmacy', 'view'));
CREATE POLICY medicines_write ON medicines FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.pharmacy', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.pharmacy', 'full'));
```

- [ ] **Step 2: Aplicar y verificar**

Aplicar con `mcp: apply_migration` en producción (`project_id = bszdqnocnyhezgqehawh`). Verificar con el patrón de dos usuarios de Task 2 Step 3 (usando `<qa_member_row_id>` y ajustando su nivel en `mi-hogar.pharmacy` en vez de crear una fila nueva), sustituyendo `has_family_access(...)` por consultas reales: `SELECT * FROM medicines;` como QA_MEMBER_ID con `level='view'` debe listar filas de la familia de QA_OWNER_ID pero un `INSERT INTO medicines (...) VALUES (...)` debe fallar con error de política; con `level='full'` el `INSERT` debe funcionar. Al terminar, `DELETE FROM medicines WHERE family_id = '<qa_family_id>'` para limpiar cualquier fila de prueba insertada, y dejar `family_app_permissions` de `mi-hogar.pharmacy` en `'none'`.

- [ ] **Step 3: Wiring en frontend**

En `src/app/apps/mi-hogar/pharmacy/page.tsx`, añadir `const { level } = useAppPermission('mi-hogar.pharmacy')`; si `level === 'none'`, mostrar mensaje "No tienes acceso a esta app" en vez del contenido; pasar `readOnly={level === 'view'}` al componente de gestión de medicinas para ocultar botones de añadir/editar/borrar.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_04_family_pharmacy.sql src/app/apps/mi-hogar/pharmacy/page.tsx
git commit -m "feat(family): familiarizar Botiquin (medicines)"
```

---

### Task 7: Garaje (`vehicles`, `vehicle_events`)

**Files:**
- Create: `supabase/migrations/20260729_05_family_garage.sql`
- Modify: `src/app/apps/mi-hogar/garage/page.tsx`

- [ ] **Step 1: Migración**

```sql
-- 20260729_05_family_garage.sql
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE vehicles v SET family_id = f.id FROM families f WHERE f.owner_id = v.user_id;
ALTER TABLE vehicles ALTER COLUMN family_id SET NOT NULL;

ALTER TABLE vehicle_events ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);

CREATE OR REPLACE FUNCTION sync_family_id_vehicle_events()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM vehicles WHERE id = NEW.vehicle_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sync_family_id_vehicle_events
BEFORE INSERT OR UPDATE OF vehicle_id ON vehicle_events
FOR EACH ROW EXECUTE FUNCTION sync_family_id_vehicle_events();

UPDATE vehicle_events ve SET family_id = v.family_id FROM vehicles v WHERE v.id = ve.vehicle_id;
ALTER TABLE vehicle_events ALTER COLUMN family_id SET NOT NULL;

DO $$
DECLARE pol RECORD; t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['vehicles', 'vehicle_events'] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY vehicles_select ON vehicles FOR SELECT USING (has_family_access(family_id, 'mi-hogar.garage', 'view'));
CREATE POLICY vehicles_write ON vehicles FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.garage', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.garage', 'full'));

CREATE POLICY vehicle_events_select ON vehicle_events FOR SELECT USING (has_family_access(family_id, 'mi-hogar.garage', 'view'));
CREATE POLICY vehicle_events_write ON vehicle_events FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.garage', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.garage', 'full'));
```

- [ ] **Step 2: Aplicar y verificar** (mismo patrón de dos usuarios que Task 6 Step 2, sobre `vehicles` e insertando en `vehicle_events` para confirmar que el trigger copia `family_id` correctamente).

- [ ] **Step 3: Wiring en frontend** — `useAppPermission('mi-hogar.garage')` en `src/app/apps/mi-hogar/garage/page.tsx`, mismo patrón que Task 6 Step 3.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_05_family_garage.sql src/app/apps/mi-hogar/garage/page.tsx
git commit -m "feat(family): familiarizar Garaje (vehicles, vehicle_events)"
```

---

### Task 8: Tareas (`tasks`, `task_lists`) — deprecar `task_list_members`/`task_list_invitations`

**Files:**
- Create: `supabase/migrations/20260729_06_family_tasks.sql`
- Modify: `src/app/apps/mi-hogar/tasks/page.tsx`
- Modify: `src/components/apps/mi-hogar/tasks/task-manager.tsx`

**Interfaces:**
- Consumes: `has_family_access`, `useAppPermission('mi-hogar.tasks')`.
- Produces: `tasks.family_id`, `task_lists.family_id`. `task_list_members`/`task_list_invitations` dejan de usarse para compartir (su rol lo cubre `family_app_permissions`); las tablas NO se borran en este plan (solo se dejan de escribir), para no perder histórico ni romper código que aún las lea durante el rollout.

- [ ] **Step 1: Migración**

```sql
-- 20260729_06_family_tasks.sql
ALTER TABLE task_lists ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE task_lists tl SET family_id = f.id FROM families f WHERE f.owner_id = tl.owner_id;
ALTER TABLE task_lists ALTER COLUMN family_id SET NOT NULL;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE tasks t SET family_id = f.id FROM families f WHERE f.owner_id = t.user_id;
ALTER TABLE tasks ALTER COLUMN family_id SET NOT NULL;

DO $$
DECLARE pol RECORD; t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tasks', 'task_lists'] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY tasks_select ON tasks FOR SELECT USING (has_family_access(family_id, 'mi-hogar.tasks', 'view'));
CREATE POLICY tasks_write ON tasks FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.tasks', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.tasks', 'full'));

CREATE POLICY task_lists_select ON task_lists FOR SELECT USING (has_family_access(family_id, 'mi-hogar.tasks', 'view'));
CREATE POLICY task_lists_write ON task_lists FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.tasks', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.tasks', 'full'));
```

- [ ] **Step 2: Aplicar y verificar** — mismo patrón de dos usuarios.

- [ ] **Step 3: Wiring en frontend** — `useAppPermission('mi-hogar.tasks')` en `task-manager.tsx`; quitar (o dejar sin efecto) los flujos de invitación por `task_list_invitations` en la UI, sustituyéndolos por un enlace a `/apps/mi-hogar/familia`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_06_family_tasks.sql src/app/apps/mi-hogar/tasks/page.tsx src/components/apps/mi-hogar/tasks/task-manager.tsx
git commit -m "feat(family): familiarizar Tareas y deprecar sharing ad-hoc de listas"
```

---

### Task 9: Turnos (`work_shifts`, `shift_types`)

**Files:**
- Create: `supabase/migrations/20260729_07_family_roster.sql`
- Modify: `src/app/apps/mi-hogar/roster/page.tsx`

- [ ] **Step 1: Migración**

```sql
-- 20260729_07_family_roster.sql
ALTER TABLE work_shifts ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE work_shifts w SET family_id = f.id FROM families f WHERE f.owner_id = w.user_id;
ALTER TABLE work_shifts ALTER COLUMN family_id SET NOT NULL;

ALTER TABLE shift_types ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE shift_types s SET family_id = f.id FROM families f WHERE f.owner_id = s.user_id;
ALTER TABLE shift_types ALTER COLUMN family_id SET NOT NULL;

DO $$
DECLARE pol RECORD; t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['work_shifts', 'shift_types'] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY work_shifts_select ON work_shifts FOR SELECT USING (has_family_access(family_id, 'mi-hogar.roster', 'view'));
CREATE POLICY work_shifts_write ON work_shifts FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.roster', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.roster', 'full'));

CREATE POLICY shift_types_select ON shift_types FOR SELECT USING (has_family_access(family_id, 'mi-hogar.roster', 'view'));
CREATE POLICY shift_types_write ON shift_types FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.roster', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.roster', 'full'));
```

- [ ] **Step 2: Aplicar y verificar** — patrón de dos usuarios.

- [ ] **Step 3: Wiring en frontend** — `useAppPermission('mi-hogar.roster')` en `src/app/apps/mi-hogar/roster/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_07_family_roster.sql src/app/apps/mi-hogar/roster/page.tsx
git commit -m "feat(family): familiarizar Turnos (work_shifts, shift_types)"
```

---

### Task 10: Lista de la compra (`shopping_items`)

**Files:**
- Create: `supabase/migrations/20260729_08_family_shopping.sql`
- Modify: `src/app/apps/mi-hogar/shopping/page.tsx`

- [ ] **Step 1: Migración**

```sql
-- 20260729_08_family_shopping.sql
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE shopping_items s SET family_id = f.id FROM families f WHERE f.owner_id = s.user_id;
ALTER TABLE shopping_items ALTER COLUMN family_id SET NOT NULL;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='shopping_items' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON shopping_items', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY shopping_items_select ON shopping_items FOR SELECT USING (has_family_access(family_id, 'mi-hogar.shopping', 'view'));
CREATE POLICY shopping_items_write ON shopping_items FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.shopping', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.shopping', 'full'));
```

- [ ] **Step 2: Aplicar y verificar** — patrón de dos usuarios.

- [ ] **Step 3: Wiring en frontend** — `useAppPermission('mi-hogar.shopping')` en `src/app/apps/mi-hogar/shopping/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_08_family_shopping.sql src/app/apps/mi-hogar/shopping/page.tsx
git commit -m "feat(family): familiarizar Lista de la compra (shopping_items)"
```

---

### Task 11: Ahorros (7 tablas)

**Files:**
- Create: `supabase/migrations/20260729_09_family_savings.sql`
- Modify: `src/app/apps/mi-hogar/savings/page.tsx`

**Tablas:** `savings_accounts` (`user_id` nullable), `savings_goals` (`user_id` nullable), `savings_recurring_transactions` (`user_id` nullable), `savings_recurring_items` (`user_id`), `savings_records` (via `account_id` → `savings_accounts`), `savings_account_transactions` (via `account_id`), `savings_goal_transactions` (via `goal_id` → `savings_goals`).

- [ ] **Step 1: Migración**

```sql
-- 20260729_09_family_savings.sql
ALTER TABLE savings_accounts ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE savings_accounts a SET family_id = f.id FROM families f WHERE f.owner_id = a.user_id;
-- filas con user_id NULL (si las hubiera) quedan sin family_id: no se exponen por RLS familiar.

ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE savings_goals g SET family_id = f.id FROM families f WHERE f.owner_id = g.user_id;

ALTER TABLE savings_recurring_transactions ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE savings_recurring_transactions r SET family_id = f.id FROM families f WHERE f.owner_id = r.user_id;

ALTER TABLE savings_recurring_items ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE savings_recurring_items i SET family_id = f.id FROM families f WHERE f.owner_id = i.user_id;
ALTER TABLE savings_recurring_items ALTER COLUMN family_id SET NOT NULL;

ALTER TABLE savings_records ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_savings_records()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM savings_accounts WHERE id = NEW.account_id;
  RETURN NEW;
END; $$;
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
CREATE TRIGGER trg_sync_family_id_savings_goal_tx
BEFORE INSERT OR UPDATE OF goal_id ON savings_goal_transactions
FOR EACH ROW EXECUTE FUNCTION sync_family_id_savings_goal_tx();
UPDATE savings_goal_transactions t SET family_id = g.family_id FROM savings_goals g WHERE g.id = t.goal_id;

DO $$
DECLARE pol RECORD; t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['savings_accounts','savings_goals','savings_recurring_transactions','savings_recurring_items','savings_records','savings_account_transactions','savings_goal_transactions'] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

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
```

- [ ] **Step 2: Aplicar y verificar** — patrón de dos usuarios sobre `savings_accounts`; además insertar en `savings_records` y `savings_account_transactions` referenciando una cuenta y confirmar que el trigger copia `family_id` desde la cuenta.

- [ ] **Step 3: Wiring en frontend** — `useAppPermission('mi-hogar.savings')` en `src/app/apps/mi-hogar/savings/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_09_family_savings.sql src/app/apps/mi-hogar/savings/page.tsx
git commit -m "feat(family): familiarizar Ahorros (7 tablas)"
```

---

### Task 12: Seguros (`insurances`)

**Files:**
- Create: `supabase/migrations/20260729_10_family_insurance.sql`
- Modify: `src/app/apps/mi-hogar/insurance/page.tsx`

- [ ] **Step 1: Migración**

```sql
-- 20260729_10_family_insurance.sql
ALTER TABLE insurances ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE insurances i SET family_id = f.id FROM families f WHERE f.owner_id = i.user_id;
ALTER TABLE insurances ALTER COLUMN family_id SET NOT NULL;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='insurances' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON insurances', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY insurances_select ON insurances FOR SELECT USING (has_family_access(family_id, 'mi-hogar.insurance', 'view'));
CREATE POLICY insurances_write ON insurances FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.insurance', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.insurance', 'full'));
```

- [ ] **Step 2: Aplicar y verificar** — patrón de dos usuarios.

- [ ] **Step 3: Wiring en frontend** — `useAppPermission('mi-hogar.insurance')` en `src/app/apps/mi-hogar/insurance/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_10_family_insurance.sql src/app/apps/mi-hogar/insurance/page.tsx
git commit -m "feat(family): familiarizar Seguros (insurances)"
```

---

### Task 13: Garantías (`warranties`)

**Files:**
- Create: `supabase/migrations/20260729_11_family_warranties.sql`
- Modify: `src/app/apps/mi-hogar/warranties/page.tsx`

- [ ] **Step 1: Migración**

```sql
-- 20260729_11_family_warranties.sql
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE warranties w SET family_id = f.id FROM families f WHERE f.owner_id = w.user_id;
ALTER TABLE warranties ALTER COLUMN family_id SET NOT NULL;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='warranties' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON warranties', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY warranties_select ON warranties FOR SELECT USING (has_family_access(family_id, 'mi-hogar.warranties', 'view'));
CREATE POLICY warranties_write ON warranties FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.warranties', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.warranties', 'full'));
```

- [ ] **Step 2: Aplicar y verificar** — patrón de dos usuarios.

- [ ] **Step 3: Wiring en frontend** — `useAppPermission('mi-hogar.warranties')` en `src/app/apps/mi-hogar/warranties/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_11_family_warranties.sql src/app/apps/mi-hogar/warranties/page.tsx
git commit -m "feat(family): familiarizar Garantias (warranties)"
```

---

### Task 14: Documentos (`documents`, `document_reminders`, `document_versions`)

**Files:**
- Create: `supabase/migrations/20260729_12_family_documents.sql`
- Modify: `src/app/apps/mi-hogar/documents/page.tsx`

- [ ] **Step 1: Migración**

```sql
-- 20260729_12_family_documents.sql
ALTER TABLE documents ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE documents d SET family_id = f.id FROM families f WHERE f.owner_id = d.user_id;
ALTER TABLE documents ALTER COLUMN family_id SET NOT NULL;

ALTER TABLE document_reminders ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_document_reminders()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM documents WHERE id = NEW.document_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_sync_family_id_document_reminders
BEFORE INSERT OR UPDATE OF document_id ON document_reminders
FOR EACH ROW EXECUTE FUNCTION sync_family_id_document_reminders();
UPDATE document_reminders r SET family_id = d.family_id FROM documents d WHERE d.id = r.document_id;

ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_document_versions()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT family_id INTO NEW.family_id FROM documents WHERE id = NEW.document_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_sync_family_id_document_versions
BEFORE INSERT OR UPDATE OF document_id ON document_versions
FOR EACH ROW EXECUTE FUNCTION sync_family_id_document_versions();
UPDATE document_versions v SET family_id = d.family_id FROM documents d WHERE d.id = v.document_id;

DO $$
DECLARE pol RECORD; t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['documents','document_reminders','document_versions'] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY documents_select ON documents FOR SELECT USING (has_family_access(family_id, 'mi-hogar.documents', 'view'));
CREATE POLICY documents_write ON documents FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.documents', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.documents', 'full'));

CREATE POLICY document_reminders_select ON document_reminders FOR SELECT USING (has_family_access(family_id, 'mi-hogar.documents', 'view'));
CREATE POLICY document_reminders_write ON document_reminders FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.documents', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.documents', 'full'));

CREATE POLICY document_versions_select ON document_versions FOR SELECT USING (has_family_access(family_id, 'mi-hogar.documents', 'view'));
CREATE POLICY document_versions_write ON document_versions FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.documents', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.documents', 'full'));
```

- [ ] **Step 2: Aplicar y verificar** — patrón de dos usuarios + confirmar que insertar en `document_reminders`/`document_versions` copia `family_id` vía trigger.

- [ ] **Step 3: Wiring en frontend** — `useAppPermission('mi-hogar.documents')` en `src/app/apps/mi-hogar/documents/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_12_family_documents.sql src/app/apps/mi-hogar/documents/page.tsx
git commit -m "feat(family): familiarizar Documentos (documents, reminders, versions)"
```

---

### Task 15: Contraseñas (`passwords`)

**Files:**
- Create: `supabase/migrations/20260729_13_family_passwords.sql`
- Modify: `src/app/apps/mi-hogar/passwords/page.tsx`

- [ ] **Step 1: Migración**

```sql
-- 20260729_13_family_passwords.sql
ALTER TABLE passwords ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE passwords p SET family_id = f.id FROM families f WHERE f.owner_id = p.user_id;
ALTER TABLE passwords ALTER COLUMN family_id SET NOT NULL;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='passwords' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON passwords', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY passwords_select ON passwords FOR SELECT USING (has_family_access(family_id, 'mi-hogar.passwords', 'view'));
CREATE POLICY passwords_write ON passwords FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.passwords', 'full'))
  WITH CHECK (has_family_access(family_id, 'mi-hogar.passwords', 'full'));
```

- [ ] **Step 2: Aplicar y verificar** — patrón de dos usuarios.

- [ ] **Step 3: Wiring en frontend** — `useAppPermission('mi-hogar.passwords')` en `src/app/apps/mi-hogar/passwords/page.tsx`. Añadir un aviso visible ("Estás viendo/editando el gestor de contraseñas compartido de la familia") dado que es dato sensible, según lo previsto en el spec §6.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_13_family_passwords.sql src/app/apps/mi-hogar/passwords/page.tsx
git commit -m "feat(family): familiarizar Contrasenas (passwords), con aviso de dato sensible"
```

---

### Task 16: Manuales (`manuals`, `manual_tags`, `manual_reminders`, `manual_versions`)

**Files:**
- Create: `supabase/migrations/20260729_14_family_manuals.sql`
- Modify: `src/app/apps/mi-hogar/manuals/page.tsx`

- [ ] **Step 1: Migración**

```sql
-- 20260729_14_family_manuals.sql
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE manuals m SET family_id = f.id FROM families f WHERE f.owner_id = m.user_id;
ALTER TABLE manuals ALTER COLUMN family_id SET NOT NULL;

ALTER TABLE manual_tags ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_manual_tags()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN SELECT family_id INTO NEW.family_id FROM manuals WHERE id = NEW.manual_id; RETURN NEW; END; $$;
CREATE TRIGGER trg_sync_family_id_manual_tags
BEFORE INSERT OR UPDATE OF manual_id ON manual_tags
FOR EACH ROW EXECUTE FUNCTION sync_family_id_manual_tags();
UPDATE manual_tags t SET family_id = m.family_id FROM manuals m WHERE m.id = t.manual_id;

ALTER TABLE manual_reminders ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_manual_reminders()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN SELECT family_id INTO NEW.family_id FROM manuals WHERE id = NEW.manual_id; RETURN NEW; END; $$;
CREATE TRIGGER trg_sync_family_id_manual_reminders
BEFORE INSERT OR UPDATE OF manual_id ON manual_reminders
FOR EACH ROW EXECUTE FUNCTION sync_family_id_manual_reminders();
UPDATE manual_reminders r SET family_id = m.family_id FROM manuals m WHERE m.id = r.manual_id;

ALTER TABLE manual_versions ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_manual_versions()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN SELECT family_id INTO NEW.family_id FROM manuals WHERE id = NEW.manual_id; RETURN NEW; END; $$;
CREATE TRIGGER trg_sync_family_id_manual_versions
BEFORE INSERT OR UPDATE OF manual_id ON manual_versions
FOR EACH ROW EXECUTE FUNCTION sync_family_id_manual_versions();
UPDATE manual_versions v SET family_id = m.family_id FROM manuals m WHERE m.id = v.manual_id;

DO $$
DECLARE pol RECORD; t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['manuals','manual_tags','manual_reminders','manual_versions'] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY manuals_select ON manuals FOR SELECT USING (has_family_access(family_id, 'mi-hogar.manuals', 'view'));
CREATE POLICY manuals_write ON manuals FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.manuals', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.manuals', 'full'));

CREATE POLICY manual_tags_select ON manual_tags FOR SELECT USING (has_family_access(family_id, 'mi-hogar.manuals', 'view'));
CREATE POLICY manual_tags_write ON manual_tags FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.manuals', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.manuals', 'full'));

CREATE POLICY manual_reminders_select ON manual_reminders FOR SELECT USING (has_family_access(family_id, 'mi-hogar.manuals', 'view'));
CREATE POLICY manual_reminders_write ON manual_reminders FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.manuals', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.manuals', 'full'));

CREATE POLICY manual_versions_select ON manual_versions FOR SELECT USING (has_family_access(family_id, 'mi-hogar.manuals', 'view'));
CREATE POLICY manual_versions_write ON manual_versions FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.manuals', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.manuals', 'full'));
```

- [ ] **Step 2: Aplicar y verificar** — patrón de dos usuarios + confirmar propagación por trigger a las 3 tablas hijas.

- [ ] **Step 3: Wiring en frontend** — `useAppPermission('mi-hogar.manuals')` en `src/app/apps/mi-hogar/manuals/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_14_family_manuals.sql src/app/apps/mi-hogar/manuals/page.tsx
git commit -m "feat(family): familiarizar Manuales (4 tablas)"
```

---

### Task 17: Recetas (`recipes`)

**Files:**
- Create: `supabase/migrations/20260729_15_family_recipes.sql`
- Modify: `src/app/apps/mi-hogar/recipes/page.tsx`

**Nota:** `recipes.user_id` es nullable — las filas con `user_id IS NULL` son recetas globales/curadas por Quioba, no de un usuario. Estas no reciben `family_id` y permanecen visibles a todos vía una policy de solo-lectura pública separada; solo las recetas propias de un usuario entran en el modelo familiar.

- [ ] **Step 1: Migración**

```sql
-- 20260729_15_family_recipes.sql
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE recipes r SET family_id = f.id FROM families f WHERE f.owner_id = r.user_id AND r.user_id IS NOT NULL;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='recipes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON recipes', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY recipes_public_select ON recipes FOR SELECT
  USING (user_id IS NULL OR has_family_access(family_id, 'mi-hogar.recipes', 'view'));
CREATE POLICY recipes_write ON recipes FOR ALL
  USING (user_id IS NOT NULL AND has_family_access(family_id, 'mi-hogar.recipes', 'full'))
  WITH CHECK (user_id IS NOT NULL AND has_family_access(family_id, 'mi-hogar.recipes', 'full'));
```

- [ ] **Step 2: Aplicar y verificar** — confirmar que una receta con `user_id IS NULL` sigue siendo visible para cualquier usuario autenticado, y que una receta propia de A con `level='view'` para B es legible pero no editable.

- [ ] **Step 3: Wiring en frontend** — `useAppPermission('mi-hogar.recipes')` en `src/app/apps/mi-hogar/recipes/page.tsx`; las recetas globales (`user_id IS NULL`) siguen mostrándose igual que hoy independientemente del permiso.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_15_family_recipes.sql src/app/apps/mi-hogar/recipes/page.tsx
git commit -m "feat(family): familiarizar Recetas propias (recipes), preservando recetas globales"
```

---

### Task 18: Asistente (`assistant_conversations`)

**Files:**
- Create: `supabase/migrations/20260729_16_family_asistente.sql`
- Modify: `src/app/apps/mi-hogar/asistente/page.tsx`

**Nota (corregida tras inspeccionar el esquema real):** `assistant_responses` no es un dato de usuario — sus columnas (`category`, `keywords`, `response_template`, `priority`, `is_active`) son contenido global de plantillas de respuesta del asistente, sin propietario ni conversación asociada, igual que `document_types`. **No se familiariza**; se deja fuera de este sistema, igual que otras tablas de contenido global. Solo `assistant_conversations` (que sí tiene `user_id`) entra en el modelo familiar.

- [ ] **Step 1: Migración**

```sql
-- 20260729_16_family_asistente.sql
ALTER TABLE assistant_conversations ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE assistant_conversations c SET family_id = f.id FROM families f WHERE f.owner_id = c.user_id;
ALTER TABLE assistant_conversations ALTER COLUMN family_id SET NOT NULL;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='assistant_conversations' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON assistant_conversations', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY assistant_conversations_select ON assistant_conversations FOR SELECT USING (has_family_access(family_id, 'mi-hogar.asistente', 'view'));
CREATE POLICY assistant_conversations_write ON assistant_conversations FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.asistente', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.asistente', 'full'));
```

- [ ] **Step 2: Aplicar y verificar** — patrón de dos usuarios.

- [ ] **Step 3: Wiring en frontend** — `useAppPermission('mi-hogar.asistente')` en `src/app/apps/mi-hogar/asistente/page.tsx`. La consulta a `assistant_responses` (plantillas globales) no cambia: sigue siendo lectura pública para cualquier usuario autenticado, como hoy.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_16_family_asistente.sql src/app/apps/mi-hogar/asistente/page.tsx
git commit -m "feat(family): familiarizar Asistente (assistant_conversations; responses queda global)"
```

---

### Task 19: Confesiones — excluida del modelo familiar (corrección de alcance)

**Hallazgo (esquema real de `shared_thoughts`):** columnas `creator_id`, `share_token`, `is_anonymous`, `creator_name`, `deleted_by_creator`, `deleted_by_recipient`, `interaction_mode`, `unlock_at`. Esto no es un "espacio de hogar compartido" — es un mecanismo de mensaje anónimo 1:1 enviado vía enlace/token a cualquier persona (posiblemente sin cuenta ni relación familiar), con opción explícita de anonimato. No tiene sentido de producto ni de datos aplicarle "permiso de familia": no hay una "confesión de la familia" a compartir, cada `shared_thought` ya es su propio hilo privado entre remitente y destinatario por diseño.

**Decisión:** Confesiones se retira del alcance de este plan y de `FAMILY_APP_REGISTRY` (Task 4). No se toca `shared_thoughts`/`thought_messages`/`thought_pauses`. Si en el futuro se quiere gatear el ACCESO a la app en sí (no su contenido) por plan familiar, sería un `useAppPermission('mi-hogar.confessions')` de "app visible sí/no" sin matriz de niveles, tratado como una decisión de producto aparte — no incluido aquí.

- [ ] **Step 1: Actualizar `FAMILY_APP_REGISTRY`**

En `src/lib/family/app-registry.ts` (Task 4), eliminar la fila `{ category: 'Mi Hogar', slug: 'mi-hogar.confessions', label: 'Confesiones' }` antes de dar el plan por completo, o si Task 4 ya se ejecutó, hacerlo como parte de este task.

- [ ] **Step 2: Commit**

```bash
git add src/lib/family/app-registry.ts
git commit -m "chore(family): excluir Confesiones del modelo de permisos familiares"
```

---

### Task 20: Gastos (`expenses`, `expense_categories`) — deprecar `expense_partners`/`expense_folders`

**Files:**
- Create: `supabase/migrations/20260729_18_family_expenses.sql`
- Modify: `src/app/apps/mi-hogar/expenses/page.tsx`
- Modify: `src/components/apps/mi-hogar/expenses/share-expenses-dialog.tsx`

**Interfaces:**
- Produces: `expenses.family_id`, `expense_categories.family_id`. Los pares existentes en `expense_partners` (`user_id_1`, `user_id_2`) y las membresías de `expense_folder_members` se migran a filas reales de `family_members` con permiso `full` en `mi-hogar.expenses`, para no perder el compartido que ya tenían configurado.

- [ ] **Step 1: Migración de datos y esquema**

```sql
-- 20260729_18_family_expenses.sql
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE expenses e SET family_id = f.id FROM families f WHERE f.owner_id = e.user_id;
ALTER TABLE expenses ALTER COLUMN family_id SET NOT NULL;

ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE expense_categories c SET family_id = f.id FROM families f WHERE f.owner_id = c.created_by;

-- Migrar pares de expense_partners: cada par (A, B) se convierte en B miembro activo
-- de la familia de A con permiso 'full' en Gastos (y viceversa si aún no existe la fila para A en la familia de B).
INSERT INTO family_members (family_id, user_id, invited_email, invite_code, status)
SELECT f.id, p.user_id_2, pr.email, encode(gen_random_bytes(6), 'hex'), 'active'
FROM expense_partners p
JOIN families f ON f.owner_id = p.user_id_1
JOIN profiles pr ON pr.id = p.user_id_2
ON CONFLICT (family_id, user_id) DO NOTHING;

INSERT INTO family_app_permissions (family_id, member_id, app_slug, level)
SELECT fm.family_id, fm.id, 'mi-hogar.expenses', 'full'
FROM family_members fm
JOIN expense_partners p ON p.user_id_2 = fm.user_id
JOIN families f ON f.id = fm.family_id AND f.owner_id = p.user_id_1
ON CONFLICT (member_id, app_slug) DO UPDATE SET level = 'full';

-- Migrar expense_folder_members del mismo modo (folder -> familia del dueño del folder)
INSERT INTO family_members (family_id, user_id, invited_email, invite_code, status)
SELECT f.id, fm_old.user_id, pr.email, encode(gen_random_bytes(6), 'hex'), 'active'
FROM expense_folder_members fm_old
JOIN expense_folders ef ON ef.id = fm_old.folder_id
JOIN families f ON f.owner_id = ef.created_by
JOIN profiles pr ON pr.id = fm_old.user_id
WHERE fm_old.user_id != ef.created_by
ON CONFLICT (family_id, user_id) DO NOTHING;

INSERT INTO family_app_permissions (family_id, member_id, app_slug, level)
SELECT fm.family_id, fm.id, 'mi-hogar.expenses', 'full'
FROM family_members fm
JOIN expense_folder_members fm_old ON fm_old.user_id = fm.user_id
JOIN expense_folders ef ON ef.id = fm_old.folder_id
JOIN families f ON f.id = fm.family_id AND f.owner_id = ef.created_by
WHERE fm_old.user_id != ef.created_by
ON CONFLICT (member_id, app_slug) DO UPDATE SET level = 'full';

DO $$
DECLARE pol RECORD; t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['expenses','expense_categories'] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY expenses_select ON expenses FOR SELECT USING (has_family_access(family_id, 'mi-hogar.expenses', 'view'));
CREATE POLICY expenses_write ON expenses FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.expenses', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.expenses', 'full'));

CREATE POLICY expense_categories_select ON expense_categories FOR SELECT USING (has_family_access(family_id, 'mi-hogar.expenses', 'view'));
CREATE POLICY expense_categories_write ON expense_categories FOR ALL
  USING (has_family_access(family_id, 'mi-hogar.expenses', 'full')) WITH CHECK (has_family_access(family_id, 'mi-hogar.expenses', 'full'));
```

- [ ] **Step 2: Aplicar y verificar**

Confirmar con `SELECT count(*) FROM expense_partners` vs `SELECT count(*) FROM family_members fm JOIN family_app_permissions p ON p.member_id = fm.id WHERE p.app_slug = 'mi-hogar.expenses'` que el número de migraciones cuadra razonablemente (puede haber menos por `ON CONFLICT DO NOTHING` si ya existían). Verificar acceso con el patrón de dos usuarios sobre `expenses`.

- [ ] **Step 3: Wiring en frontend** — `useAppPermission('mi-hogar.expenses')` en `src/app/apps/mi-hogar/expenses/page.tsx`; en `share-expenses-dialog.tsx`, sustituir la generación de código de `expense_partners`/`folder_connection_codes` por un enlace a `/apps/mi-hogar/familia` (el flujo de invitación genérico), dejando el diálogo solo como acceso directo/atajo.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_18_family_expenses.sql src/app/apps/mi-hogar/expenses/page.tsx src/components/apps/mi-hogar/expenses/share-expenses-dialog.tsx
git commit -m "feat(family): familiarizar Gastos y migrar expense_partners/folders al modelo generico"
```

---

### Task 21: Mi Viaje (`trips`, `trip_events`, `trip_checklist_items`, `trip_assets`)

**Files:**
- Create: `supabase/migrations/20260729_19_family_mi_viaje.sql`
- Modify: `src/app/apps/mi-viaje/page.tsx`

- [ ] **Step 1: Migración**

```sql
-- 20260729_19_family_mi_viaje.sql
ALTER TABLE trips ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE trips t SET family_id = f.id FROM families f WHERE f.owner_id = t.user_id;
ALTER TABLE trips ALTER COLUMN family_id SET NOT NULL;

ALTER TABLE trip_events ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_trip_events()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN SELECT family_id INTO NEW.family_id FROM trips WHERE id = NEW.trip_id; RETURN NEW; END; $$;
CREATE TRIGGER trg_sync_family_id_trip_events
BEFORE INSERT OR UPDATE OF trip_id ON trip_events
FOR EACH ROW EXECUTE FUNCTION sync_family_id_trip_events();
UPDATE trip_events e SET family_id = t.family_id FROM trips t WHERE t.id = e.trip_id;

ALTER TABLE trip_checklist_items ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_trip_checklist_items()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN SELECT family_id INTO NEW.family_id FROM trips WHERE id = NEW.trip_id; RETURN NEW; END; $$;
CREATE TRIGGER trg_sync_family_id_trip_checklist_items
BEFORE INSERT OR UPDATE OF trip_id ON trip_checklist_items
FOR EACH ROW EXECUTE FUNCTION sync_family_id_trip_checklist_items();
UPDATE trip_checklist_items c SET family_id = t.family_id FROM trips t WHERE t.id = c.trip_id;

ALTER TABLE trip_assets ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
CREATE OR REPLACE FUNCTION sync_family_id_trip_assets()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN SELECT family_id INTO NEW.family_id FROM trips WHERE id = NEW.trip_id; RETURN NEW; END; $$;
CREATE TRIGGER trg_sync_family_id_trip_assets
BEFORE INSERT OR UPDATE OF trip_id ON trip_assets
FOR EACH ROW EXECUTE FUNCTION sync_family_id_trip_assets();
UPDATE trip_assets a SET family_id = t.family_id FROM trips t WHERE t.id = a.trip_id;

DO $$
DECLARE pol RECORD; t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['trips','trip_events','trip_checklist_items','trip_assets'] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY trips_select ON trips FOR SELECT USING (has_family_access(family_id, 'mi-viaje', 'view'));
CREATE POLICY trips_write ON trips FOR ALL
  USING (has_family_access(family_id, 'mi-viaje', 'full')) WITH CHECK (has_family_access(family_id, 'mi-viaje', 'full'));

CREATE POLICY trip_events_select ON trip_events FOR SELECT USING (has_family_access(family_id, 'mi-viaje', 'view'));
CREATE POLICY trip_events_write ON trip_events FOR ALL
  USING (has_family_access(family_id, 'mi-viaje', 'full')) WITH CHECK (has_family_access(family_id, 'mi-viaje', 'full'));

CREATE POLICY trip_checklist_items_select ON trip_checklist_items FOR SELECT USING (has_family_access(family_id, 'mi-viaje', 'view'));
CREATE POLICY trip_checklist_items_write ON trip_checklist_items FOR ALL
  USING (has_family_access(family_id, 'mi-viaje', 'full')) WITH CHECK (has_family_access(family_id, 'mi-viaje', 'full'));

CREATE POLICY trip_assets_select ON trip_assets FOR SELECT USING (has_family_access(family_id, 'mi-viaje', 'view'));
CREATE POLICY trip_assets_write ON trip_assets FOR ALL
  USING (has_family_access(family_id, 'mi-viaje', 'full')) WITH CHECK (has_family_access(family_id, 'mi-viaje', 'full'));
```

- [ ] **Step 2: Aplicar y verificar** — patrón de dos usuarios + confirmar propagación por trigger a las 3 tablas hijas de `trips`.

- [ ] **Step 3: Wiring en frontend** — `useAppPermission('mi-viaje')` en `src/app/apps/mi-viaje/page.tsx`. Este app ya tiene `TripNotificationManager` montado en `ClientProvider` (ver Task 22 si aplica): no requiere cambios ahí, las notificaciones siguen funcionando por usuario individual.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_19_family_mi_viaje.sql src/app/apps/mi-viaje/page.tsx
git commit -m "feat(family): familiarizar Mi Viaje (trips y 3 tablas hijas)"
```

---

### Task 22: Huerto (`huerto_plants`, `huerto_plant_history`)

**Files:**
- Create: `supabase/migrations/20260729_20_family_huerto.sql`
- Modify: `src/app/apps/huerto/page.tsx`

- [ ] **Step 1: Migración**

```sql
-- 20260729_20_family_huerto.sql
ALTER TABLE huerto_plants ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE huerto_plants p SET family_id = f.id FROM families f WHERE f.owner_id = p.user_id;
ALTER TABLE huerto_plants ALTER COLUMN family_id SET NOT NULL;

ALTER TABLE huerto_plant_history ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
UPDATE huerto_plant_history h SET family_id = f.id FROM families f WHERE f.owner_id = h.user_id;
ALTER TABLE huerto_plant_history ALTER COLUMN family_id SET NOT NULL;

DO $$
DECLARE pol RECORD; t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['huerto_plants','huerto_plant_history'] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY huerto_plants_select ON huerto_plants FOR SELECT USING (has_family_access(family_id, 'huerto', 'view'));
CREATE POLICY huerto_plants_write ON huerto_plants FOR ALL
  USING (has_family_access(family_id, 'huerto', 'full')) WITH CHECK (has_family_access(family_id, 'huerto', 'full'));

CREATE POLICY huerto_plant_history_select ON huerto_plant_history FOR SELECT USING (has_family_access(family_id, 'huerto', 'view'));
CREATE POLICY huerto_plant_history_write ON huerto_plant_history FOR ALL
  USING (has_family_access(family_id, 'huerto', 'full')) WITH CHECK (has_family_access(family_id, 'huerto', 'full'));
```

- [ ] **Step 2: Aplicar y verificar** — patrón de dos usuarios.

- [ ] **Step 3: Wiring en frontend** — `useAppPermission('huerto')` en `src/app/apps/huerto/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_20_family_huerto.sql src/app/apps/huerto/page.tsx
git commit -m "feat(family): familiarizar Huerto (huerto_plants, huerto_plant_history)"
```

---

### Task 23: Workspace, Meditación, Tiempo — gating solo en UI (sin tabla propia)

**Files:**
- Modify: `src/app/apps/mi-hogar/workspace/page.tsx`
- Modify: `src/app/apps/mi-hogar/meditation/page.tsx`
- Modify: `src/app/apps/mi-hogar/tiempo/page.tsx`

**Interfaces:**
- Consumes: `useAppPermission` de Task 5.
- Nota: estas 3 apps no tienen tabla propia en Supabase (usan `localStorage` en el navegador), así que no hay RLS que migrar. El control de acceso es solo a nivel de UI: si `level === 'none'`, no se renderiza el contenido de la app.

- [ ] **Step 1: Wiring en `workspace/page.tsx`**

```tsx
// dentro de src/app/apps/mi-hogar/workspace/page.tsx
import { useAppPermission } from '@/hooks/useAppPermission';
// ...
const { level, loading } = useAppPermission('mi-hogar.workspace');
if (loading) return null;
if (level === 'none') return <p className="p-6">No tienes acceso a esta app.</p>;
// pasar level === 'view' como prop de solo-lectura al componente si aplica
```

- [ ] **Step 2: Mismo patrón en `meditation/page.tsx`** con `useAppPermission('mi-hogar.meditation')`.

- [ ] **Step 3: Mismo patrón en `tiempo/page.tsx`** con `useAppPermission('mi-hogar.tiempo')`.

- [ ] **Step 4: Verificar manualmente**

Con un usuario miembro sin permiso (`level='none'`) en las 3 apps, navegar a cada ruta y confirmar que se muestra el mensaje de "sin acceso" en vez del contenido.

- [ ] **Step 5: Commit**

```bash
git add src/app/apps/mi-hogar/workspace/page.tsx src/app/apps/mi-hogar/meditation/page.tsx src/app/apps/mi-hogar/tiempo/page.tsx
git commit -m "feat(family): gating de UI para Workspace, Meditacion y Tiempo (sin tabla propia)"
```

---

### Task 24: Auditoría final y limpieza de datos de prueba

**Files:** (ninguno — verificación e infraestructura, todo ya está en producción porque este plan aplicó cada migración directamente ahí)

**Interfaces:**
- Consumes: `<QA_OWNER_ID>`, `<QA_MEMBER_ID>`, `qa_family_id`, `<qa_member_row_id>` de Task 1/2.

- [ ] **Step 1: Revisión final del esquema**

Con `project_id = bszdqnocnyhezgqehawh`: `mcp: list_tables` (verbose) y confirmar que las ~48 tablas listadas en este plan tienen columna `family_id NOT NULL` (salvo `recipes`, que la deja nullable a propósito) y que `SELECT policyname, tablename FROM pg_policies WHERE tablename = ANY(ARRAY[...])` (con la lista completa de tablas migradas) muestra las nuevas políticas basadas en `has_family_access` en todas.

- [ ] **Step 2: Confirmar con el usuario que no queden restos de prueba**

Verificar con `SELECT * FROM family_members WHERE user_id = '<QA_MEMBER_ID>'` y un repaso rápido de las tablas migradas por `family_id = '<qa_family_id>'` que no quedan filas de prueba sin limpiar de tareas anteriores (cada tarea de Phase 1 ya debía limpiar las suyas, esto es una verificación de cierre).

- [ ] **Step 3: Eliminar los usuarios de prueba**

```sql
DELETE FROM auth.users WHERE email IN ('qa-family-owner@quioba.internal', 'qa-family-member@quioba.internal');
-- ON DELETE CASCADE limpia profiles, families, family_members y family_app_permissions asociados.
```

- [ ] **Step 4: Verificación de cierre**

```bash
git log --oneline -25
```

(Solo verificación — no hay archivos nuevos que commitear en este paso; todas las migraciones de este plan ya se aplicaron directamente a producción tarea por tarea, no hay un merge pendiente.)
