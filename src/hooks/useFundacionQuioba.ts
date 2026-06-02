'use client';

import { useState, useEffect } from 'react';
import type { FundacionQuioba } from '@/config/oficina/fundacion-schema';

const STORAGE_KEY = 'quioba_fundacion_v1';

function cargar(): FundacionQuioba | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as FundacionQuioba) : null;
    } catch {
        return null;
    }
}

export function useFundacionQuioba() {
    const [fundacion, setFundacion] = useState<FundacionQuioba | null>(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        setFundacion(cargar());
        setCargando(false);
    }, []);

    const guardar = (datos: FundacionQuioba) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
        setFundacion(datos);
    };

    const saltar = () => {
        const datos: FundacionQuioba = {
            ...(fundacion ?? {
                version: 1,
                completada: false,
                faseProducto: 'funcional',
                descripcionEstado: '',
                usuariosReales: 0,
                descripcionUsuarios: '',
                estadoMonetizacion: 'no-definida',
                descripcionMonetizacion: '',
                horasSemanales: 20,
                appsActivas: [],
                trimestreLabel: 'Q2 2026',
                prioridad1: '',
                prioridad2: '',
                prioridad3: '',
            }),
            saltada: true,
            fechaISO: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
        setFundacion(datos);
    };

    const resetear = () => {
        localStorage.removeItem(STORAGE_KEY);
        setFundacion(null);
    };

    return { fundacion, cargando, guardar, saltar, resetear };
}
