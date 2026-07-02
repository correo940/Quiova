import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SALAS } from '@/app/apps/oficina/vista/salas-data';
import { leerTablonPendiente } from '@/app/apps/oficina/vista/tablon-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── Helpers Telegram ─────────────────────────────────────────────────────────

async function sendMessage(chatId: number | string, text: string, extra: object = {}) {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
    });
}

async function sendTyping(chatId: number | string) {
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    });
}

// ── Candidatos (todos los agentes menos Coordinación) ────────────────────────

const AGENTES_DISPONIBLES = SALAS
    .flatMap(s => s.agentes.map(a => ({ salaId: s.id, salaNombre: s.nombre, agente: a.nombre, rol: a.rol })))
    .filter(a => a.agente !== 'Coordinación');

const TODOS_AGENTES = [
    { salaId: 'recepcion', salaNombre: 'Recepción', agente: 'Coordinación', rol: 'coordinador de la oficina' },
    ...AGENTES_DISPONIBLES,
];

// ── Sesión ───────────────────────────────────────────────────────────────────

async function getSesion(chatId: string) {
    const { data } = await supabaseAdmin
        .from('oficina_telegram_sesion')
        .select('sala_id, agente')
        .eq('chat_id', chatId)
        .maybeSingle();
    return data ?? { sala_id: 'recepcion', agente: 'Coordinación' };
}

async function setSesion(chatId: string, salaId: string, agente: string) {
    await supabaseAdmin.from('oficina_telegram_sesion').upsert(
        { chat_id: chatId, sala_id: salaId, agente, updated_at: new Date().toISOString() },
        { onConflict: 'chat_id' }
    );
}

// ── Historial ─────────────────────────────────────────────────────────────────

async function getHistorial(salaId: string, agente: string) {
    const { data } = await supabaseAdmin
        .from('oficina_chat')
        .select('role, content, ts')
        .eq('sala_id', `tg_${salaId}`)
        .eq('agente', agente)
        .order('ts', { ascending: true })
        .limit(20);
    return data ?? [];
}

async function guardarMensaje(salaId: string, agente: string, role: 'user' | 'assistant', content: string) {
    await supabaseAdmin.from('oficina_chat').insert({
        sala_id: `tg_${salaId}`,
        agente,
        role,
        content,
        ts: Date.now(),
    });
}

// ── System prompt ─────────────────────────────────────────────────────────────

async function buildSystemPrompt(salaId: string, agente: string, salaNombre: string, rol: string): Promise<string> {
    const { data } = await supabaseAdmin
        .from('oficina_directrices')
        .select('texto')
        .eq('sala_id', salaId)
        .eq('agente', agente)
        .maybeSingle();
    const directrices = data?.texto ?? '';
    const pendientes = await leerTablonPendiente(salaId);
    const tablon = pendientes.map(p => `- ${p.texto}`).join('\n');

    return [
        `Eres ${agente}, ${rol} en el departamento de ${salaNombre} de Quioba.`,
        `Estás hablando directamente con don Juan por Telegram. Él es el fundador y Director General.`,
        `Dirígete a él siempre como "don Juan". Eres proactivo, natural y directo.`,
        `Puedes sugerir cosas de tu área aunque don Juan no las pida.`,
        `REGLA ABSOLUTA: nunca inventes reuniones, tareas, plazos, decisiones ni datos que don Juan no te haya dicho en esta conversación o que no consten en tus directrices. No tienes acceso a su agenda. Si no lo sabes, dilo.`,
        `Cuando acordéis algo concreto, indícalo con "✅ Acordado:" seguido del entregable.`,
        `Responde en español de España. Sin expresiones latinoamericanas.`,
        `Respuestas cortas y directas — estamos en Telegram, no en un documento.`,
        ...(directrices ? [`\nTu forma de trabajar:\n${directrices}`] : []),
        ...(tablon ? [`\nTablón — lo único pendiente que sabes, registrado por don Juan:\n${tablon}`] : []),
    ].join('\n');
}

// ── Keyboard de agentes ───────────────────────────────────────────────────────

function teclado() {
    const filas = [];
    for (let i = 0; i < TODOS_AGENTES.length; i += 2) {
        filas.push(TODOS_AGENTES.slice(i, i + 2).map(a => ({
            text: `${a.agente} (${a.salaNombre})`,
            callback_data: `agente:${a.salaId}:${a.agente}`,
        })));
    }
    return { inline_keyboard: filas };
}

// ── Respuesta del agente ──────────────────────────────────────────────────────

async function responderAgente(chatId: string, texto: string, salaId: string, agente: string, salaNombre: string, rol: string) {
    await sendTyping(chatId);
    const historial = await getHistorial(salaId, agente);
    const system = await buildSystemPrompt(salaId, agente, salaNombre, rol);

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.55,
        max_tokens: 400,
        messages: [
            { role: 'system', content: system },
            ...historial.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            { role: 'user', content: texto },
        ],
    });

    const respuesta = completion.choices[0]?.message?.content ?? '(sin respuesta)';
    await guardarMensaje(salaId, agente, 'user', texto);
    await guardarMensaje(salaId, agente, 'assistant', respuesta);
    await sendMessage(chatId, `<b>${agente}:</b>\n${respuesta}`);
}

// ── Webhook ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    const update = await req.json().catch(() => null);
    if (!update) return NextResponse.json({ ok: true });

    // Mensaje de texto
    const msg = update.message;
    const cb = update.callback_query;

    if (cb) {
        // Selección de agente por teclado
        const chatId = String(cb.message?.chat?.id ?? '');
        if (cb.data?.startsWith('agente:')) {
            const [, salaId, agente] = cb.data.split(':');
            const info = TODOS_AGENTES.find(a => a.salaId === salaId && a.agente === agente);
            if (info) {
                await setSesion(chatId, salaId, agente);
                await sendMessage(chatId, `Ahora estás hablando con <b>${agente}</b> (${info.salaNombre}).\n\n¿Qué le dices?`);
            }
        }
        // Confirmar callback
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cb.id }),
        });
        return NextResponse.json({ ok: true });
    }

    if (!msg?.text) return NextResponse.json({ ok: true });

    const chatId = String(msg.chat.id);
    const texto = msg.text.trim();

    // /start
    if (texto === '/start') {
        await sendMessage(chatId,
            `👋 Bienvenido a <b>La Oficina de Quioba</b>, don Juan.\n\nElige con quién quieres hablar o escríbeme directamente — por defecto hablo yo, Coordinación.`,
            { reply_markup: teclado() }
        );
        return NextResponse.json({ ok: true });
    }

    // /agentes
    if (texto === '/agentes') {
        await sendMessage(chatId, '¿Con quién quieres hablar?', { reply_markup: teclado() });
        return NextResponse.json({ ok: true });
    }

    // /limpiar
    if (texto === '/limpiar') {
        const sesion = await getSesion(chatId);
        await supabaseAdmin.from('oficina_chat')
            .delete()
            .eq('sala_id', `tg_${sesion.sala_id}`)
            .eq('agente', sesion.agente);
        await sendMessage(chatId, `Conversación con ${sesion.agente} limpiada. ✓`);
        return NextResponse.json({ ok: true });
    }

    // Mensaje normal → responde el agente activo
    const sesion = await getSesion(chatId);
    const info = TODOS_AGENTES.find(a => a.salaId === sesion.sala_id && a.agente === sesion.agente)
        ?? TODOS_AGENTES[0];

    await responderAgente(chatId, texto, info.salaId, info.agente, info.salaNombre, info.rol);
    return NextResponse.json({ ok: true });
}
