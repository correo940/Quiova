# Quioba — contexto del proyecto

Última actualización: 12 de septiembre de 2026.

## Qué es

Quioba es un conjunto de ~35 aplicaciones para organizar la vida personal y
familiar (lista de la compra, economía, botiquín, documentos, contraseñas,
cuadrante de turnos, campus escolar, gastos compartidos…). Producto de un solo
desarrollador, en fase de pruebas.

- **Web**: Next.js 14 App Router + Supabase. Producción en `https://www.quioba.com` (Vercel, despliegue automático al hacer push a `main`).
- **Android e iPhone**: la misma web dentro de una carcasa Capacitor que carga `quioba.com`. **No son apps nativas**: lo que se arregla en la web llega a los tres sitios.
- **iPhone**: no se distribuye por App Store. Se instala desde Safari a la pantalla de inicio (PWA). No hace falta Mac, Xcode ni cuenta de Apple.
- **Android**: se reparte el APK a mano, fuera de Play Store.

El repositorio se llama **Quiova** y el producto **Quioba**. Es una errata
histórica, no dos cosas distintas.

## Estado real de uso (importante)

`profiles` tiene 10 filas, pero **hay un solo usuario activo: el propietario**
(68 cosas creadas). Tres personas entraron alguna vez y no crearon nada, una
nunca entró, y cinco son cuentas de prueba. No interpretes «10 usuarios» como
10 personas usando la app.

## Cómo se trabaja aquí

Reglas que salieron de la práctica y conviene respetar:

1. **Compilar no es verificar.** Varias veces el código compilaba y la función estaba rota. Verifica ejecutando: contra la base de datos, contra producción, o simulando dos usuarios distintos con `set local role authenticated` + `request.jwt.claims` dentro de una transacción con `rollback`.
2. **Comprueba también el caso bueno.** Al acotar permisos es fácil dejar fuera al dueño. Ha pasado: mira que el legítimo siga entrando, no solo que el extraño quede fuera.
3. **Un test que no puede fallar es peor que no tenerlo.** Antes de dar por bueno un test, rómpelo a propósito y confirma que falla. Un test buscaba la palabra `requireUser` y la encontraba en la línea del `import`: pasaba con el candado quitado.
4. **Deja marcha atrás.** Los cambios de policies y buckets tienen su `*_rollback_*.sql` en la raíz.
5. **Explica al usuario sin jerga.** No es programador. Di qué se rompe y para quién, no cómo se llama la técnica.

```bash
npm run test:guardias   # 71 tests, 4 segundos, sin navegador ni servidor
npm run build           # 156 páginas
npx tsc --noEmit
```

## Hecho (6–12 septiembre 2026)

24 commits. Lo relevante:

**Seguridad** — todo verificado, no solo escrito:
- El panel de administración estaba abierto a **cualquier cuenta de GitHub del mundo** (el proveedor no tenía lista de permitidos). Cerrado por correo + `requireAdmin()` en las 5 rutas.
- **29 rutas de IA** (Gemini, Groq, PlantNet, OCR, XTTS) respondían sin sesión: cualquiera podía gastar el saldo. Cerradas con `requireUser()`.
- **9 de 10 buckets de Storage eran públicos**, incluido el de documentos seguros, y el listado estaba abierto. Ahora todos privados, enlaces firmados de 1 hora, y cada usuario ve solo lo suyo (chat por familia, el resto por dueño).
- **14 tablas y 50 funciones** dejaban pasar a anónimos. Cerradas.
- El APK que se repartía era de depuración, firmado con la clave pública de Android. Ahora hay release firmada con `android/quioba-release.jks`.

**Rendimiento:**
- El panel lanzaba 54 peticiones al abrirse, 21 fallando con 503, y los contadores salían vacíos. Dos causas: montaba el diseño equivocado y lo cambiaba (duplicando todo), y lanzaba once recuentos simultáneos. Ahora **19 peticiones, 0 errores**.
- Imágenes: **28,6 MB → 8,1 MB**. Criterio por tipo, no una receta única.

