import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ─── Intent Classifier ───────────────────────────────────────────────────────
// Cada regla puede coincidir múltiples veces para el mismo intent (señales acumuladas).
// Las señales de hipoteca cubren tanto términos explícitos como consultas naturales.
const INTENT_RULES: { re: RegExp; intent: string; modules: string[] }[] = [
  // Hipoteca — señales explícitas de dominio
  { re: /hipoteca|préstamo hipotecario|prestamo hipotecario|euribor|tin\b|tae\b|revisión.{0,10}tipo|revision.{0,10}tipo/i,
    intent: 'mortgage', modules: ['mortgages'] },
  // Hipoteca — lenguaje natural sobre deuda/saldo pendiente
  { re: /deuda|cu[aá]nto.*debo|debo.*cu[aá]nto|cu[aá]nto.*queda|queda.*pagar|pendiente.*pago|pago.*pendiente|cuota mensual/i,
    intent: 'mortgage', modules: ['mortgages'] },
  // Seguros
  { re: /seguro|póliza|poliza|aseguradora|cobertura|prima anual/i,
    intent: 'insurance', modules: ['insurance'] },
  // Suministros — cubre términos explícitos + lenguaje natural sobre compañía/tarifa/renovación/potencia
  { re: /\bluz\b|el[eé]ctric\w*|kwh|\bagua\b|\bgas\b|internet|fibra|\bwifi\b|\btarifa\b|proveedor|renovaci[oó]n|renueva|potencia\s+contratada|\bpotencia\b|suministro|telefon[ií]a\s+m[oó]vil|tarifa\s+m[oó]vil|contrato.{0,15}(luz|agua|gas|internet|movil|móvil|el[eé]ctric\w*|suministro)/i,
    intent: 'utilities', modules: ['utilities'] },
  // Finanzas generales
  { re: /dinero|saldo|gast|ahorro|finanz|€|cuenta.{0,15}banc|presupuesto|patrimonio/i,
    intent: 'finance', modules: ['finance'] },
  // Tareas
  { re: /tarea|pendiente|todo|que hacer|completar|urgente|recordatorio/i,
    intent: 'tasks', modules: ['tasks'] },
  // Compra
  { re: /compr|mercado|supermercado|lista de la compra/i,
    intent: 'shopping', modules: ['shopping'] },
  // Medicación
  { re: /medicin|pastilla|fármaco|medicación|dosis/i,
    intent: 'medicines', modules: ['medicines'] },
  // Turnos
  { re: /turno|jornada|guardia|horario laboral/i,
    intent: 'shifts', modules: ['shifts'] },
  // Manuales
  { re: /manual|avería|instrucción|mantenimiento|cómo funciona/i,
    intent: 'manuals', modules: ['manuals'] },
  // Contraseñas
  { re: /contraseña|password|bóveda|clave|acceso/i,
    intent: 'passwords', modules: ['passwords'] },
  // Sync diario
  { re: /sync|victoria|logro|cómo ha ido|balance.{0,10}día|resumen.{0,10}día/i,
    intent: 'sync', modules: ['sync'] },
  // Conocimiento personalizado
  { re: /conocimiento|aprendido|enseñado|recuerdas|ya sé|ya sabes/i,
    intent: 'knowledge', modules: ['knowledge'] },
];

function classifyIntent(msg: string): { primary: string; modules: Set<string> } {
  const lower = msg.toLowerCase();
  const scores: Record<string, number> = {};
  const modules = new Set<string>();

  for (const rule of INTENT_RULES) {
    if (rule.re.test(lower)) {
      scores[rule.intent] = (scores[rule.intent] || 0) + 1;
      rule.modules.forEach(m => modules.add(m));
    }
  }

  if (modules.size === 0) {
    // Consulta general → contexto base
    ['tasks', 'finance', 'sync'].forEach(m => modules.add(m));
  }

  const primary = Object.entries(scores).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'general';
  return { primary, modules };
}

