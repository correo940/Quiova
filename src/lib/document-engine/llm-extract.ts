// Extraccion estructurada compartida por el Motor Documental Universal.
// Primario: Groq (Llama). Fallback: Gemini. Desacoplado del dominio (documents, assets, ...):
// el caller pasa su propio prompt de sistema y esquema; este modulo solo resuelve "texto -> JSON" con proveedores intercambiables.

import Groq from 'groq-sdk';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GEMINI_MODEL = 'gemini-2.5-flash';

function extractJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY no configurada.');

  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.1,
    max_tokens: 800,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  return completion.choices?.[0]?.message?.content || '';
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada.');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini extraction fallback error: ${await response.text()}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Llama al proveedor primario (Groq) y cae a Gemini si falla.
 * Devuelve el JSON ya parseado, o null si ningun proveedor devolvio JSON valido.
 */
export async function extractStructuredJson(systemPrompt: string, userPrompt: string): Promise<{ data: any; provider: 'groq' | 'gemini' | null }> {
  try {
    const content = await callGroq(systemPrompt, userPrompt);
    const data = extractJson(content);
    if (data) return { data, provider: 'groq' };
  } catch (error) {
    console.error('[document-engine/llm-extract] Groq failed, trying Gemini fallback:', error);
  }

  try {
    const content = await callGemini(systemPrompt, userPrompt);
    const data = extractJson(content);
    if (data) return { data, provider: 'gemini' };
  } catch (error) {
    console.error('[document-engine/llm-extract] Gemini fallback failed:', error);
  }

  return { data: null, provider: null };
}
