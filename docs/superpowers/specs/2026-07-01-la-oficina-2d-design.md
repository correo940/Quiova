# La Oficina — Vista 2D + Motor de Ejecución Real — Diseño

**Fecha:** 2026-07-01
**Estado:** Aprobado para plan

## Objetivo

Una vista cenital 2D de una oficina de agentes de IA, conectada a un motor que
ejecuta de verdad los encargos. Asignas un encargo a un agente en lenguaje
natural desde la vista y recibes el entregable real que Claude Code produce, todo
con la cuenta del propio usuario (sin API externa de pago).

Reemplaza la portada actual `src/app/apps/oficina/page.tsx` (rejilla de tarjetas
de despachos) por el plano 2D. Las páginas de despacho ricas existentes
(director, jefe-gabinete, consejo-estrategico, etc.) **no** se tocan ni se
enlazan desde el plano; son un sistema aparte que sigue funcionando en sus rutas.

## Contexto y decisiones tomadas

- **Ubicación:** dentro de Quioba, reemplazando `/apps/oficina`.
- **Motor:** Claude Code CLI (`claude -p`) invocado como subproceso de Node
  desde una ruta API de Next.js. No AionUi por ahora (queda como capa futura
  opcional; el vídeo de referencia lo cita como una de las 3 piezas, pero
  introduce una app Electron externa con demasiadas piezas móviles para v1).
- **Interacción por agente:** encargo simple (textarea + botón), tal como el
  brief. No chat, no expedientes.
- **Sandbox:** cada sala ejecuta en su propia carpeta aislada
  `oficina-output/<sala-slug>/`. Claude Code corre ahí con
  `--dangerously-skip-permissions`, nunca fuera de esa carpeta.
- **Sin persistencia:** el resultado vive en el estado de React mientras la
  pestaña está abierta. Sin base de datos en v1.
- **Tipos de agente** (del vídeo de referencia): `coordinacion`, `manager`,
  `especialista`. Es un campo de datos que modela el nivel y ajusta el prompt de
  rol; no cambia el flujo de ejecución.
- **Fuera de alcance v1:** rutinas programadas / cron, memoria persistente,
  coordinador Hermes que delega automáticamente, integración AionUi.

## Requisito de entorno (crítico)

Solo funciona corriendo `npm run dev` en la máquina del usuario, donde el CLI
`claude` está instalado y autenticado con su cuenta. **No** funciona en el build
estático de Capacitor/móvil (`STATIC_EXPORT=true`) porque ejecutar subprocesos
requiere el runtime de Node del servidor Next.js, no un WebView. La ruta API
debe declararse dinámica (`export const runtime = 'nodejs'` y
`export const dynamic = 'force-dynamic'`).

## Arquitectura

Tres piezas:

1. **Datos editables (`SALAS`)** — un array al principio de la página con las
   salas, sus colores y sus agentes. Cambiar nombres/estados/roles sin tocar el
   resto.
2. **La vista (frontend)** — componente cliente que dibuja el plano 2D en
   SVG/HTML+CSS, gestiona selección de agente, estado local de "trabajando", y
   muestra el resultado.
3. **El servidor puente (API)** — `POST /api/oficina/encargo` recibe
   `{ salaId, agente, encargo }`, ejecuta `claude -p` en la carpeta de la sala,
   y devuelve `{ ok, resultado, archivos }`.

### Flujo de un encargo

```
Usuario clica agente → panel con textarea
  → escribe encargo → "Enviar"
    → frontend: estado del agente = "trabajando" (optimista)
    → POST /api/oficina/encargo { salaId, agente, encargo }
      → API: asegura oficina-output/<salaId>/
      → API: spawn claude -p "<prompt de rol + encargo>"
              cwd = oficina-output/<salaId>/
              flags: --dangerously-skip-permissions --output-format text
      → API: captura stdout (resultado) + lista archivos nuevos en la carpeta
      → responde { ok:true, resultado, archivos }
    → frontend: estado del agente = "libre", muestra resultado + archivos
```

Errores: si el proceso sale con código ≠ 0, o `claude` no existe, o timeout, la
API responde `{ ok:false, error }` con mensaje legible; el frontend devuelve el
agente a "libre" y muestra el error en el panel.

### Construcción del prompt de rol

A partir del agente seleccionado (`nombre`, `rol`, `tipo`) y su sala, la API
compone un prompt de sistema simple, por ejemplo:

```
Eres {agente.nombre}, {agente.rol} en el departamento de {sala.nombre}.
Trabajas para Quioba. Produce el entregable pedido, no una conversación.
Si generas archivos, créalos en el directorio actual.

Encargo: {encargo}
```

## Estructura de archivos

- **Crear** `src/app/api/oficina/encargo/route.ts` — servidor puente. Valida el
  body, resuelve la sala, ejecuta Claude Code, devuelve resultado + archivos.
- **Crear** `src/app/apps/oficina/vista/salas-data.ts` — el array `SALAS`
  exportado y los tipos (`Sala`, `Agente`, `EstadoAgente`, `TipoAgente`), más el
  helper `slugSala`. Datos editables aislados.
- **Reemplazar** `src/app/apps/oficina/page.tsx` — la vista 2D. Componente
  cliente que importa `SALAS`, dibuja el plano, gestiona selección/encargo/
  resultado llamando a la API.

Nota: el contenido actual de `page.tsx` (rejilla de despachos) se elimina de esa
ruta. Las páginas de despacho en subrutas (`/director`, `/jefe-gabinete`, …) no
se tocan, pero dejarán de estar enlazadas desde la portada. Aceptado.

