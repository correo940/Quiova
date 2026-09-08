/**
 * Cuentas de la app de Ahorros.
 *
 * Estaban repetidas dentro del JSX: el flujo recurrente se calculaba en cuatro
 * sitios distintos con el mismo codigo copiado, y el total en cuentas en tres.
 * Duplicar una formula es la via rapida a que dos pantallas muestren cifras
 * distintas del mismo dato.
 */

export interface CuentaBancaria {
    current_balance: number;
    /** Ausente cuenta como true: solo se excluye si esta explicitamente a false. */
    include_in_total?: boolean;
}

export interface Recurrente {
    amount: number;
    type: 'income' | 'expense';
}

export interface Objetivo {
    current_amount?: number;
    target_amount?: number;
}

/** Dinero total en cuentas, saltando las que el usuario excluyo del total. */
export function totalEnCuentas(cuentas: CuentaBancaria[]): number {
    return cuentas.reduce(
        (suma, c) => suma + (c.include_in_total !== false ? (c.current_balance || 0) : 0),
        0,
    );
}

/** Suma de los movimientos recurrentes de un tipo (ingresos o gastos). */
export function totalRecurrente(items: Recurrente[], tipo: 'income' | 'expense'): number {
    return items.reduce((suma, i) => (i.type === tipo ? suma + (i.amount || 0) : suma), 0);
}

export interface FlujoRecurrente {
    ingresos: number;
    gastos: number;
    /** ingresos - gastos. Negativo = cada mes se va mas de lo que entra. */
    flujo: number;
}

/** Lo que entra y sale cada mes de forma fija, y el saldo entre ambos. */
export function flujoRecurrente(items: Recurrente[]): FlujoRecurrente {
    const ingresos = totalRecurrente(items, 'income');
    const gastos = totalRecurrente(items, 'expense');
    return { ingresos, gastos, flujo: ingresos - gastos };
}

/** Dinero ya reunido entre todos los objetivos de ahorro. */
export function totalAhorradoEnObjetivos(objetivos: Objetivo[]): number {
    return objetivos.reduce((suma, o) => suma + (o.current_amount || 0), 0);
}

/**
 * Porcentaje conseguido de un objetivo, entre 0 y 100. Un objetivo sin meta
 * (o con meta 0) devuelve 0 en vez de dividir entre cero.
 */
export function progresoObjetivo(objetivo: Objetivo): number {
    const meta = objetivo.target_amount || 0;
    if (meta <= 0) return 0;
    return Math.min(100, Math.max(0, ((objetivo.current_amount || 0) / meta) * 100));
}
