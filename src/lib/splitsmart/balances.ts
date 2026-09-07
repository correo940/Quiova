import { DIVISAS, type Divisa } from './constantes';

/**
 * Reparto de deudas de SplitSmart. Estaba dentro del componente de 3.800
 * lineas, donde no habia forma de probarlo. Aqui es una funcion pura: decide
 * quien le debe dinero a quien, asi que un fallo aqui es dinero mal contado.
 */

export interface Gasto {
    /** Indice del miembro que pago, dentro del array `miembros` del grupo. */
    pagador: number;
    monto: number;
    divisa: string;
}

export interface Grupo {
    miembros: string[];
    gastos: Gasto[];
    presupuesto: { maximo: number };
}

export interface Transferencia {
    /** Indices dentro de `miembros`. */
    de: number;
    a: number;
    monto: number;
}

/** Pasa un importe a euros. Una divisa desconocida se trata como euros. */
export function aEuros(monto: number, divisa: string): number {
    const tasa = DIVISAS[divisa as Divisa]?.r || 1;
    return monto / tasa;
}

/** Lo que ha puesto cada miembro, en euros, por indice. */
export function pagadoPorMiembro(grupo: Grupo): number[] {
    const pagado = new Array(grupo.miembros.length).fill(0);

    for (const gasto of grupo.gastos) {
        // Un gasto de alguien que ya no esta en el grupo se ignora en vez de
        // romper el array con un indice fuera de rango.
        if (gasto.pagador < 0 || gasto.pagador >= pagado.length) continue;
        pagado[gasto.pagador] += aEuros(gasto.monto, gasto.divisa);
    }

    return pagado;
}

/**
 * Transferencias minimas para dejar el grupo a cero. Cada gasto se reparte a
 * partes iguales entre TODOS los miembros: el modelo de datos no guarda quien
 * participo en cada gasto.
 *
 * En cada vuelta se empareja a quien mas ha puesto de mas con quien mas debe,
 * asi que hacen falta como mucho n-1 transferencias.
 */
export function liquidar(grupo: Grupo): Transferencia[] {
    const n = grupo.miembros.length;
    if (n === 0) return [];

    const pagado = pagadoPorMiembro(grupo);
    const media = pagado.reduce((s, x) => s + x, 0) / n;
    const saldo = pagado.map((p) => +(p - media).toFixed(2));

    const transferencias: Transferencia[] = [];
    const pendiente = [...saldo];

    // n-1 basta; el tope evita un bucle infinito si entran numeros raros.
    for (let i = 0; i < n; i++) {
        const acreedor = pendiente.indexOf(Math.max(...pendiente));
        const deudor = pendiente.indexOf(Math.min(...pendiente));

        // Por debajo de un centimo se considera saldado.
        if (pendiente[acreedor] < 0.01 || pendiente[deudor] > -0.01) break;

        const monto = Math.min(pendiente[acreedor], -pendiente[deudor]);
        transferencias.push({ de: deudor, a: acreedor, monto: +monto.toFixed(2) });

        pendiente[acreedor] -= monto;
        pendiente[deudor] += monto;
    }

    return transferencias;
}

export interface ResumenGlobal {
    /** Lo que le deben a la persona indicada. */
    deben: number;
    /** Lo que esa persona debe. */
    debes: number;
    /** deben - debes. Positivo = a favor. */
    balance: number;
    /** Total gastado en todos los grupos, en euros. */
    gastado: number;
    presupuestoTotal: number;
    disponible: number;
}

/** Suma la situacion de una persona a lo largo de todos sus grupos. */
export function resumenGlobal(grupos: Grupo[], yo = 'Tú'): ResumenGlobal {
    let deben = 0;
    let debes = 0;
    let gastado = 0;
    let presupuestoTotal = 0;

    for (const grupo of grupos) {
        for (const t of liquidar(grupo)) {
            if (grupo.miembros[t.de] === yo) debes += t.monto;
            if (grupo.miembros[t.a] === yo) deben += t.monto;
        }

        gastado += grupo.gastos.reduce((s, g) => s + aEuros(g.monto, g.divisa), 0);
        presupuestoTotal += grupo.presupuesto?.maximo ?? 0;
    }

    return {
        deben,
        debes,
        balance: deben - debes,
        gastado,
        presupuestoTotal,
        disponible: presupuestoTotal - gastado,
    };
}
