'use client';

import { useState } from 'react';
import type { AccionEstructurada, CrearExpedienteConDecisionFn } from '@/lib/oficina/registrar';

export function useRegistrar(
    directorId: string,
    crearExpedienteConDecision: CrearExpedienteConDecisionFn,
) {
    const [estructurando, setEstructurando] = useState(false);
    const [accionPendiente, setAccionPendiente] = useState<AccionEstructurada | null>(null);

    const handleRegistrar = async (contenido: string, contexto: Record<string, unknown>) => {
        setEstructurando(true);
        setAccionPendiente(null);
        try {
            const res = await fetch('/api/oficina/estructurar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensaje: contenido, contexto, directorId }),
            });
            const data: AccionEstructurada = await res.json();
            if (data.expediente && Array.isArray(data.tareas)) {
                setAccionPendiente(data);
            }
        } catch {
            // fail silently — usuario puede reintentar
        } finally {
            setEstructurando(false);
        }
    };

    const confirmarAccion = () => {
        if (!accionPendiente) return;
        crearExpedienteConDecision(
            {
                titulo: accionPendiente.expediente.titulo,
                resumen: accionPendiente.expediente.resumen,
                directorRevisor: directorId,
                conversacionOriginal: '',
            },
            accionPendiente.decision,
            accionPendiente.objetivo,
            accionPendiente.tareas,
        );
        setAccionPendiente(null);
    };

    return {
        handleRegistrar,
        estructurando,
        accionPendiente,
        confirmarAccion,
        cancelarAccion: () => setAccionPendiente(null),
    };
}
