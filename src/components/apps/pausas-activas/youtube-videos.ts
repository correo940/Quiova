/**
 * IDs de videos de YouTube para cada ejercicio (EN ESPAÑOL).
 * Fuentes: YouTube España, Clínica Baviera, FisioOnline, canales profesionales validados.
 */

export const YOUTUBE_VIDEO_IDS: Record<string, string> = {
    // ============ OJOS ============
    'eye-20-20-20': 'tGjFwsuQ2-M', // ¿Qué es la regla 20-20-20? | Clínica Baviera
    'eye-palming': 'DJSx9m0BJR8', // Mejora tu vista con el Palming | Fisio Ocular
    'eye-blink': 'YgN9OyRglcY', // Cómo relajar tus ojos cansados y mejorar tu vista - Palming
    'eye-massage': 'rMETI0UzMPw', // PALMING - Relajación guiada para tus ojos
    'eye-focus': 'hw9EEhURkDw', // PALMING - Relajación guiada para la mañana

    // ============ CUELLO ============
    'neck-tilt': 'FD0JzLi4dCY', // RUTINA de EJERCICIOS para aliviar el DOLOR DE CUELLO
    'neck-retraction': 'NEqp5YXLhs8', // Rutina de estiramientos para las cervicales (15 MINUTOS)
    'neck-diagonal': '8tyO0ti6NL0', // 7 Ejercicios para ELIMINAR dolor y tensión de CUELLO & HOMBROS

    // ============ HOMBROS ============
    'shoulder-rolls': 'DxK-XWpBxKM', // RUTINA de ESTIRAMIENTOS para el HOMBRO (30 minutos)
    'shoulder-clasp': 'iiO7d_E__5M', // RUTINA de ESTIRAMIENTOS de hombros, brazos, y muñecas (20 min)
    'shoulder-doorway': 'EGVhQFIpcZE', // Estiramientos para ESPALDA Y HOMBROS

    // ============ ESPALDA ============
    'back-twist': 'EGVhQFIpcZE', // Estiramientos para ESPALDA Y HOMBROS
    'back-catcow': 'cYF9gAvYJDg', // Estiramientos para la articulación del hombro (con movimiento del tronco)

    // ============ PIERNAS ============
    'legs-walk': 'BdRiA0oGwn0', // PAUSA ACTIVA miembros inferiores, PIERNAS
    'legs-calf': '0_3VHvQ9QnA', // PAUSA ACTIVA - CADERA Y PIERNAS
    'legs-hip': '22tEeOCNqB4', // Pausa Activa para las Piernas (10 min)

    // ============ MANOS ============
    'hands-wrist': 'iiO7d_E__5M', // RUTINA de ESTIRAMIENTOS de hombros, brazos, y muñecas
    'hands-fist': 'VIJxO8fyIU8', // Pausa Activa - Ejercicios de Piernas en posición de Sentado

    // ============ AGUA ============
    'water-glass': 'FIvpD0ovVzQ', // Pausas Activas: practica estos ejercicios que te harán sentir mejor
}

/**
 * Genera URL embebible de YouTube a partir de ID
 */
export function getYouTubeEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`
}