## Datos editables — forma de `SALAS`

```ts
export type EstadoAgente = 'trabajando' | 'libre';
export type TipoAgente = 'coordinacion' | 'manager' | 'especialista';

export interface Agente {
  nombre: string;
  estado: EstadoAgente;
  tipo: TipoAgente;
  rol: string; // descripción corta inyectada en el prompt
}

export interface Sala {
  id: string;      // slug estable, usado como carpeta: oficina-output/<id>/
  nombre: string;
  color: string;   // color de suelo suave, hex
  agentes: Agente[];
}

export const SALAS: Sala[] = [
  { id: 'recepcion', nombre: 'Recepción', color: '#e8f6fa', agentes: [
    { nombre: 'Coordinación', estado: 'libre', tipo: 'coordinacion',
      rol: 'recibes encargos y los ejecutas o resumes con claridad' },
  ]},
  { id: 'desarrollo', nombre: 'Desarrollo', color: '#eef2f9', agentes: [
    { nombre: 'Bruno', estado: 'libre', tipo: 'manager',
      rol: 'desarrollador: escribes código y scripts limpios y directos' },
    { nombre: 'Max', estado: 'libre', tipo: 'especialista',
      rol: 'desarrollador de apoyo: implementas y pruebas piezas concretas' },
  ]},
  { id: 'contenido', nombre: 'Contenido', color: '#f0f7ee', agentes: [
    { nombre: 'Dana', estado: 'libre', tipo: 'manager',
      rol: 'redactora: escribes guiones, emails y copy con buen tono' },
  ]},
  { id: 'datos', nombre: 'Datos', color: '#fdf4ec', agentes: [
    { nombre: 'Rita', estado: 'libre', tipo: 'especialista',
      rol: 'analista de datos: si falta un dato lo dices, no lo inventas' },
  ]},
  { id: 'automatizacion', nombre: 'Automatización', color: '#e9f4f1', agentes: [
    { nombre: 'Sara', estado: 'libre', tipo: 'especialista',
      rol: 'automatizaciones: montas procesos y scripts que se ejecutan solos' },
  ]},
];
```

## Estilo y paleta

- Fondo claro. Textos y bordes en **azul marino `#10233f`**. Acentos en
  **cian `#22a7c4`**.
- **PROHIBIDO el morado** en cualquier elemento visible.
- Tipografía `system-ui`. Esquinas redondeadas, sombras muy suaves, mucho aire.
- Cabecera: título "La Oficina" + subtítulo corto + leyenda de estados
  (verde = trabajando, gris = libre).
- Cada sala: rectángulo con borde redondeado, color de suelo suave, etiqueta con
  el nombre arriba.
- Cada agente: círculo (cabeza) con nombre debajo y punto de estado. El punto
  verde "respira" con un latido muy sutil (animación CSS `@keyframes`, opcional
  y ligera).

## API — contrato

**Request** `POST /api/oficina/encargo`
```json
{ "salaId": "desarrollo", "agente": "Bruno", "encargo": "texto libre" }
```

**Response OK** `200`
```json
{ "ok": true, "resultado": "stdout de claude", "archivos": ["landing.html"] }
```

**Response error** `200` (con `ok:false`) o `4xx/5xx`
```json
{ "ok": false, "error": "mensaje legible" }
```

Validación: `salaId` debe existir en `SALAS`; `agente` debe pertenecer a esa
sala; `encargo` no vacío. Timeout del subproceso: 5 minutos (configurable por
constante). `archivos` = ficheros presentes en la carpeta de la sala tras la
ejecución que no estaban antes (diff de listado antes/después).

## Manejo de errores

- `claude` no encontrado en PATH → error legible: "El CLI de Claude Code no está
  instalado o no está en el PATH."
- Proceso con exit ≠ 0 → devolver stderr recortado como error.
- Timeout → matar el proceso y devolver "El encargo superó el tiempo máximo (5
  min)."
- Body inválido → `400` con el motivo.

## Pruebas

Como el motor depende del CLI `claude` (efecto externo), las pruebas se centran
en la lógica pura y la construcción del contrato, con el spawn mockeado:

1. **`salas-data`**: `slugSala` produce ids estables; `SALAS` no tiene ids
   duplicados; todo agente pertenece a exactamente una sala.
2. **API — validación**: body sin `encargo` → 400; `salaId` inexistente → 400;
   `agente` que no está en la sala → 400.
3. **API — construcción de prompt**: dado sala+agente+encargo, el prompt
   contiene el nombre del agente, su rol y el texto del encargo (función pura
   `construirPrompt` extraída y testeada sin spawn).
4. **API — éxito (spawn mockeado)**: mock que devuelve stdout "hecho" y crea un
   archivo → respuesta `{ ok:true, resultado:'hecho', archivos:[...] }`.
5. **API — fallo (spawn mockeado)**: mock exit≠0 → `{ ok:false, error }`.

Verificación manual de punta a punta (documentada en el arranque): con
`npm run dev` y `claude` autenticado, asignar un encargo real a Bruno y
comprobar que aparece el entregable.

## Cómo arrancarlo (irá en el README de la feature)

1. Tener el CLI de Claude Code instalado y autenticado con la cuenta propia
   (`claude` responde en la terminal).
2. `npm run dev` en la raíz de Quioba.
3. Abrir `/apps/oficina`, clicar un agente, escribir un encargo, Enviar.
4. Los entregables generados aparecen en `oficina-output/<sala>/`.

No requiere ninguna API key externa ni servicio de pago: usa la sesión local de
Claude Code.
