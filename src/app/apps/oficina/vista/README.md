# La Oficina — Vista 2D + Motor de ejecución real

Vista cenital 2D de agentes de IA en `/apps/oficina`. Asignas un encargo en
lenguaje natural a un agente y Claude Code lo ejecuta de verdad con tu propia
cuenta, devolviéndote el entregable.

## Piezas

- **`vista/salas-data.ts`** — datos editables. Cambia salas, colores, agentes y
  estados aquí. Nada más que tocar.
- **`page.tsx`** — la vista 2D (plano, selección de agente, panel de encargo).
- **`../../api/oficina/encargo/route.ts`** — el servidor puente. Recibe
  `{ salaId, agente, encargo }`, ejecuta `claude -p` en una carpeta aislada por
  sala y devuelve el resultado.

## Cómo arrancarlo (con tu cuenta, sin API de pago)

1. Ten el CLI de Claude Code instalado y con sesión iniciada con tu cuenta:
   ```
   claude          # debe abrir sin pedir API key
   ```
   El puente **no** usa ninguna API key externa: reutiliza tu login local.
   (Si tienes una variable `ANTHROPIC_BASE_URL` en el entorno, el puente la
   ignora a propósito para no redirigirse a un proxy.)

2. Arranca Quioba en tu máquina:
   ```
   npm run dev
   ```

3. Entra en `/apps/oficina` (requiere estar logueado como admin), clica un
   agente, escribe el encargo y pulsa **Enviar encargo**. Mientras trabaja, su
   punto se pone verde y late; al terminar ves el resultado y la lista de
   archivos generados.

4. Los entregables aparecen en `oficina-output/<sala>/` en la raíz del proyecto.

## Límites de esta versión

- Solo funciona con `npm run dev` (servidor Node real). **No** en el build
  estático móvil de Capacitor: ejecutar `claude` requiere subprocesos.
- Sin persistencia: el resultado vive en la pestaña hasta recargar.
- Sin coordinador automático (Hermes) ni rutinas programadas: el reparto lo
  haces tú eligiendo el agente. Son extensiones futuras.

## Editar el equipo

Abre `vista/salas-data.ts` y modifica el array `SALAS`. Cada agente tiene:
`nombre`, `estado` (`'trabajando' | 'libre'`), `tipo`
(`'coordinacion' | 'manager' | 'especialista'`) y `rol` (texto corto que se
inyecta en su prompt para darle identidad).
