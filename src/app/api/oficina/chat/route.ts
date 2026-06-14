import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { filtrarTareasReales } from '@/lib/oficina/tareas-reales';

// Categorías de biblioteca relevantes por director
const BIBLIOTECA_RELEVANTE: Record<string, string[]> = {
    'director':             ['prompts', 'normas', 'procesos', 'branding', 'decisiones-corporativas'],
    'jefe-gabinete':        ['prompts', 'normas', 'procesos', 'branding', 'decisiones-corporativas'],
    'director-contenido':   ['prompts', 'normas', 'branding'],
    'director-crecimiento': ['normas', 'procesos', 'decisiones-corporativas'],
    'director-tecnico':     ['procesos', 'decisiones-corporativas'],
    'consejo-estrategico':  ['prompts', 'normas', 'procesos', 'branding', 'decisiones-corporativas'],
};

const CATEGORIA_LABEL: Record<string, string> = {
    'prompts':                'Prompt Maestro',
    'normas':                 'Norma',
    'procesos':               'Proceso',
    'branding':               'Branding',
    'decisiones-corporativas':'Decisión Corporativa',
};

const DIRECTOR_PERSONAS: Record<string, string> = {
    'director': `Eres el Director General de Quioba. Eres responsable de la estrategia, los objetivos anuales y trimestrales, las prioridades y la delegación de trabajo a otros directores. Eres estratégico, directo y orientado a resultados. Hablas con autoridad pero de forma cercana. Cuando recibes expedientes, los analizas, generas decisiones y delegas tareas.`,

    'jefe-gabinete': `Eres el Jefe de Gabinete de Quioba. Tienes visión global de toda la empresa: ves todos los expedientes, todas las decisiones, todos los objetivos y todas las tareas sin importar el director responsable. Tu función es coordinar, no crear ni desarrollar. Detectas bloqueos, identificas prioridades, equilibras la carga de trabajo entre directores y te aseguras de que nada quede sin procesar. Respondes preguntas como "¿qué tenemos pendiente hoy?", "¿qué director tiene más carga?", "¿qué expedientes no tienen decisión?", "¿qué objetivos están vencidos?". Eres metódico, directo y orientado a la ejecución.`,

    'director-contenido': `Eres el Director de Contenido de Quioba. Eres responsable de TikTok, Instagram, YouTube y artículos. Gestionas el plan editorial, las ideas de vídeo y la estrategia de contenido. Eres creativo pero sistemático. Conoces los procesos de producción, los prompts maestros y las normas de estilo de Quioba.`,

    'director-crecimiento': `Eres el Director de Crecimiento de Quioba. Eres responsable de la captación de usuarios, el programa beta, los referidos y los embudos de conversión. Eres orientado a métricas y tracción. Piensas en cómo crecer con los recursos disponibles.`,

    'director-tecnico': `Eres el Director Técnico de Quioba. Eres responsable del desarrollo, los bugs, la infraestructura y la arquitectura técnica. Eres preciso y riguroso. Priorizas la estabilidad del producto sobre las nuevas features.`,

    'consejo-estrategico': `Eres el Consejero Estratégico de Quioba. Eres responsable de revisar decisiones importantes, detectar riesgos y identificar oportunidades. Eres analítico y crítico. Cuestionas suposiciones y aportas perspectiva.`,
};

const REGLA = `
REGLA FUNDAMENTAL E INAMOVIBLE:
Solo puedes responder usando la información proporcionada en este prompt.
Si alguien pregunta algo que no está en los datos proporcionados, responde exactamente:
"No tengo esa información registrada en Quioba."
NUNCA uses conocimiento externo. NUNCA especules ni inventes datos.
Eres un empleado virtual de Quioba, no un asistente de IA generalista.
Si los datos de una sección están vacíos, dilo con naturalidad: "No tengo [X] registrado aún."

TRAZABILIDAD OBLIGATORIA:
Cuando cites información específica (una tarea, un expediente, un objetivo, una prioridad),
SIEMPRE indica de dónde viene con el formato:
📌 Fuente: [Expediente "título"] / [Tarea "título"] / [Contexto corporativo] / [Decisión "título"]
Si no puedes citar una fuente concreta, no afirmes el dato.
`;

function fmt(items: string[]): string {
    if (!items.length) return '(ninguno)';
    return items.join('\n');
}

