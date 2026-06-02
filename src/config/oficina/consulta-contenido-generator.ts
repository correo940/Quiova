import { CONTEXTO_EMPRESA } from './contexto-empresa';
import type { CategoriaContenido } from './director-contenido';
import { bloquesModoRealidad } from './modo-realidad';

const CATEGORIAS: CategoriaContenido[] = ['quioba', 'cuerpo', 'mente', 'finanzas'];

const CATEGORIA_LABEL: Record<CategoriaContenido, string> = {
    quioba: 'QUIOBA',
    cuerpo: 'CUERPO',
    mente: 'MENTE',
    finanzas: 'FINANZAS',
};

const FORMATO_LABEL: Record<string, string> = {
    corto: 'Corto',
    largo: 'Largo',
    tutorial: 'Tutorial',
    historia: 'Historia',
    opinion: 'Opinion',
};

const OBJETIVO_LABEL: Record<string, string> = {
    alcance: 'Alcance',
    captacion: 'Captacion',
    marca: 'Marca',
    conversion: 'Conversion',
};

const ESTILO_LAPIZ_OBLIGATORIO =
    'Hand-drawn traditional animation style, sketch on textured paper. Monochrome graphite pencil lines, cross-hatching shading, rough paper texture visible. Black and white aesthetic with selective vibrant color. [ESCENA]. Hand-drawn animation, visible pencil strokes.';

export type TipoEntrega = 'ideas' | 'guion' | 'produccion-completa';
export type PlataformaContenido = 'tiktok' | 'reels' | 'shorts' | 'youtube';
export type OrientacionContenido = 'vertical-9-16' | 'horizontal-16-9' | 'cuadrado-1-1';
export type EstiloVisualContenido = 'realista-ia' | 'dibujo-lapiz' | 'cinematografico' | 'animacion';

export interface ParametrosConsultaContenido {
    categoria?: string;
    formato?: string;
    objetivo?: string;
    plataforma?: string;
    orientacion?: string;
    estiloVisual?: string;
}

function contieneQuioba(categoria?: string): boolean {
    return (categoria ?? '').toLowerCase().includes('quioba');
}

function ratioDesdeOrientacion(orientacion?: string): string {
    if (!orientacion) return '9:16';
    const found = orientacion.match(/\d+:\d+/);
    return found ? found[0] : '9:16';
}

function bloqueProduccionCompleta(
    nombre: string,
    sep: string,
    parametros?: ParametrosConsultaContenido
): string {
    const categoria = parametros?.categoria ?? 'Quioba';
    const plataforma = parametros?.plataforma ?? 'TikTok';
    const orientacion = parametros?.orientacion ?? 'Vertical 9:16';
    const ratio = ratioDesdeOrientacion(orientacion);
    const estiloVisual = parametros?.estiloVisual ?? 'Realista IA';
    const esQuioba = contieneQuioba(categoria);
    const reglaEstilo = esQuioba
        ? `Para cada escena usa personas reales y situaciones cotidianas de producto. Estilo base: ${estiloVisual}.`
        : `Para cada escena usa EXACTAMENTE este estilo base y reemplaza [ESCENA] con la accion concreta de la escena: ${ESTILO_LAPIZ_OBLIGATORIO}`;

    return `${sep}
SOLICITUD: PRODUCCION COMPLETA LISTA PARA PUBLICAR
${sep}

Actua como Productor Audiovisual Senior de ${nombre}.
Debes entregar una produccion completa, concreta y utilizable sin edicion estrategica adicional.

PARAMETROS FIJOS DE ESTA PIEZA:
- Categoria: ${categoria}
- Plataforma: ${plataforma}
- Orientacion: ${orientacion} (ratio ${ratio})
- Estilo visual seleccionado: ${estiloVisual}

REGLAS OBLIGATORIAS:
- Devuelve SOLO las 11 secciones indicadas abajo y en ese orden.
- No copies texto literal de fuentes o reportes previos.
- Sin parrafos estrategicos largos ni explicaciones fuera de la estructura.
- Cada escena debe tener una accion visual clara y una sola idea principal.
- La duracion por escena debe ser coherente con la locucion.
- Referencia tecnica de coherencia: ~2.4 palabras/segundo por escena.
- En cada prompt visual incluye ${plataforma}, ratio ${ratio}, y la accion de la escena.
- ${reglaEstilo}

FORMATO DE SALIDA OBLIGATORIO:
1. TITULO
2. DURACION TOTAL
3. ESCENAS
4. DURACION POR ESCENA
5. PROMPT VISUAL POR ESCENA
6. TEXTO EXACTO DE LOCUCION POR ESCENA
7. NUMERO DE PALABRAS POR ESCENA
8. TIEMPO ESTIMADO DE LECTURA
9. CTA FINAL
10. DESCRIPCION PARA PUBLICACION
11. HASHTAGS`;
}

