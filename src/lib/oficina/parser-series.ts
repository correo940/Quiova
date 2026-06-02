export interface VideoParseado {
    posicion: number;
    titulo: string;
    descripcion: string;
    locucion: string;
    promptVisual: string;
    duracion: string;
    hashtags: string[];
}

export interface SerieParseada {
    titulo: string;
    videos: VideoParseado[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clean(text: string): string {
    return text
        .replace(/\*\*([^*\n]+)\*\*/g, '$1')
        .replace(/\*([^*\n]+)\*/g, '$1')
        .replace(/_{2}([^_\n]+)_{2}/g, '$1')
        .replace(/_([^_\n]+)_/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^>\s*/gm, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .trim();
}

function cleanLine(line: string): string {
    return line.replace(/[*#_`]/g, '').trim();
}

function isFieldLabel(line: string): boolean {
    const stripped = cleanLine(line);
    return /^[\wáéíóúñÁÉÍÓÚÑ][^:\n]{1,40}:/.test(stripped);
}

/** e.g. "1. TITULO", "11. HASHTAGS", "5. PROMPT VISUAL POR ESCENA" */
function isNumericLabel(line: string): boolean {
    return /^\d+\.\s+[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{1,50}$/.test(line.trim());
}

function videoSepRegex() {
    return /(?:^|\n)[ \t>]*[*#_]{0,3}[ \t]*V[IÍ]DEO\s+(\d+)[ \t]*[*#_]{0,3}[ \t]*(?:[:–—-][ \t]*)?([^\n*#[\]]{0,120})/gi;
}

// ── Numeric-list format parser ────────────────────────────────────────────────
// Handles AI responses like:
//   1. TITULO
//   Cuando no recuerdas...
//   2. DURACION TOTAL
//   15 segundos

const NUMERIC_MAP: Record<string, string> = {
    'TITULO':                              'titulo',
    'DURACION TOTAL':                      'duracion',
    'DURACION':                            'duracion',
    'TIEMPO ESTIMADO DE LECTURA':          'duracion',
    'DURACION DEL VIDEO':                  'duracion',
    'ESCENAS':                             'descripcion',
    'PROMPT VISUAL POR ESCENA':            'promptVisual',
    'PROMPT VISUAL':                       'promptVisual',
    'PROMPT':                              'promptVisual',
    'TEXTO EXACTO DE LOCUCION POR ESCENA': 'locucion',
    'TEXTO DE LOCUCION':                   'locucion',
    'LOCUCION':                            'locucion',
    'NARRACIÓN':                           'locucion',
    'NARRACION':                           'locucion',
    'GUION':                               'locucion',
    'DESCRIPCION PARA PUBLICACION':        'descripcion',
    'DESCRIPCION':                         'descripcion',
    'CTA FINAL':                           'cta',
    'HASHTAGS':                            'hashtags',
    'TAGS':                                'hashtags',
};

function parseNumericBlock(raw: string): Partial<Record<string, string | string[]>> {
    const lines = raw.split('\n');
    const result: Partial<Record<string, string | string[]>> = {};
    let currentKey: string | null = null;
    const buf: string[] = [];

    function flush() {
        if (!currentKey || buf.length === 0) return;
        const value = buf.join('\n').trim();
        if (!value) return;
        const field = NUMERIC_MAP[currentKey];
        if (!field || field === 'cta') return;
        if (field === 'hashtags') {
            result.hashtags = value
                .split(/[\s,]+/)
                .filter(w => w.length > 1)
                .map(w => (w.startsWith('#') ? w : `#${w}`));
        } else if (!result[field]) {
            result[field] = value;
        }
    }

    for (const line of lines) {
        const trimmed = line.trim();
        if (isNumericLabel(trimmed)) {
            flush();
            buf.length = 0;
            currentKey = trimmed.replace(/^\d+\.\s+/, '').toUpperCase().trim();
        } else if (trimmed && currentKey) {
            buf.push(clean(trimmed));
        }
    }
    flush();
    return result;
}

// ── Colon-label format parser ─────────────────────────────────────────────────

function extractField(block: string, labels: string[]): string {
    const lines = block.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const label of labels) {
            const m = line.match(
                new RegExp(`^[ \\t]*[*_]{0,3}[ \\t]*${esc(label)}[ \\t]*[*_]{0,3}[ \\t]*:+[ \\t]*(.*)`, 'i'),
            );
            if (!m) continue;
            let value = clean(m[1]);
            let j = i + 1;
            while (j < lines.length) {
                const next = lines[j].trim();
                if (next && isFieldLabel(next)) break;
                if (next) value += (value ? '\n' : '') + clean(next);
                j++;
            }
            return value.trim();
        }
    }
    return '';
}

function extractHashtags(text: string): string[] {
    return (text.match(/#[\wáéíóúñÁÉÍÓÚÑ\-]+/g) ?? []).filter(t => t.length > 2);
}

// ── Block parser (chooses format automatically) ───────────────────────────────

function parseBlock(posicion: number, raw: string, titleHint: string): VideoParseado {
    const fromSep = clean(titleHint).trim();

    // Detect numbered-list format: at least 2 lines like "N. LABEL_IN_CAPS"
    const numericCount = raw.split('\n').filter(l => isNumericLabel(l.trim())).length;

    if (numericCount >= 2) {
        const p = parseNumericBlock(raw);
        return {
            posicion,
            titulo:
                (fromSep.length > 2 ? fromSep : null) ??
                ((p.titulo as string) || `Vídeo ${posicion}`),
            descripcion:  (p.descripcion  as string)  ?? '',
            locucion:     (p.locucion     as string)  ?? '',
            promptVisual: (p.promptVisual as string)  ?? '',
            duracion:     (p.duracion     as string)  ?? '',
            hashtags:     (p.hashtags     as string[]) ?? extractHashtags(raw),
        };
    }

    // Colon-label format
    const firstContent = raw
        .split('\n')
        .map(cleanLine)
        .find(l => l.length > 3 && !isFieldLabel(l));

    const titulo =
        (fromSep.length > 2 ? fromSep : null) ??
        (extractField(raw, ['título', 'titulo', 'title', 'nombre', 'titulo del video', 'título del vídeo']) ||
            firstContent ||
            `Vídeo ${posicion}`);

    const descripcion = extractField(raw, [
        'descripción', 'descripcion', 'description', 'desc', 'contexto',
    ]);
    const locucion = extractField(raw, [
        'locución', 'locucion', 'guión', 'guion',
        'narración', 'narracion',
        'texto de locución', 'texto de locucion',
        'texto para leer', 'audio',
        'voz en off', 'voz', 'texto',
    ]);
    const promptVisual = extractField(raw, [
        'prompt visual', 'prompt', 'visual', 'escena',
        'imagen para generar', 'imagen',
        'descripción visual', 'descripcion visual',
    ]);
    const duracion = extractField(raw, [
        'duración', 'duracion', 'duration',
        'duración estimada', 'duracion estimada',
        'tiempo estimado', 'tiempo',
    ]);
    const hashtags = extractHashtags(raw);

    if (!descripcion && !locucion && !promptVisual) {
        const contentLines = raw
            .split('\n')
            .map(cleanLine)
            .filter(l => l.length > 3 && !isFieldLabel(l));
        return { posicion, titulo, descripcion: contentLines.join('\n'), locucion, promptVisual, duracion, hashtags };
    }

    return { posicion, titulo, descripcion, locucion, promptVisual, duracion, hashtags };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function parsearSerie(texto: string, tituloFallback: string): SerieParseada | null {
    const matches = [...texto.matchAll(videoSepRegex())];
    if (matches.length < 2) return null;

    const beforeFirst = texto.slice(0, matches[0].index ?? 0).trim();
    let tituloSerie = tituloFallback;

    const mSerie = beforeFirst.match(
        /(?:serie(?:\s+de\s+v[ií]deos)?|series)[:\s]+["«»]?([^"\n«»]{3,120})["»]?/i,
    );
    if (mSerie) {
        tituloSerie = clean(mSerie[1]);
    } else if (beforeFirst.length > 3 && beforeFirst.length < 300) {
        const candidate = beforeFirst.split('\n').find(l => cleanLine(l).length > 3);
        if (candidate) tituloSerie = clean(candidate);
    }

    const videos = matches.map((match, i) => {
        const start = (match.index ?? 0) + match[0].length;
        const end =
            i + 1 < matches.length
                ? (matches[i + 1].index ?? texto.length)
                : texto.length;
        return parseBlock(parseInt(match[1]), texto.slice(start, end), match[2] ?? '');
    });

    return { titulo: tituloSerie, videos };
}

export function tieneMultiplesVideos(texto: string): boolean {
    return (texto.match(videoSepRegex()) ?? []).length >= 2;
}