function buildContextoCorporativo(ctx: any): string {
    // Prioriza el contexto editable (fundacion) sobre el estático (empresa)
    const f = ctx.fundacion;
    const e = ctx.empresa ?? {};

    if (f) {
        const prioridades = [f.prioridad1, f.prioridad2, f.prioridad3].filter(Boolean);
        return `Empresa: Quioba
Fase actual: ${f.faseProducto ?? '—'}
Estado: ${f.descripcionEstado || '(sin descripción registrada)'}
Usuarios reales: ${f.usuariosReales ?? 0}
Contexto de usuarios: ${f.descripcionUsuarios || '(sin datos registrados)'}
Monetización: ${f.estadoMonetizacion ?? '—'}
Horas disponibles/semana: ${f.horasSemanales ?? '—'}
Trimestre activo: ${f.trimestreLabel ?? '—'}
Prioridades del trimestre:
${prioridades.length ? prioridades.map((p, i) => `  ${i + 1}. ${p}`).join('\n') : '  (sin prioridades registradas)'}
Observaciones estratégicas: ${f.descripcionMonetizacion || '(sin observaciones)'}`;
    }

    return `Empresa: ${e.nombre ?? 'Quioba'}
Visión: ${e.vision ?? '—'}
Misión: ${e.mision ?? '—'}
Estado actual: ${e.estadoActual ?? '(sin datos registrados)'}`;
}

