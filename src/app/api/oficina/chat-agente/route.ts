import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { getSala, agenteEnSala } from '@/app/apps/oficina/vista/salas-data';
import { leerDirectrices } from '@/app/apps/oficina/vista/directrices-store';
import { leerChat, guardarMensaje, limpiarChat } from '@/app/apps/oficina/vista/chat-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildSystemPrompt(nombre: string, rol: string, sala: string, directrices: string): string {
    return [
        `Eres ${nombre}, ${rol} en el departamento de ${sala} de Quioba.`,
        `Estás hablando directamente con don Juan, el fundador y Director General de Quioba. Él es quien te escribe ahora mismo.`,
        `Dirígete a él siempre como "don Juan". Nunca digas "Juan me pidió" ni hables de él en tercera persona — estás hablando CON él, no sobre él.`,
        `Tienes personalidad propia: eres proactivo, propones ideas, haces preguntas cuando necesitas claridad.`,
        `Puedes sugerir cosas de tu área aunque don Juan no las pida. Si ves una oportunidad, la mencionas.`,
        `Eres conversacional y natural — no eres un asistente genérico, eres ${nombre} de Quioba.`,
        `Cuando acordéis algo concreto, indícalo con "✅ Acordado:" seguido del entregable.`,
        `IMPORTANTE: Habla siempre en español de España. Nada de expresiones latinoamericanas ("qué onda", "órale", "ahorita", "chévere", etc.). Usa vocabulario y expresiones del español peninsular.`,
        ...(directrices ? [
            ``,
            `Tu forma de trabajar:`,
            directrices,
        ] : []),
    ].join('\n');
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const salaId = searchParams.get('salaId');
    const agente = searchParams.get('agente');
    if (!salaId || !agente) return NextResponse.json({ ok: false, error: 'Faltan params.' }, { status: 400 });
    const historial = await leerChat(salaId, agente);
    return NextResponse.json({ ok: true, historial });
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const salaId = searchParams.get('salaId');
    const agente = searchParams.get('agente');
    if (!salaId || !agente) return NextResponse.json({ ok: false, error: 'Faltan params.' }, { status: 400 });
    await limpiarChat(salaId, agente);
    return NextResponse.json({ ok: true });
}

interface Body { salaId?: string; agente?: string; mensaje?: string; }

export async function POST(req: Request) {
    let body: Body;
    try { body = await req.json(); } catch {
        return NextResponse.json({ ok: false, error: 'Body JSON inválido.' }, { status: 400 });
    }

    const { salaId, agente: nombreAgente, mensaje } = body;
    if (!salaId || !nombreAgente || !mensaje?.trim()) {
        return NextResponse.json({ ok: false, error: 'Faltan salaId, agente o mensaje.' }, { status: 400 });
    }

    const sala = getSala(salaId);
    const agente = sala ? agenteEnSala(salaId, nombreAgente) : null;
    if (!sala || !agente) return NextResponse.json({ ok: false, error: 'Agente desconocido.' }, { status: 400 });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ ok: false, error: 'GROQ_API_KEY no configurada.' }, { status: 500 });

    const directrices = await leerDirectrices(salaId, nombreAgente);
    const historialPrevio = await leerChat(salaId, nombreAgente);

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.55,
        max_tokens: 500,
        messages: [
            { role: 'system', content: buildSystemPrompt(nombreAgente, agente.rol, sala.nombre, directrices) },
            ...historialPrevio.slice(-16).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: mensaje },
        ],
    });

    const respuesta = completion.choices[0]?.message?.content ?? '(sin respuesta)';
    const ts = Date.now();

    await guardarMensaje(salaId, nombreAgente, { role: 'user', content: mensaje, ts });
    await guardarMensaje(salaId, nombreAgente, { role: 'assistant', content: respuesta, ts: ts + 1 });

    return NextResponse.json({ ok: true, respuesta });
}
