/**
 * Registro para las rutas de API.
 *
 * next.config borra todas las llamadas a console.log de la compilacion de
 * produccion, que es lo que queremos en el navegador del usuario. Pero ese
 * borrado no distingue navegador de servidor, y los diagnosticos de las rutas
 * de IA si valen la pena: van a los registros de Vercel y nadie mas los ve.
 *
 * Por eso esto escribe directo a la salida estandar en vez de usar console:
 * asi sobrevive al borrado.
 */
export function logServidor(...partes: unknown[]): void {
    const texto = partes
        .map((p) => (typeof p === 'string' ? p : safeJson(p)))
        .join(' ');

    process.stdout.write(texto + '\n');
}

function safeJson(valor: unknown): string {
    try {
        return JSON.stringify(valor);
    } catch {
        // Referencias circulares o valores que no se pueden serializar.
        return String(valor);
    }
}
