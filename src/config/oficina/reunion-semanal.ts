export interface DiaDisponible {
    nombre: string;
    abrev: string;
    disponible: boolean;
}

export interface ReunionSemanal {
    etiqueta: string;
    horasDisponibles: number;
    dias: DiaDisponible[];
    iniciativaPrincipalId: number;
    prioridades: string[];
    resultadoEsperado: string;
}

export const REUNION_SEMANAL: ReunionSemanal = {
    etiqueta: 'Semana 23 · 26 mayo – 1 jun 2026',
    horasDisponibles: 20,
    dias: [
        { nombre: 'Lunes',     abrev: 'L', disponible: true },
        { nombre: 'Martes',    abrev: 'M', disponible: true },
        { nombre: 'Miércoles', abrev: 'X', disponible: true },
        { nombre: 'Jueves',    abrev: 'J', disponible: true },
        { nombre: 'Viernes',   abrev: 'V', disponible: true },
        { nombre: 'Sábado',    abrev: 'S', disponible: false },
        { nombre: 'Domingo',   abrev: 'D', disponible: false },
    ],
    iniciativaPrincipalId: 1,
    prioridades: [
        'Completar el panel Director General con todas las secciones planificadas.',
        'Revisar el flujo de onboarding de Quioba como si fuera un usuario nuevo.',
        'Redactar la propuesta de valor de El Campus en una frase y tres bullets.',
    ],
    resultadoEsperado:
        'Tener un panel de dirección funcional en Oficina y una propuesta de valor clara para El Campus, lista para compartir con los primeros usuarios externos.',
};