function buildSystemPrompt(directorId: string, ctx: any): string {
    const persona = DIRECTOR_PERSONAS[directorId] ?? DIRECTOR_PERSONAS['director'];

    const esDG = directorId === 'director';
    const esJG = directorId === 'jefe-gabinete';
    const esGlobal = esDG || esJG;

    const misExpedientes: any[] = esJG
        ? (ctx.expedientes ?? []).filter((x: any) => x.estado !== 'cerrado')
        : (ctx.expedientes ?? []).filter((x: any) => x.directorRevisor === directorId && x.estado !== 'cerrado');

    // DG y JG supervisan TODOS los objetivos activos de la empresa
    const misObjetivos: any[] = esGlobal
        ? (ctx.objetivos ?? []).filter((x: any) => x.estado === 'activo')
        : (ctx.objetivos ?? []).filter((x: any) => x.directorId === directorId && x.estado === 'activo');

    const tareasBase: any[] = esJG
        ? (ctx.tareas ?? []).filter((x: any) => x.estado !== 'completada')
        : (ctx.tareas ?? []).filter((x: any) => x.directorId === directorId && x.estado !== 'completada');
    // filtrarTareasReales usa la lógica canónica de src/lib/oficina/tareas-reales.ts:
    // excluye agrupadoras (caso A: sin objetivoId; caso B: objetivoId de la misma decisión)
    const misTareas: any[] = filtrarTareasReales(
        tareasBase,
        ctx.objetivos ?? [],
        esGlobal ? undefined : directorId,
    );

    const misDecisiones: any[] = esGlobal
        ? (ctx.decisiones ?? []).slice(0, 8)
        : (ctx.decisiones ?? []).filter((x: any) => x.directoresAfectados?.includes(directorId)).slice(0, 6);

    const categoriasRelevantes = BIBLIOTECA_RELEVANTE[directorId] ?? BIBLIOTECA_RELEVANTE['director'];
    const miBiblioteca: any[] = (ctx.biblioteca ?? [])
        .filter((b: any) => b.estado === 'activo' && categoriasRelevantes.includes(b.categoria))
        .slice(0, 12);

    const labelDirector: Record<string, string> = {
        'director': 'Director General',
        'director-contenido': 'Director de Contenido',
        'director-crecimiento': 'Director de Crecimiento',
        'director-tecnico': 'Director Técnico',
        'jefe-gabinete': 'Jefe de Gabinete',
        'consejo-estrategico': 'Consejo Estratégico',
    };

    // Para JG: separar expedientes en pendientes (sin decisión) vs procesados (con decisión)
    let expedientesTexto: string;
    if (esJG) {
        const expIdConDecision = new Set(
            (ctx.decisiones ?? []).map((d: any) => d.expedienteId).filter(Boolean) as string[]
        );
        const pendientes = misExpedientes.filter((x: any) => !expIdConDecision.has(x.id));
        const procesados = misExpedientes.filter((x: any) => expIdConDecision.has(x.id));
        const txtP = pendientes.length > 0
            ? pendientes.map((x: any, i: number) =>
                `${i + 1}. [PENDIENTE] "${x.titulo}" → ${labelDirector[x.directorRevisor] ?? x.directorRevisor}\n   ${x.resumen}\n   Fecha: ${x.fechaCreacion?.slice(0, 10)}`
            ).join('\n')
            : '(ninguno — todos los expedientes están procesados)';
        const txtPr = procesados.length > 0
            ? '\n\nPROCESADOS (con decisión — ya tienen acción):\n' + procesados.map((x: any, i: number) =>
                `${i + 1}. "${x.titulo}" → ${labelDirector[x.directorRevisor] ?? x.directorRevisor}`
            ).join('\n')
            : '';
        expedientesTexto = `PENDIENTES (sin decisión):\n${txtP}${txtPr}`;
    } else {
        expedientesTexto = fmt(misExpedientes.map((x: any, i: number) =>
            `${i + 1}. [${x.estado}] "${x.titulo}"\n   Resumen: ${x.resumen}\n   Fecha: ${x.fechaCreacion?.slice(0, 10)}`
        ));
    }

    return `${persona}
${REGLA}

═══ CONTEXTO CORPORATIVO (datos registrados en Quioba) ═══
${buildContextoCorporativo(ctx)}

═══ ${esJG ? 'EXPEDIENTES DE QUIOBA' : 'EXPEDIENTES EN MI DESPACHO'} ═══
${expedientesTexto}

═══ ${esGlobal ? 'OBJETIVOS ACTIVOS DE LA EMPRESA (supervisión global)' : 'MIS OBJETIVOS ACTIVOS'} ═══
${fmt(misObjetivos.map((x, i) =>
    `${i + 1}. [${(x.prioridad ?? 'media').toUpperCase()}] "${x.titulo}"\n   Responsable: ${labelDirector[x.directorId] ?? x.directorId}\n   ${x.descripcion || '(sin descripción)'}\n   Fecha objetivo: ${x.fechaObjetivo || 'sin fecha definida'}`
))}

═══ ${esJG ? 'TODAS LAS TAREAS PENDIENTES' : esDG ? 'TAREAS DELEGADAS PENDIENTES' : 'MIS TAREAS PENDIENTES'} ═══
${fmt(misTareas.map((x, i) =>
    `${i + 1}. [${x.urgencia}] "${x.titulo}" (${x.estado})${esJG ? ` → ${labelDirector[x.directorId] ?? x.directorId}` : ''}\n   ${x.descripcion}\n   Asignado por: ${labelDirector[x.directorOrigen] ?? x.directorOrigen} — Fecha: ${x.fechaAsignacion?.slice(0, 10)}`
))}

═══ DECISIONES RELEVANTES ═══
${fmt(misDecisiones.map((x, i) =>
    `${i + 1}. [${x.estado}] "${x.titulo}": ${x.descripcion} — Fecha: ${x.fechaDecision?.slice(0, 10)}`
))}

═══ BIBLIOTECA CORPORATIVA (conocimiento permanente de Quioba) ═══
${miBiblioteca.length === 0
    ? '(sin entradas registradas en la biblioteca)'
    : miBiblioteca.map((b, i) => {
        const contenidoRecortado = b.contenido?.length > 800
            ? b.contenido.slice(0, 800) + '...[recortado]'
            : (b.contenido ?? '');
        return `${i + 1}. [${CATEGORIA_LABEL[b.categoria] ?? b.categoria}] "${b.titulo}" (${b.version ?? 'v1'})\n${contenidoRecortado}`;
    }).join('\n\n')
}

Responde siempre en español. Sé natural y directo. Usa el nombre exacto de expedientes, tareas y decisiones al citarlos.`;
}

export async function POST(req: NextRequest) {
    try {
        const { directorId, message, history = [], contexto = {} } = await req.json();

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { reply: 'Error de configuración: GROQ_API_KEY no definida.' },
                { status: 500 }
            );
        }

        const groq = new Groq({ apiKey });

        const systemPrompt = buildSystemPrompt(directorId, contexto);

        const messages = [
            { role: 'system' as const, content: systemPrompt },
            ...history.slice(-12).map((m: any) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
            { role: 'user' as const, content: message },
        ];

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.35,
            max_tokens: 700,
        });

        const reply = completion.choices[0]?.message?.content ?? 'No pude procesar tu consulta.';
        return NextResponse.json({ reply });

    } catch (err: any) {
        console.error('[Oficina Chat]', err);
        return NextResponse.json({ reply: 'Error interno. Inténtalo de nuevo.' }, { status: 500 });
    }
}
