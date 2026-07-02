'use server';
// ─── Store de chat por agente → Supabase ─────────────────────────────────────

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface MensajeChat {
    role: 'user' | 'assistant';
    content: string;
    ts: number;
}

const MAX_MENSAJES = 60;

export async function leerChat(salaId: string, agente: string): Promise<MensajeChat[]> {
    const { data } = await supabaseAdmin
        .from('oficina_chat')
        .select('role, content, ts')
        .eq('sala_id', salaId)
        .eq('agente', agente)
        .order('ts', { ascending: true })
        .limit(MAX_MENSAJES);
    return (data ?? []) as MensajeChat[];
}

export async function guardarMensaje(salaId: string, agente: string, mensaje: MensajeChat): Promise<void> {
    await supabaseAdmin.from('oficina_chat').insert({
        sala_id: salaId,
        agente,
        role: mensaje.role,
        content: mensaje.content,
        ts: mensaje.ts,
    });
}

export async function limpiarChat(salaId: string, agente: string): Promise<void> {
    await supabaseAdmin
        .from('oficina_chat')
        .delete()
        .eq('sala_id', salaId)
        .eq('agente', agente);
}
