'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'quioba_historial_contenido_v1';

export type CategoriaHistorial = 'quioba' | 'cuerpo' | 'mente' | 'finanzas' | 'general';
export type ObjetivoHistorial  = 'alcance' | 'captacion' | 'marca' | 'conversion';

export interface EntradaHistorial {
    id: string;
    fechaISO: string;
    consulta: string;
    briefing: string;
    respuesta: string;
    categoria: CategoriaHistorial;
    objetivo: ObjetivoHistorial;
}

function detectarCategoria(consulta: string): CategoriaHistorial {
    const q = consulta.toLowerCase();
    if (/cuerpo|ejercicio|pausa|activ|sedentari|estiram|rutina|movimiento/.test(q)) return 'cuerpo';
    if (/mente|meditac|estrés|estres|ansied|foco|concentr|mental|adhd|respirac|circadian|sueño/.test(q)) return 'mente';
    if (/finanz|dinero|ahorro|presupuesto|gasto|ingreso|deuda|invers/.test(q)) return 'finanzas';
    if (/quioba|campus|plataforma|organiz|productividad|app/.test(q)) return 'quioba';
    return 'general';
}

function detectarObjetivo(consulta: string): ObjetivoHistorial {
    const q = consulta.toLowerCase();
    if (/guion|escribi|redact|script/.test(q)) return 'marca';
    if (/conviert|vend|descarg|regístr|registr/.test(q)) return 'conversion';
    if (/captac|captar|usuario|descubr/.test(q)) return 'captacion';
    return 'alcance';
}

function cargar(): EntradaHistorial[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as EntradaHistorial[]) : [];
    } catch {
        return [];
    }
}

function persistir(entradas: EntradaHistorial[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entradas));
}

export function useHistorialContenido() {
    const [historial, setHistorial] = useState<EntradaHistorial[]>([]);

    useEffect(() => {
        setHistorial(cargar());
    }, []);

    const guardar = (datos: { consulta: string; briefing: string; respuesta: string }) => {
        const nueva: EntradaHistorial = {
            id: `${Date.now()}`,
            fechaISO: new Date().toISOString(),
            consulta: datos.consulta,
            briefing: datos.briefing,
            respuesta: datos.respuesta,
            categoria: detectarCategoria(datos.consulta),
            objetivo:  detectarObjetivo(datos.consulta),
        };
        const actualizado = [nueva, ...historial];
        setHistorial(actualizado);
        persistir(actualizado);
    };

    const eliminar = (id: string) => {
        const actualizado = historial.filter(e => e.id !== id);
        setHistorial(actualizado);
        persistir(actualizado);
    };

    return { historial, guardar, eliminar };
}
