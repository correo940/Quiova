'use server';
// ─── Store de directrices por agente → Supabase ───────────────────────────────

import { supabaseAdmin } from '@/lib/supabase-admin';

export async function leerDirectrices(salaId: string, agente: string): Promise<string> {
    const { data } = await supabaseAdmin
        .from('oficina_directrices')
        .select('texto')
        .eq('sala_id', salaId)
        .eq('agente', agente)
        .maybeSingle();
    return data?.texto ?? '';
}

export async function guardarDirectrices(salaId: string, agente: string, texto: string): Promise<void> {
    await supabaseAdmin.from('oficina_directrices').upsert(
        { sala_id: salaId, agente, texto, updated_at: new Date().toISOString() },
        { onConflict: 'sala_id,agente' }
    );
}
