import { expect, test } from '@playwright/test';
import {
    flujoRecurrente, progresoObjetivo, totalAhorradoEnObjetivos,
    totalEnCuentas, totalRecurrente,
} from '../../src/lib/ahorros/calculos';

/**
 * Cifras de dinero que el usuario lee y se cree. Un fallo aqui no da error:
 * muestra un numero equivocado, que es peor.
 */

test('suma el saldo de todas las cuentas', () => {
    expect(totalEnCuentas([
        { current_balance: 1000 },
        { current_balance: 250.5 },
    ])).toBeCloseTo(1250.5, 2);
});

test('deja fuera las cuentas que el usuario excluyo del total', () => {
    expect(totalEnCuentas([
        { current_balance: 1000 },
        { current_balance: 5000, include_in_total: false },
    ])).toBe(1000);
});

test('una cuenta sin la marca cuenta como incluida', () => {
    // Es lo que hacia el codigo original: solo excluye si es exactamente false.
    expect(totalEnCuentas([{ current_balance: 300 }])).toBe(300);
    expect(totalEnCuentas([{ current_balance: 300, include_in_total: true }])).toBe(300);
});

test('un saldo ausente no convierte el total en NaN', () => {
    expect(totalEnCuentas([
        { current_balance: 100 },
        { current_balance: undefined as unknown as number },
    ])).toBe(100);
});

test('sin cuentas el total es cero, no NaN', () => {
    expect(totalEnCuentas([])).toBe(0);
});

test('separa ingresos de gastos recurrentes', () => {
    const items = [
        { amount: 1800, type: 'income' as const },
        { amount: 700, type: 'expense' as const },
        { amount: 45, type: 'expense' as const },
    ];
    expect(totalRecurrente(items, 'income')).toBe(1800);
    expect(totalRecurrente(items, 'expense')).toBe(745);
});

test('el flujo mensual es lo que entra menos lo que sale', () => {
    const r = flujoRecurrente([
        { amount: 2000, type: 'income' },
        { amount: 1200, type: 'expense' },
    ]);
    expect(r).toEqual({ ingresos: 2000, gastos: 1200, flujo: 800 });
});

test('el flujo es negativo cuando se va mas de lo que entra', () => {
    const r = flujoRecurrente([
        { amount: 900, type: 'income' },
        { amount: 1500, type: 'expense' },
    ]);
    expect(r.flujo).toBe(-600);
});

test('sin movimientos recurrentes el flujo es cero', () => {
    expect(flujoRecurrente([])).toEqual({ ingresos: 0, gastos: 0, flujo: 0 });
});

test('suma lo ahorrado entre todos los objetivos', () => {
    expect(totalAhorradoEnObjetivos([
        { current_amount: 500, target_amount: 1000 },
        { current_amount: 250, target_amount: 300 },
        { target_amount: 800 },
    ])).toBe(750);
});

test('el progreso de un objetivo va de 0 a 100', () => {
    expect(progresoObjetivo({ current_amount: 500, target_amount: 1000 })).toBe(50);
    expect(progresoObjetivo({ current_amount: 0, target_amount: 1000 })).toBe(0);
});

test('pasarse de la meta no da mas del 100 por ciento', () => {
    expect(progresoObjetivo({ current_amount: 1500, target_amount: 1000 })).toBe(100);
});

test('un objetivo sin meta no divide entre cero', () => {
    expect(progresoObjetivo({ current_amount: 500, target_amount: 0 })).toBe(0);
    expect(progresoObjetivo({ current_amount: 500 })).toBe(0);
});
