# La Oficina 2D — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Vista cenital 2D de agentes de IA en `/apps/oficina` que ejecuta encargos reales vía Claude Code CLI y devuelve el entregable.

**Architecture:** Datos editables (`SALAS`) → vista cliente SVG/CSS → ruta API Next.js que hace spawn de `claude -p` en carpeta aislada por sala.

**Tech Stack:** Next.js App Router, React client component, Node `child_process`, Tailwind (hex arbitrarios para paleta), Vitest para lógica pura.

## Global Constraints

- Paleta: azul marino `#10233f`, cian `#22a7c4`, fondo claro. PROHIBIDO morado.
- Tipografía `system-ui`, esquinas redondeadas, sombras suaves.
- Gate admin: solo `todojuntomirar@gmail.com` (patrón existente en la página).
- API dinámica: `runtime='nodejs'`, `dynamic='force-dynamic'`. No funciona en build estático móvil.
- Sandbox: ejecutar en `oficina-output/<salaId>/`, `--dangerously-skip-permissions`.
- Windows: spawn con `shell:true` para resolver `claude.cmd`.

---

### Task 1: Datos editables `salas-data.ts`

**Files:**
- Create: `src/app/apps/oficina/vista/salas-data.ts`
- Test: `src/app/apps/oficina/vista/salas-data.test.ts`

Contenido = tipos + `SALAS` + `slugSala` + helpers `getSala(id)`, `agenteEnSala(salaId, nombre)`, `construirPrompt(sala, agente, encargo)` (función pura reutilizada por la API).

Tests: no ids duplicados; `agenteEnSala` verdadero/falso correctos; `construirPrompt` contiene nombre, rol y encargo.

### Task 2: Servidor puente `route.ts`

**Files:**
- Create: `src/app/api/oficina/encargo/route.ts`

`POST` valida body (`salaId`, `agente`, `encargo`), resuelve sala/agente con helpers de Task 1, asegura carpeta `oficina-output/<salaId>/`, lista archivos previos, spawn `claude -p <prompt> --dangerously-skip-permissions` con `cwd` y `shell:true`, timeout 5 min, captura stdout/stderr, diff de archivos nuevos, responde `{ok, resultado, archivos}` o `{ok:false, error}`.

### Task 3: Vista 2D `page.tsx`

**Files:**
- Modify (replace): `src/app/apps/oficina/page.tsx`

Client component: gate admin, importa `SALAS`, dibuja plano (grid de salas rectangulares con color de suelo, etiqueta, agentes como círculo+nombre+punto de estado con latido CSS), cabecera "La Oficina" + subtítulo + leyenda. Clic en agente → panel lateral con textarea + botón Enviar → POST a la API → estado optimista "trabajando" → muestra resultado/archivos o error → vuelve a "libre".

### Task 4: Verificación

`npm run typecheck`, `npm run dev`, cargar `/apps/oficina`, screenshot del plano.