**App de Gastos (SplitSmart)** — era la peor:
- No sabía de quién era nada: el único miembro se llamaba «Tú» sin cuenta asociada. Ahora los grupos tienen dueño y se rigen por pertenencia.
- Las invitaciones **no existían**: el código se inventaba en el navegador y el enlace apuntaba a un dominio ajeno. Construidas de cero.
- El chat escribía en una tabla que no existía y fallaba en silencio. Tabla creada, mensajes y reacciones persistidos.
- `page.tsx`: 3.811 → 3.011 líneas. Cuentas en `src/lib/splitsmart/balances.ts` con 11 tests; seis pestañas en `expenses/tabs/`.
- Bug real encontrado: un gasto cuyo pagador ya no estaba en el grupo **descuadraba la media de todo el grupo**.

**Otros:** 56→71 tests desde cero, PWA de iPhone con `viewport-fit=cover` y aviso de instalación, precios a 0 (no hay pasarela de pago), `console.log` fuera del navegador, 4 páginas muertas borradas.

## Trampas encontradas (no repetir)

- **Columna que tapa a otra en una policy.** `chat_rooms` tiene una columna `name`, así que dentro de un `EXISTS` el `name` sin cualificar se resolvía a `cr.name` en vez de al del fichero. Dejó el chat sin fotos para todo el mundo. Escribe `storage.objects.name`.
- **Recursión infinita en RLS.** Una policy de `splitsmart_miembros` que consulte `splitsmart_miembros` se cuelga. Usa una función `SECURITY DEFINER`.
- **No renombres claves de `localStorage`.** Las claves `quiova_note_*` guardan notas de usuarios: renombrarlas las borra.
- **`include_in_total` en cuentas de ahorro** solo excluye si vale exactamente `false`. Una cuenta sin la marca **suma**. Hay un test que lo fija; no lo «arregles».
- **`removeConsole` no distingue servidor de navegador.** Los diagnósticos de las rutas de API usan `logServidor()` (`src/lib/log-servidor.ts`), que escribe a la salida estándar y sobrevive al borrado.
- **Hay dos chats distintos** y ambos se llaman «chat»: el familiar (`family_messages`, en `/apps/mi-hogar/chat`) y el de cada grupo de gastos (`splitsmart_chat`, pestaña dentro de Gastos).
- **El login solo entiende `?redirect=`** y solo rutas bajo `/apps/mi-hogar`.

## Pendiente

**Del propietario** (no se puede hacer por él):
1. Repartir `Quioba-1.0.1-release.apk` y avisar de que desinstalen el de depuración: las firmas son distintas y no se instala encima.
2. Activar en Supabase la comprobación de contraseñas filtradas (un clic).
3. Cambiar la contraseña de `android/quioba-release.jks`, que está en texto plano en `android/keystore.properties` y se expuso en una conversación.
4. Configurar `TELEGRAM_WEBHOOK_SECRET`: el webhook es lo único que sigue abierto a internet (no da acceso a datos).
5. Decidir si renombra el repositorio a Quioba (cambia la URL y toca la conexión con Vercel).
6. Registro de desarrollador Android: no urgente. El tramo gratuito cubre 20 dispositivos y España no entra hasta 2027.

**Técnico:**
- **El escaparate**: 8 apps visibles de 35 construidas. *El propietario decidió dejarlo como está por ahora.* Era la recomendación principal: tres personas entraron, no encontraron qué hacer y no volvieron.
- **18 archivos pasan de mil líneas**: Ahorros (2.388), Campus (2.108), Documentos (2.044), más la pestaña de presupuesto y los modales de Gastos. El método que funcionó: primero las cuentas a un módulo con tests, luego la interfaz una pestaña a la vez comprobando en pantalla.
- **870 `: any`**. Subieron de 770: unos 96 se añadieron al partir las pestañas, haciendo explícito lo que ya era implícito.
- **3,7 MB de imágenes de artículos** sin comprimir. Bloqueado: los artículos se sirven desde GitHub y hay que saber de qué repositorio antes de renombrar nada.
- `quiova.app` y `repo.quiova.com` aparecían en el código y **no existen**; el segundo servía un fondo de chat que nunca cargó.

## Informe

Auditoría completa con el seguimiento al día:
https://claude.ai/code/artifact/5bbc55b6-9c43-4eee-a1e6-77316b38984e
