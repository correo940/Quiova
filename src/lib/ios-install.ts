/**
 * Decide si mostrar el aviso de "Añadir a pantalla de inicio".
 * Funcion pura y sin dependencias del navegador para poder probarla.
 */
export function debeMostrarAvisoIOS(opciones: {
    userAgent: string;
    maxTouchPoints: number;
    yaInstalada: boolean;
    descartado: boolean;
}): boolean {
    const { userAgent: ua, maxTouchPoints, yaInstalada, descartado } = opciones;

    const esIOS = /iphone|ipad|ipod/i.test(ua)
        || (/Macintosh/.test(ua) && maxTouchPoints > 1); // iPad moderno se hace pasar por Mac

    // Chrome, Firefox, Edge y Opera en iOS no pueden añadir a pantalla de inicio.
    const esSafari = !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

    return esIOS && esSafari && !yaInstalada && !descartado;
}
