/**
 * Lógica canónica para distinguir tareas reales de agrupadoras.
 *
 * Una "tarea agrupadora" es una tarea legacy sin objetivoId que pertenece
 * a una decisión que ya tiene un objetivo real (fue creada antes de que el
 * flujo asignara objetivoId a las tareas).
 *
 * Regla única:
 *   Tarea con decisionId pero SIN objetivoId, cuya decisión ya tiene un objetivo → agrupadora.
 *   Tarea con objetivoId → siempre real (fue creada en el flujo actual y tiene trazabilidad).
 *   Tarea sin decisionId → siempre real (tarea manual).
 *
 * @param tareas     Lista de tareas a filtrar.
 * @param objetivos  Lista de objetivos del sistema.
 * @param directorId Scope opcional. Si se pasa, solo considera objetivos de ese director
 *                   para construir el set de decisiones-con-objetivo.
 */
export function filtrarTareasReales<T extends {
    decisionId?: string | null;
    objetivoId?: string | null;
    directorId?: string;
}>(
    tareas: T[],
    objetivos: Array<{ id: string; decisionId?: string | null; directorId?: string }>,
    directorId?: string,
): T[] {
    // Set de decisionIds que tienen al menos un objetivo (scope opcional a un director)
    const decisionesConObjetivo = new Set<string>(
        objetivos
            .filter(o => o.decisionId && (!directorId || o.directorId === directorId))
            .map(o => o.decisionId!)
    );

    return tareas.filter(t => {
        if (!t.decisionId) return true;    // tarea manual → real
        if (t.objetivoId) return true;     // tiene trazabilidad → real
        // Sin objetivoId: agrupadora legacy si la decisión ya tiene un objetivo
        return !decisionesConObjetivo.has(t.decisionId);
    });
}