function seccionSolicitud(
    tipo: TipoEntrega,
    nombre: string,
    sep: string,
    parametros?: ParametrosConsultaContenido
): string {
    if (tipo === 'guion') {
        return `${sep}
SOLICITUD: GUION COMPLETO
${sep}

Actua como guionista profesional y Director de Contenido de ${nombre}.
Para el tema o consulta indicada, entrega un guion listo para grabar con:

1. Titulo definitivo del video
2. Hook inicial (primeras palabras exactas)
3. Guion completo en primera persona, tono conversacional
4. CTA final adaptado al objetivo
5. Duracion estimada

Requisitos:
- Sin tecnicismos innecesarios
- Parrafos pronunciables de un solo aliento
- Indicaciones de pausa o enfasis entre corchetes`;
    }

    if (tipo === 'produccion-completa') {
        return bloqueProduccionCompleta(nombre, sep, parametros);
    }

    return `${sep}
COMO RESPONDER
${sep}

Responde como Director de Contenido de ${nombre}.
Para cada idea incluye:
- Titulo
- Categoria: Quioba / Cuerpo / Mente / Finanzas
- Formato: Corto / Tutorial / Historia / Opinion / Largo
- Objetivo: Alcance / Captacion / Marca / Conversion
- Angulo: por que conecta con audiencia real
- Descripcion: 2-3 lineas concretas

Sin generalidades. Sin respuestas de manual.`;
}

export function generarConsultaContenido(
    consulta: string,
    tipoEntrega: TipoEntrega = 'ideas',
    parametros?: ParametrosConsultaContenido
): string {
    const fecha = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const sep = '─'.repeat(54);

    const bloqueParametros = parametros
        ? `

PARAMETROS EDITORIALES
  Categoria:   ${parametros.categoria ?? 'No definida'}
  Formato:     ${parametros.formato ?? 'No definido'}
  Objetivo:    ${parametros.objetivo ?? 'No definido'}
  Plataforma:  ${parametros.plataforma ?? 'No definida'}
  Orientacion: ${parametros.orientacion ?? 'No definida'}
  Estilo:      ${parametros.estiloVisual ?? 'No definido'}`
        : '';

    return `CONSULTA AL DIRECTOR DE CONTENIDO
${'═'.repeat(54)}
${CONTEXTO_EMPRESA.nombre} · ${fecha}
${'═'.repeat(54)}

Actua como Director de Contenido de ${CONTEXTO_EMPRESA.nombre}.
Tu trabajo es proponer piezas concretas, accionables y listas para ejecucion.

${sep}
SOBRE ${CONTEXTO_EMPRESA.nombre.toUpperCase()}
${sep}

Vision: ${CONTEXTO_EMPRESA.vision}

Mision: ${CONTEXTO_EMPRESA.mision}

Iniciativa prioritaria:
"${CONTEXTO_EMPRESA.iniciativaPrioritaria.nombre}" — ${CONTEXTO_EMPRESA.iniciativaPrioritaria.razon}

${sep}
CONSULTA
${sep}

${consulta}${bloqueParametros}

${seccionSolicitud(tipoEntrega, CONTEXTO_EMPRESA.nombre, sep, parametros)}

${bloquesModoRealidad(CONTEXTO_EMPRESA.nombre)}

${'═'.repeat(54)}
Director de Contenido · ${CONTEXTO_EMPRESA.nombre}
${'═'.repeat(54)}`;
}