// ─── Context Packer ──────────────────────────────────────────────────────────
// Presupuesto de 4000 tokens para el contexto de datos.
// Estimación rápida: 1 token ≈ 4 chars. Sin dependencia externa.
const CHARS_PER_TOKEN = 4;
const CONTEXT_BUDGET_TOKENS = 4000;

interface ContextPart {
  text: string;
  priority: number; // 1 = máxima prioridad; se descarta de mayor a menor número
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function packContext(parts: ContextPart[]): string {
  const sorted = [...parts].sort((a, b) => a.priority - b.priority);
  const selected: string[] = [];
  let used = 0;

  for (const part of sorted) {
    const cost = estimateTokens(part.text);
    if (used + cost <= CONTEXT_BUDGET_TOKENS) {
      selected.push(part.text);
      used += cost;
    } else {
      // Intentar caber una versión truncada si quedan al menos 200 tokens
      const remaining = (CONTEXT_BUDGET_TOKENS - used) * CHARS_PER_TOKEN;
      if (remaining > 200) {
        selected.push(part.text.slice(0, remaining) + '[…]');
      }
      break;
    }
  }

  console.log(`[CTX] tokens estimados: ${used}/${CONTEXT_BUDGET_TOKENS} | partes: ${selected.length}/${sorted.length}`);
  return selected.join(' || ');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { messages, userId, secretarySettings, todaySyncStatus } = body as {
      messages: Message[];
      userId: string;
      secretarySettings?: any;
      todaySyncStatus?: any;
    };

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return NextResponse.json({ error: 'Falta GROQ_API_KEY' }, { status: 500 });
    if (!userId) return NextResponse.json({ error: 'Falta userId' }, { status: 400 });

    const lastUserMsg = messages.findLast(m => m.role === 'user')?.content || '';
    const { primary, modules: needed } = classifyIntent(lastUserMsg);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const today = new Date().toISOString().split('T')[0];

    // ── Queries paralelas — solo módulos activados ──────────────────────────
    const queries: any[] = [];
    const queryKeys: string[] = [];

    if (needed.has('tasks')) {
      queries.push(supabase.from('tasks').select('title,due_date').eq('user_id', userId).eq('is_completed', false).limit(5));
      queryKeys.push('tasks');
    }
    if (needed.has('shopping')) {
      queries.push(supabase.from('shopping_items').select('name,quantity').eq('user_id', userId).eq('is_checked', false).limit(8));
      queryKeys.push('shopping');
    }
    if (needed.has('finance')) {
      queries.push(supabase.from('savings_accounts').select('name,current_balance').eq('user_id', userId));
      queries.push(supabase.from('expenses').select('title,amount').eq('user_id', userId).gte('date', `${today.substring(0, 7)}-01`).order('date', { ascending: false }).limit(3));
      queryKeys.push('savings', 'expenses');
    }
    if (needed.has('shifts')) {
      queries.push(supabase.from('work_shifts').select('title,start_time,end_time').eq('user_id', userId).gte('start_time', today).limit(3));
      queryKeys.push('shifts');
    }
    if (needed.has('medicines')) {
      queries.push(supabase.from('medicines').select('name,dosage,frequency').eq('user_id', userId).limit(5));
      queryKeys.push('medicines');
    }
    if (needed.has('manuals')) {
      // Solo título y categoría — sin content (era la mayor fuente de overflow de tokens)
      queries.push(supabase.from('manuals').select('title,category').eq('user_id', userId).limit(5));
      queryKeys.push('manuals');
    }
    if (needed.has('passwords')) {
      queries.push(supabase.from('passwords').select('id,name').eq('user_id', userId));
      queryKeys.push('passwords');
    }
    if (needed.has('sync') && !todaySyncStatus) {
      queries.push(supabase.from('secretary_syncs').select('completed_at,victories').eq('user_id', userId).eq('sync_date', today).maybeSingle());
      queryKeys.push('sync');
    }
    if (needed.has('mortgages')) {
      queries.push(supabase.from('v_mortgages').select('name,lender,monthly_payment,outstanding_balance,tin,tae,rate_type,reference_index,rate_review_date,maturity_date').eq('user_id', userId));
      queryKeys.push('mortgages');
    }
    if (needed.has('insurance')) {
      queries.push(supabase.from('v_insurance_policies').select('name,provider,cost,expiration_date,policy_number').eq('user_id', userId).order('expiration_date', { ascending: true }));
      queryKeys.push('insurance');
    }
    if (needed.has('utilities')) {
      queries.push(supabase.from('v_utility_contracts').select('name,utility_type,provider,monthly_cost,tariff,contracted_power_kw,renewal_date').eq('user_id', userId).order('utility_type'));
      queryKeys.push('utilities');
    }

    const results = await Promise.all(queries);
    const dataMap: Record<string, any> = {};
    queryKeys.forEach((key, i) => { dataMap[key] = results[i]?.data; });

    if (needed.has('sync') && !todaySyncStatus && dataMap['sync']) {
      todaySyncStatus = dataMap['sync'];
    }

    // ── Conocimiento — solo cuando relevante; contenido truncado en origen ──
    // Truncación: ai_knowledge → 250 chars/entrada; ai_global_knowledge → 150 chars/entrada
    let knowledge: { title: string; content: string }[] = [];
    let globalKnowledge: { title: string; content: string; category?: string }[] = [];

    if (needed.has('knowledge') || needed.size <= 3) {
      try {
        const { data } = await supabase.from('ai_knowledge').select('title,content').eq('user_id', userId).order('created_at', { ascending: false }).limit(4);
        knowledge = (data || []).map((k: any) => ({ ...k, content: (k.content ?? '').slice(0, 250) }));
      } catch { /* tabla no existe */ }

      try {
        const { data } = await supabase.from('ai_global_knowledge').select('title,content,category').order('created_at', { ascending: false }).limit(5);
        globalKnowledge = (data || []).map((k: any) => ({ ...k, content: (k.content ?? '').slice(0, 150) }));
      } catch { /* tabla no existe */ }
    }

    // ── Context Packer ──────────────────────────────────────────────────────
    const personality = secretarySettings?.personality || 'friendly';
    const traitsMap: Record<string, string> = {
      formal: 'Profesional y elegante. Sin exceso de emojis.',
      friendly: 'Amable, cercana. Usa emojis. Tono informal.',
      sergeant: 'Directa, breve, autoritaria. Sin rodeos.',
    };
    const trait = traitsMap[personality] || traitsMap.friendly;

    const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    const syncStr = todaySyncStatus
      ? `Sync:${todaySyncStatus.completed_at ? '✅' : '🌙'}${todaySyncStatus.victories?.length ? ` victorias:${todaySyncStatus.victories.join('/')}` : ''}`
      : 'Sync:🌙pendiente';

    // Prioridades: 1=siempre incluido, 2=intent principal, 4=intent secundario,
    //              6=conocimiento usuario, 7=conocimiento global
    const parts: ContextPart[] = [];

    parts.push({ priority: 1, text: `HOY:${dateStr} ${syncStr}` });

    const p = (isPrimary: boolean) => isPrimary ? 2 : 4;

    if (needed.has('finance')) {
      const bal = (dataMap['savings'] as any[] || []).reduce((s: number, a: any) => s + (a.current_balance || 0), 0);
      const spent = (dataMap['expenses'] as any[] || []).reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const lastExp = (dataMap['expenses'] as any[] || []).slice(0, 3).map((e: any) => `${e.title}:${e.amount}€`).join(',');
      parts.push({ priority: p(primary === 'finance'), text: `FINANZAS:saldo=${bal.toFixed(0)}€ mes=${spent.toFixed(0)}€${lastExp ? ` últimos:${lastExp}` : ''}` });
    }

    if (needed.has('tasks')) {
      const t = (dataMap['tasks'] as any[] || []);
      parts.push({ priority: p(primary === 'tasks'), text: t.length ? `TAREAS(${t.length}):${t.map((x: any) => x.title + (x.due_date ? `[${x.due_date.slice(0, 10)}]` : '')).join('|')}` : 'TAREAS:ninguna' });
    }

    if (needed.has('shopping')) {
      const s = (dataMap['shopping'] as any[] || []);
      parts.push({ priority: p(primary === 'shopping'), text: s.length ? `COMPRA(${s.length}):${s.map((x: any) => x.name + (x.quantity ? `×${x.quantity}` : '')).join('|')}` : 'COMPRA:vacía' });
    }

    if (needed.has('shifts')) {
      const sh = (dataMap['shifts'] as any[] || []);
      if (sh.length) parts.push({ priority: p(primary === 'shifts'), text: `TURNOS:${sh.map((x: any) => { const d = new Date(x.start_time); return `${x.title} ${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} ${d.getHours()}h`; }).join('|')}` });
    }

    if (needed.has('medicines')) {
      const m = (dataMap['medicines'] as any[] || []);
      if (m.length) parts.push({ priority: p(primary === 'medicines'), text: `MED:${m.map((x: any) => x.name + (x.dosage ? ` ${x.dosage}` : '')).join('|')}` });
    }

    if (needed.has('manuals')) {
      const mn = (dataMap['manuals'] as any[] || []);
      if (mn.length) parts.push({ priority: p(primary === 'manuals'), text: `MANUALES:${mn.map((x: any) => `${x.title}(${x.category || '?'})`).join('|')}` });
    }

    if (needed.has('passwords')) {
      const pw = (dataMap['passwords'] as any[] || []);
      if (pw.length) parts.push({ priority: p(primary === 'passwords'), text: `CLAVES:${pw.map((x: any) => `${x.name}(ID:${x.id})`).join('|')}` });
    }

    if (needed.has('mortgages')) {
      const ms = (dataMap['mortgages'] as any[] || []);
      parts.push({
        priority: p(primary === 'mortgage'),
        text: ms.length
          ? `HIPOTECAS(${ms.length}):` + ms.map((m: any) =>
              `${m.name || 'Hipoteca'}/${m.lender || '?'} cuota:${m.monthly_payment ?? '?'}€ pendiente:${m.outstanding_balance ?? '?'}€ TIN:${m.tin ?? '?'} TAE:${m.tae ?? '?'} tipo:${m.rate_type ?? '?'} índice:${m.reference_index ?? '?'} revisión:${m.rate_review_date ?? 'sin fecha'} vence:${m.maturity_date ?? '?'}`
            ).join(' | ')
          : 'HIPOTECAS:ninguna registrada',
      });
    }

    if (needed.has('insurance')) {
      const ins = (dataMap['insurance'] as any[] || []);
      parts.push({
        priority: p(primary === 'insurance'),
        text: ins.length
          ? `SEGUROS(${ins.length}):` + ins.map((i: any) =>
              `${i.name || 'Seguro'}/${i.provider || '?'} coste:${i.cost ?? '?'}€/año vence:${i.expiration_date ?? '?'} nº:${i.policy_number ?? '?'}`
            ).join(' | ')
          : 'SEGUROS:ninguno registrado',
      });
    }

    if (needed.has('utilities')) {
      const utils = (dataMap['utilities'] as any[] || []);
      if (utils.length) {
        const total = utils.reduce((s: number, u: any) => s + (Number(u.monthly_cost) || 0), 0);
        parts.push({
          priority: p(primary === 'utilities'),
          text: `SUMINISTROS(${utils.length}) total:${total.toFixed(0)}€/mes | ` +
            utils.map((u: any) =>
              `${u.name || u.utility_type || '?'}/${u.provider || '?'} ${u.monthly_cost ?? '?'}€/mes tarifa:${u.tariff || '?'}${u.contracted_power_kw ? ` potencia:${u.contracted_power_kw}kW` : ''} renueva:${u.renewal_date || '?'}`
            ).join(' | '),
        });
      } else {
        parts.push({ priority: p(primary === 'utilities'), text: 'SUMINISTROS:ninguno registrado' });
      }
    }

    // Conocimiento usuario (prioridad 6 — se descarta antes que datos operativos)
    if (knowledge.length > 0) {
      parts.push({ priority: 6, text: `SABE:\n${knowledge.map(k => `[${k.title}]: ${k.content}`).join('\n---\n')}` });
    }

    // Conocimiento global (prioridad 7 — se descarta primero en overflow)
    if (globalKnowledge.length > 0) {
      parts.push({ priority: 7, text: `INFO_QUIOBA:\n${globalKnowledge.map(k => `[${k.title}]: ${k.content}`).join('\n---\n')}` });
    }

    const contextStr = packContext(parts);

    const systemPrompt = `Eres Quioba, asistente personal IA. Responde SIEMPRE con JSON válido. ${trait} Idioma: español. No menciones modelos de IA. Nunca cites nombres propios de personas del conocimiento inyectado.

REGLA FUNDAMENTAL — BASA TODO EN LOS DATOS REALES:
- Usa TODA la información del bloque DATOS para construir tus respuestas.
- Si el usuario pide un plan, recomendación o resumen, créalo extrayendo y organizando lo que hay en los DATOS, aunque sea poco.
- Si los datos son escasos, sé transparente: indícalo brevemente y trabaja con lo que tienes ("Con los datos que tengo hasta ahora...").
- NUNCA inventes datos concretos que no estén en el bloque DATOS.
- Si no tienes absolutamente ningún dato relevante sobre lo que pide el usuario, responde: {"type":"text","content":"Aún no tengo información sobre eso registrada. Puedes añadirla desde la app para que pueda ayudarte mejor."}

DATOS REALES DEL USUARIO: ${contextStr}

SYNC: si el usuario pide sync/balance del día, guíale conversacionalmente y tras 3-4 msgs usa tipo "summary".

JSON obligatorio:
{"type":"text","content":"..."} para respuestas normales
{"type":"list","title":"...","icon":"🛒","items":[{"icon":"✅","text":"..."}]} para listas
{"type":"password_request","name":"servicio","id":"ID_EXACTO"} para contraseñas
{"type":"summary","text":"resumen 2 frases","readyToClose":true} para cerrar sync`;

    // Historial reducido de -6 a -4 mensajes para ahorrar tokens
    const groqMessages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-4),
    ];

    // Métricas de contexto
    const promptTokensEst = estimateTokens(systemPrompt) + groqMessages.slice(1).reduce((s, m) => s + estimateTokens(m.content), 0);
    console.log(`[CTX] prompt total: ~${promptTokensEst} tokens | intent: ${primary} | módulos: ${[...needed].join(',')}`);

    const FALLBACK_MODELS = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'qwen/qwen3-32b',
    ];

    let data;
    let lastError = '';
    let usedModel = '';

    for (const model of FALLBACK_MODELS) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: groqMessages,
            max_tokens: 400,
            temperature: 0.7,
            response_format: { type: 'json_object' },
          }),
        });

        if (res.ok) {
          data = await res.json();
          usedModel = model;
          break;
        } else {
          lastError = await res.text();
          console.warn(`Modelo ${model} falló. Probando siguiente...`);
        }
      } catch {
        console.warn(`Error de red con modelo ${model}.`);
      }
    }

    if (!data) {
      console.error('Todos los modelos fallaron. Último error:', lastError);
      return NextResponse.json({ error: 'Nuestros servidores de IA están muy ocupados. Inténtalo en unos segundos.' }, { status: 500 });
    }

    const reply = data.choices?.[0]?.message?.content ?? '{"type":"text","content":"Lo siento, no pude procesar tu mensaje."}';
    console.log(`✅ Respuesta OK con modelo: ${usedModel}`);

    return NextResponse.json({ reply });

  } catch (error) {
    console.error('API /ai-chat error:', error);
    return NextResponse.json({ error: 'Error procesando la solicitud' }, { status: 500 });
  }
}
