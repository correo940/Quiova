import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
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

    // Supabase con service role para leer datos del usuario
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Consultas paralelas para máxima velocidad
    const today = new Date().toISOString().split('T')[0];
    const [
      { data: tasks },
      { data: shopping },
      { data: savings },
      { data: shifts },
      { data: medicines },
      { data: expenses },
      { data: manuals },
      { data: passwords },
    ] = await Promise.all([
      supabase.from('tasks').select('title, is_completed, due_date').eq('user_id', userId).eq('is_completed', false).limit(10),
      supabase.from('shopping_items').select('name, quantity').eq('user_id', userId).eq('is_checked', false).limit(15),
      supabase.from('savings_accounts').select('name, current_balance').eq('user_id', userId),
      supabase.from('work_shifts').select('title, start_time, end_time').eq('user_id', userId).gte('start_time', today).limit(5),
      supabase.from('medicines').select('name, dosage, frequency').eq('user_id', userId).limit(10),
      supabase.from('expenses').select('title, amount, date').eq('user_id', userId).gte('date', `${new Date().toISOString().substring(0, 7)}-01`).order('date', { ascending: false }),
      supabase.from('manuals').select('title, category, content').eq('user_id', userId).limit(20),
      supabase.from('passwords').select('id, name').eq('user_id', userId),
    ]);

    // Conocimiento personalizado — consulta separada para no romper el chat si la tabla no existe aún
    let knowledge: { title: string; content: string }[] = [];

    // Si no viene del cliente, lo buscamos nosotros
    if (!todaySyncStatus) {
      try {
        const { data: sData } = await supabase
          .from('secretary_syncs')
          .select('completed_at, victories')
          .eq('user_id', userId)
          .eq('sync_date', today)
          .maybeSingle();
        todaySyncStatus = sData;
      } catch (e) {
        console.error('Error fetching sync status in route:', e);
      }
    }

    try {
      const { data: kData } = await supabase
        .from('ai_knowledge')
        .select('title, content')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      knowledge = kData || [];
    } catch {
      // La tabla aún no existe, ignorar
    }

    const totalBalance = savings?.reduce((sum, a) => sum + (a.current_balance || 0), 0) || 0;
    const currentMonthSpent = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    const knowledgeSection = knowledge.length > 0
      ? `\n📚 CONOCIMIENTO PERSONALIZADO DEL USUARIO:\n${knowledge.map(k => `## ${k.title}\n${k.content}`).join('\n\n')}\n`
      : '';

    const formattedManuals = manuals?.map(m => {
      let notes = m.content || '';
      try {
        const p = JSON.parse(m.content);
        if (p.text) notes = p.text;
      } catch { }
      if (!notes.trim()) return '';
      return `- [${m.category || 'General'}] ${m.title}: ${notes.substring(0, 500)}`;
    }).filter(Boolean).join('\n') || '- Sin manuales registrados';

    const personality = secretarySettings?.personality || 'friendly';
    const traitsMap = {
      formal: "Eres una asistente profesional, elegante y respetuosa. Usas un lenguaje cuidado y evitas el exceso de emojis. Te diriges al usuario con deferencia pero cercanía.",
      friendly: "Eres una asistente muy amable, cercana y positiva. Usas emojis para dar calidez y te enfocas en motivar al usuario. Tu tono es informal (tú).",
      sergeant: "Eres una asistente extremadamente directa, disciplinada y breve. Tu objetivo es la eficiencia. No andas con rodeos y exiges cumplimiento de objetivos. Tono seco y autoritario.",
    };
    const personalityTraits = traitsMap[personality as keyof typeof traitsMap] || traitsMap.friendly;

    const syncStatusSection = todaySyncStatus
      ? `\nESTADO DEL SYNC DE HOY: ${todaySyncStatus.completed_at ? 'Completado ✅' : 'Pendiente 🌙'}. Victories: ${todaySyncStatus.victories?.join(', ') || 'Ninguna aún'}`
      : '\nESTADO DEL SYNC DE HOY: Pendiente 🌙';

    const systemPrompt = `Eres la IA de Quioba, asistente personal total. Has absorbido las funciones del Organizador Personal.
${personalityTraits}
Tienes acceso a los datos reales del usuario y le ayudas con cualquier pregunta sobre su vida diaria.
Responde siempre en español. Nunca menciones que eres un modelo de lenguaje ni menciones a Groq/Llama.

${knowledgeSection}

DATOS ACTUALES DEL USUARIO (${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}):
${syncStatusSection}

💰 FINANZAS:
- Saldo Cuentas y Sobres: ${totalBalance.toLocaleString('es-ES')}€
- Gastado este mes: ${currentMonthSpent.toLocaleString('es-ES')}€
- Últimos gastos de este mes: ${expenses?.slice(0, 5).map(e => `${e.title} (${e.amount}€)`).join(', ') || 'Sin gastos recientes'}

✅ TAREAS PENDIENTES (${tasks?.length || 0}):
${tasks?.map(t => `- ${t.title}${t.due_date ? ` (vence: ${t.due_date})` : ''}`).join('\n') || '- Sin tareas pendientes'}

🛒 LISTA DE LA COMPRA (${shopping?.length || 0} items):
${shopping?.map(s => `- ${s.name}${s.quantity ? ` x${s.quantity}` : ''}`).join('\n') || '- Lista vacía'}

💼 PRÓXIMOS TURNOS:
${shifts?.map(s => {
      const start = new Date(s.start_time);
      const end = new Date(s.end_time);
      return `- ${s.title}: ${start.toLocaleDateString('es-ES')} ${start.getHours()}:${String(start.getMinutes()).padStart(2, '0')}–${end.getHours()}:${String(end.getMinutes()).padStart(2, '0')}`;
    }).join('\n') || '- Sin turnos próximos'}

💊 MEDICACIÓN:
${medicines?.map(m => `- ${m.name}${m.dosage ? ` (${m.dosage})` : ''}${m.frequency ? ` — ${m.frequency}` : ''}`).join('\n') || '- Sin medicación registrada'}

📘 MANUALES Y MANTENIMIENTO DEL HOGAR:
${formattedManuals}

🔑 BÓVEDA DE CONTRASEÑAS (SOLO NOMBRES):
${passwords?.map(p => `- ${p.name} (ID: ${p.id})`).join('\n') || '- No hay contraseñas en la bóveda'}

REGLAS DEL ORGANIZADOR (SYNC NOCTURNO):
- Si el usuario quiere hacer el "sync" o "balance del día", guíale de forma conversacional.
- Pregunta sobre sus victorias del día y si queda algo para mañana.
- Tras 3-4 mensajes de sync, genera un resumen final usando el tipo "summary".

FORMATO DE RESPUESTA — MUY IMPORTANTE:
Debes responder SIEMPRE y ÚNICAMENTE con JSON válido. Nunca texto plano.

Para listas (compra, tareas, documentos, turnos, medicación):
{"type":"list","title":"Título","icon":"emoji","items":[{"icon":"emoji","text":"texto"}]}

Para solicitar revelación de una contraseña al usuario:
{"type":"password_request","name":"Nombre del servicio","id":"COPIA_EXACTA_DEL_ID_PROPORCIONADO"}

Para texto normal:
{"type":"text","content":"Tu respuesta aquí"}

Para cerrar un Sync Nocturno:
{"type":"summary","text":"[Resumen de 2 frases del día]","readyToClose":true}

EJEMPLOS:
Usuario: "hazme el sync"
{"type":"text","content":"¡Hola! Claro, vamos a cerrar el día. Cuéntame, ¿cuál ha sido tu mayor victoria hoy? 😊"}

NUNCA uses markdown, viñetas ni texto fuera del JSON.`;

    const groqMessages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: 500,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq ai-chat error:', err);
      return NextResponse.json({ error: 'Error al contactar con Groq' }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? 'Lo siento, no pude procesar tu mensaje.';

    return NextResponse.json({ reply });

  } catch (error) {
    console.error('API /ai-chat error:', error);
    return NextResponse.json({ error: 'Error procesando la solicitud' }, { status: 500 });
  }
}
