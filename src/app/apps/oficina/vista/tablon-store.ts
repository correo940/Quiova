'use server';
// ─── Store del tablón de tareas → Supabase ───────────────────────────────────

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface ItemTablon {
    id: string;
    texto: string;
    departamento: string; // salaId o 'general'
    estado: 'pendiente' | 'hecho';
    created_at: string;
}

export async function leerTablon(): Promise<ItemTablon[]> {
    const { data } = await supabaseAdmin
        .from('oficina_tablon')
        .select('id, texto, departamento, estado, created_at')
        .order('created_at', { ascending: false });
    return (data ?? []) as ItemTablon[];
}

export async function leerTablonPendiente(departamento: string): Promise<ItemTablon[]> {
    const { data } = await supabaseAdmin
        .from('oficina_tablon')
        .select('id, texto, departamento, estado, created_at')
        .eq('estado', 'pendiente')
        .in('departamento', [departamento, 'general'])
        .order('created_at', { ascending: true });
    return (data ?? []) as ItemTablon[];
}

export async function crearItemTablon(texto: string, departamento: string): Promise<void> {
    await supabaseAdmin.from('oficina_tablon').insert({ texto, departamento });
}

export async function marcarItemTablon(id: string, estado: 'pendiente' | 'hecho'): Promise<void> {
    await supabaseAdmin.from('oficina_tablon').update({ estado }).eq('id', id);
}
