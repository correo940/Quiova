import type { CategoriaContenido, ObjetivoContenido, FormatoContenido } from './director-contenido';
import type { TipoEntrega } from './consulta-contenido-generator';

export interface DecisionesEditoriales {
    categoria: CategoriaContenido;
    formato: FormatoContenido;
    objetivo: ObjetivoContenido;
    tipoEntrega: TipoEntrega;
}

// ── Reglas de detección ───────────────────────────────────────────────────────

type KW<T> = Array<{ patron: RegExp; valor: T }>;

const KW_CAT: KW<CategoriaContenido> = [
    {
        patron: /circadian|ejercici|pausa[\s-]activ|sedentari|estiram|rutina.{0,10}(física|mañana|tarde|noche)|movimiento|descanso|dormir|sueño|ergon|postura|dolor.{0,10}(espalda|columna|cervical|lumbar)|lumbar/i,
        valor: 'cuerpo',
    },
    {
        patron: /ansied|estrés|estres|meditaci|concentra|mental|adhd|respira|mindful|burnout|procrastin|habit|motivaci|agobia|agotami|emocio|desconec|foco|mente|ánimo|animo/i,
        valor: 'mente',
    },
    {
        patron: /presupuest|dinero|ahorro|gast[oa]|inversi|deuda|finanz|sueldo|ingres|factura|econom|nómina|nomina|planif.{0,10}econom|finanzas famil/i,
        valor: 'finanzas',
    },
    {
        patron: /quioba|campus|mi hogar|plataforma|app\b|organiz|productividad|usuario|onboarding|bienestar.{0,10}app|lanzamiento|funcionalidad/i,
        valor: 'quioba',
    },
];

const KW_FORMATO: KW<FormatoContenido> = [
    { patron: /\d+\s*segundo|un minuto|1\s*minuto|shorts|reels|tiktok|rápido|breve|menos de 1|vídeo corto|video corto/i, valor: 'corto' },
    { patron: /tutorial|cómo hacer|cómo funciona|paso a paso|guía|aprend|explic.{0,8}cómo|demo(strar)?|instrucciones/i, valor: 'tutorial' },
    { patron: /historia|experiencia.{0,10}personal|mi caso|testimonio|\d+\s*días|antes y después/i, valor: 'historia' },
    { patron: /por qué\b|debate|diferencia|comparar|vs\b|versus|mejor que|peor que|opinión/i, valor: 'opinion' },
    { patron: /análisis|en profundidad|completo y|exhaustivo|detallado|video largo/i, valor: 'largo' },
];

const KW_OBJETIVO: KW<ObjetivoContenido> = [
    { patron: /atraer usuario|captar|conseguir usuario|que (lo )?prueb|que (se )?descargu|registr|primeros usuario|que llegue gente/i, valor: 'captacion' },
    { patron: /vender|convertir|que (lo )?compren|cta fuerte|que (se )?suscriban|acción inmediata/i, valor: 'conversion' },
    { patron: /presentar\b|dar a conocer|quiénes somos|identidad.*marca|qué es quioba|qué es.{0,8}app/i, valor: 'marca' },
];

const KW_TIPO: KW<TipoEntrega> = [
    { patron: /producción completa|todo listo|listo para publicar|completo con todo|todo preparado/i, valor: 'produccion-completa' },
    { patron: /\d+\s*segundos?|menos de \d+|duración exacta/i, valor: 'produccion-completa' },
    { patron: /dame\s*(una\s*)?ideas?|propón\s*(una\s*)?ideas?|qué (ideas|videos) puedo|varias opciones|alternativas/i, valor: 'ideas' },
    { patron: /escribe.*guion|guion\s*de|quiero.*guion|redacta.*guion|el\s*guion/i, valor: 'guion' },
];

function match<T>(texto: string, keywords: KW<T>): T | null {
    for (const { patron, valor } of keywords) {
        if (patron.test(texto)) return valor;
    }
    return null;
}

function inferirTipo(texto: string, formato: FormatoContenido): TipoEntrega {
    const explícito = match(texto, KW_TIPO);
    if (explícito) return explícito;
    // "dame ideas" o petición vaga → ideas
    if (/dame|propón|ideas?|opciones|alternativas/i.test(texto)) return 'ideas';
    // Formato corto con tema específico → producción completa (saben qué quieren)
    if (formato === 'corto') return 'produccion-completa';
    // Por defecto → guion
    return 'guion';
}

// ── Función principal ─────────────────────────────────────────────────────────

export function analizarPeticion(peticion: string): DecisionesEditoriales {
    const categoria  = match(peticion, KW_CAT)     ?? 'quioba';
    const formato    = match(peticion, KW_FORMATO)  ?? 'corto';
    const objetivo   = match(peticion, KW_OBJETIVO) ?? 'alcance';
    const tipoEntrega = inferirTipo(peticion, formato);
    return { categoria, formato, objetivo, tipoEntrega };
}
