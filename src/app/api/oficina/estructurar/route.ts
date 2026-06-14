import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const DIRECTOR_CONTEXTO: Record<string, string> = {
    'director':             'Puedes asignar tareas a cualquier director según el contenido.',
    'director-contenido':   'El contexto es contenido audiovisual (TikTok, Instagram, YouTube). Asigna las tareas a director-contenido salvo que haya motivo técnico o de crecimiento.',
    'director-tecnico':     'El contexto es desarrollo, infraestructura o bugs. Asigna las tareas a director-tecnico.',
    'director-crecimiento': 'El contexto es captación, beta, embudos o referidos. Asigna las tareas a director-crecimiento.',
    'jefe-gabinete':        'El contexto es coordinación operativa. Asigna cada tarea al director más adecuado.',
    'consejo-estrategico':  'El contexto es revisión estratégica. Asigna las tareas según el área que más impacta.',
};

function buildContextoEmpresa(ctx: Record<string, unknown>): string {
    const f = ctx.fundacion as Record<string, unknown> | undefined;
    if (!f) return '';
    return `Empresa: Quioba | Fase: ${f.faseProducto ?? '?'} | Usuarios: ${f.usuariosReales ?? 0} | Trimestre: ${f.trimestreLabel ?? '?'}`;
}

export async function POST(req: NextRequest) {
    try {
        const { mensaje, contexto = {}, directorId = 'director' } = await req.json();

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY no definida' }, { status: 500 });

        const groq = new Groq({ apiKey });

        const directorHint = DIRECTOR_CONTEXTO[directorId] ?? DIRECTOR_CONTEXTO['director'];
        const empresaHint = buildContextoEmpresa(contexto as Record<string, unknown>);

        const systemPrompt = `Eres un asistente ejecutivo de Quioba. El director ha enviado una orden de trabajo usando el comando /registrar.

Tu única tarea: convertir esa orden en una estructura de trabajo con expediente, decisión, objetivo y tareas.

DIRECTOR QUE ENVÍA LA ORDEN: ${directorId}
${directorHint}
${empresaHint ? `CONTEXTO EMPRESA: ${empresaHint}` : ''}

DIRECTORES DISPONIBLES:
- director: Director General
- director-contenido: TikTok, Instagram, YouTube, artículos, producción audiovisual
- director-tecnico: desarrollo, bugs, infraestructura, arquitectura técnica
- director-crecimiento: captación, programa beta, embudos, referidos

═══ REGLA ABSOLUTA — DATOS EXPLÍCITOS DEL USUARIO ═══
Si el usuario especifica cualquiera de los siguientes campos, DEBES usarlos exactamente como los escribió.
NUNCA los reinterpretes, optimices ni sustituyas por tu propio criterio.

Campos explícitos que debes respetar:
- "Responsable: X" o "Director: X" → usa ese directorId para el objetivo Y para las tareas afectadas
- "Prioridad: X" → usa esa prioridad (alta/media/baja)
- "Fecha: X" o "Fecha objetivo: X" → usa esa fecha en fechaObjetivo
- "Urgencia: X" → usa esa urgencia para la tarea indicada
- "Categoría: X" o "Área: X" → úsala en descripción o para asignar director

JERARQUÍA DE EXTRACCIÓN:
1. PRIMERO: extrae los datos que el usuario escribió explícitamente
2. SOLO DESPUÉS: infiere los campos que el usuario NO especificó

Ejemplo correcto:
  Usuario escribe → "Responsable: Director de Contenido"
  JSON generado  → directorId: "director-contenido"   ← SIEMPRE

Ejemplo incorrecto (PROHIBIDO):
  Usuario escribe → "Responsable: Director de Contenido"
  JSON generado  → directorId: "director-crecimiento"  ← NUNCA

═══ REGLAS DE INFERENCIA (solo para campos NO especificados) ═══
- Cada ítem de una lista se convierte en una tarea separada y concreta
- Infiere la urgencia: urgente/hoy → "inmediata", esta semana → "esta-semana", próximo mes → "este-mes"
- El objetivo debe ser medible (con número o resultado claro si es posible)
- Si la orden es solo una lista de tareas sin objetivo claro, pon objetivo: null
- NO inventes trabajo que no está en la orden
- Títulos breves y ejecutables

RESPONDE EXCLUSIVAMENTE CON JSON VÁLIDO (sin markdown, sin texto extra):
{
  "expediente": { "titulo": string, "resumen": string },
  "decision": { "titulo": string, "descripcion": string },
  "objetivo": {
    "titulo": string,
    "descripcion": string,
    "directorId": string,
    "prioridad": "alta" | "media" | "baja",
    "fechaObjetivo": string | null
  } | null,
  "tareas": [
    {
      "titulo": string,
      "descripcion": string,
      "directorId": string,
      "urgencia": "inmediata" | "esta-semana" | "este-mes"
    }
  ]
}`;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: mensaje },
            ],
            temperature: 0.2,
            max_tokens: 2000,
            response_format: { type: 'json_object' },
        });

        const raw = completion.choices[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(raw);

        if (!parsed.expediente || !Array.isArray(parsed.tareas)) {
            return NextResponse.json({ error: 'Respuesta incompleta del modelo' }, { status: 422 });
        }

        return NextResponse.json(parsed);

    } catch (err: unknown) {
        console.error('[Estructurar]', err);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
