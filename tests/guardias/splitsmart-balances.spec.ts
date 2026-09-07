import { expect, test } from '@playwright/test';
import { aEuros, liquidar, pagadoPorMiembro, resumenGlobal, type Grupo } from '../../src/lib/splitsmart/balances';

/**
 * Estas cuentas deciden quien le debe dinero a quien. Un fallo aqui no da un
 * error en pantalla: da una cifra equivocada, que es peor.
 */

const grupo = (miembros: string[], gastos: Grupo['gastos'], maximo = 0): Grupo => ({
    miembros, gastos, presupuesto: { maximo },
});

const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

test('sin gastos no hay nada que saldar', () => {
    expect(liquidar(grupo(['Ana', 'Luis'], []))).toEqual([]);
});

test('un grupo vacio no revienta', () => {
    expect(liquidar(grupo([], []))).toEqual([]);
});

test('si paga uno, el otro le debe la mitad', () => {
    const t = liquidar(grupo(['Ana', 'Luis'], [{ pagador: 0, monto: 100, divisa: 'EUR' }]));
    expect(t).toEqual([{ de: 1, a: 0, monto: 50 }]);
});

test('si todos ponen lo mismo, nadie debe nada', () => {
    const t = liquidar(grupo(['Ana', 'Luis', 'Eva'], [
        { pagador: 0, monto: 30, divisa: 'EUR' },
        { pagador: 1, monto: 30, divisa: 'EUR' },
        { pagador: 2, monto: 30, divisa: 'EUR' },
    ]));
    expect(t).toEqual([]);
});

test('con tres personas bastan dos transferencias', () => {
    const t = liquidar(grupo(['Ana', 'Luis', 'Eva'], [
        { pagador: 0, monto: 90, divisa: 'EUR' },
    ]));
    expect(t).toHaveLength(2);
    expect(suma(t.map((x) => x.monto))).toBeCloseTo(60, 2);
    // Los dos que no pagaron le deben a Ana.
    expect(t.every((x) => x.a === 0)).toBe(true);
});

test('lo que sale de unos es exactamente lo que entra a otros', () => {
    const g = grupo(['Ana', 'Luis', 'Eva', 'Marc'], [
        { pagador: 0, monto: 120, divisa: 'EUR' },
        { pagador: 1, monto: 40, divisa: 'EUR' },
        { pagador: 3, monto: 8, divisa: 'EUR' },
    ]);

    const t = liquidar(g);
    const neto = new Array(4).fill(0);
    for (const x of t) { neto[x.de] -= x.monto; neto[x.a] += x.monto; }

    const pagado = pagadoPorMiembro(g);
    const media = suma(pagado) / 4;
    // Tras liquidar, cada uno acaba habiendo puesto la media.
    pagado.forEach((p, i) => expect(p - neto[i]).toBeCloseTo(media, 1));
});

test('nadie hace ni recibe transferencias negativas', () => {
    const t = liquidar(grupo(['Ana', 'Luis', 'Eva'], [
        { pagador: 0, monto: 55.55, divisa: 'EUR' },
        { pagador: 2, monto: 13.31, divisa: 'EUR' },
    ]));
    expect(t.every((x) => x.monto > 0)).toBe(true);
    expect(t.every((x) => x.de !== x.a)).toBe(true);
});

test('convierte divisas a euros antes de repartir', () => {
    // 108 USD a 1,08 por euro son 100 euros.
    expect(aEuros(108, 'USD')).toBeCloseTo(100, 6);
    expect(aEuros(163, 'JPY')).toBeCloseTo(1, 6);
    // Una divisa que no conocemos se toma como euros en vez de dar NaN.
    expect(aEuros(50, 'CHF')).toBe(50);
});

test('un gasto en dolares se reparte por su valor en euros', () => {
    const t = liquidar(grupo(['Ana', 'Luis'], [{ pagador: 0, monto: 108, divisa: 'USD' }]));
    expect(t).toEqual([{ de: 1, a: 0, monto: 50 }]);
});

test('un gasto de alguien que ya no esta en el grupo no rompe el calculo', () => {
    const g = grupo(['Ana', 'Luis'], [
        { pagador: 0, monto: 100, divisa: 'EUR' },
        { pagador: 7, monto: 40, divisa: 'EUR' }, // indice inexistente
    ]);
    expect(() => liquidar(g)).not.toThrow();
    expect(pagadoPorMiembro(g)).toEqual([100, 0]);
});

test('el resumen global suma lo que debes y lo que te deben', () => {
    const r = resumenGlobal([
        grupo(['Tú', 'Luis'], [{ pagador: 0, monto: 100, divisa: 'EUR' }], 200),  // te deben 50
        grupo(['Tú', 'Eva'], [{ pagador: 1, monto: 60, divisa: 'EUR' }], 100),    // debes 30
    ]);

    expect(r.deben).toBeCloseTo(50, 2);
    expect(r.debes).toBeCloseTo(30, 2);
    expect(r.balance).toBeCloseTo(20, 2);
    expect(r.gastado).toBeCloseTo(160, 2);
    expect(r.presupuestoTotal).toBe(300);
    expect(r.disponible).toBeCloseTo(140, 2);
});
