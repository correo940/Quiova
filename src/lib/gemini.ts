import { GoogleGenerativeAI } from "@google/generative-ai";
import { scanRosterImage as scanRosterLocal } from './roster-scanner';
import { processWithLLMWhisperer } from './llm-whisperer';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

// Helper to wait between retries
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface RosterColumn {
    title: string;
    names: string[];
    xStart?: number;
    xEnd?: number;
}

export interface DigitalRoster {
    date: string;
    columns: RosterColumn[];
    rawText: string;
}

export async function identifyProduct(base64Image: string): Promise<string | null> {
    if (!apiKey) return null;
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const base64Data = base64Image.split(',')[1] || base64Image;
        const result = await model.generateContent(["Identifica el producto. SOLO nombre. Ej 'Coca Cola'.", { inlineData: { data: base64Data, mimeType: "image/jpeg" } }]);
        return result.response.text().trim() || null;
    } catch (e) { console.error(e); return null; }
}

export async function extractReceiptData(base64Image: string): Promise<any | null> {
    try {
        const response = await fetch('/api/scan-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Image.includes(',') ? base64Image.split(',')[1] : base64Image })
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('extractReceiptData failed:', error);
        return null;
    }
}

export async function scanRosterImage(base64Image: string): Promise<DigitalRoster | null> {
    console.log("Starting Omni-Scan (v4.0 - PROXY FIXED): LLM Whisperer -> Cloud AI -> Local...");

    // 0. Try LLM Whisperer - DISABLED FOR SPEED
    // const whispererKey = "mWn3oyQa2qsF5etL9FuPxceTFC657J-DmtEgbBO0YEU";

    // if (whispererKey) {
    //     try {
    //         console.log("Attempting LLM Whisperer...");
    //         const textLayout = await processWithLLMWhisperer(base64Image, whispererKey);
    //         if (textLayout) {
    //             console.log("Parsing Whisperer Output...");
    //             const parsed = parseLayoutText(textLayout);
    //             if (parsed.columns.length > 0) {
    //                 return parsed;
    //             }
    //         } else {
    //             console.warn("LLM Whisperer returned empty result.");
    //         }
    //     } catch (e: any) {
    //         console.error("LLM Whisperer CRITICAL FAILURE:", e.message || e);
    //         // Likely CORS if running client-side. 
    //     }
    // }

    // 1. Gemini Cloud
    if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const base64Data = base64Image.split(',')[1] || base64Image;
        // Use stable models only
        const candidates = ["gemini-1.5-flash-002", "gemini-1.5-flash", "gemini-pro"];

        const prompt = `Analiza esta imagen y genera una REPLICA DIGITAL JSON:
        { "date": "YYYY-MM-DD", "columns": [{ "title": "MAÑANA", "names": ["..."] }] } 
        IGNORA numéricos basura. RESPETA columnas.
        IMPORTANTE: Si hay una sección abajo llamada "SALIENTES DE SERVICIO", crea columnas separadas para ellos con título "SALIENTE [SERVICIO]" (ej. SALIENTE PUERTAS) o inclúyelos con ese prefijo.`;

        for (let i = 0; i < candidates.length; i++) {
            const modelName = candidates[i];
            if (i > 0) await sleep(1500);

            try {
                console.log(`Cloud AI Request (${modelName})...`);
                const model = genAI.getGenerativeModel({ model: modelName });

                const result = await model.generateContent([
                    prompt,
                    { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
                ]);

                const response = await result.response;
                const text = response.text().trim();
                const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const data = JSON.parse(jsonString);

                if (data.date && Array.isArray(data.columns)) {
                    return {
                        date: data.date,
                        columns: data.columns,
                        rawText: "Analizado por IA Artificial (" + modelName + ")"
                    };
                }
            } catch (error: any) {
                console.warn(`Cloud AI (${modelName}) failed:`, error.message);
            }
        }
    } else {
        console.warn("Gemini API Key missing, skipping Cloud AI.");
    }

    // 2. Fallback to Local Scanner
    console.warn("All Cloud AI models failed. Falling back to Local Engine...");
    try {
        const localResult = await scanRosterLocal(base64Image);
        if (localResult) {
            localResult.rawText = "[MODO SIN CONEXIÓN] La nube falló. Usando motor local.\n" + localResult.rawText;
            return localResult;
        }
    } catch (localError) {
        console.error("Local Fallback failed too:", localError);
    }

    throw new Error("No se pudo procesar la imagen ni en Nube ni en Local.");
}

// Helper to parse unstructured text from Whisperer while attempting to preserve column logic roughly
function parseLayoutText(text: string): DigitalRoster {
    // This is a basic parser that assumes Whisperer returns text that visually looks like the table.
    // Making a robust column parser from just string lines is hard without X/Y, but we try heuristics.

    // Check for "MAÑANA" / "TARDE" / "NOCHE" in headers
    const lines = text.split('\n');
    let hasColumns = false;

    // Simply put everything in one column if we can't find clear headers
    // This is better than nothing because the text quality will be high.

    return {
        date: new Date().toISOString().split('T')[0],
        columns: [{
            title: "TEXTO EXTRAÍDO (LLM WHISPERER)",
            names: lines.filter(l => l.trim().length > 3),
            xStart: 0,
            xEnd: 0
        }],
        rawText: "LLM Whisperer Source (High Quality):\n" + text
    };
}
// ... existing code

export interface UserShiftResult {
    found: boolean;
    date: string;
    targetName: string;
    shift: string; // "MAÑANA", "TARDE", "NOCHE"
    startTime: string;
    endTime: string;
    colleagues: string[];
    service?: string; // Add optional service property
    rawContext: string;
}

// Helper for raw REST API call (bypassing SDK issues)
async function callGeminiRestApi(base64Image: string, promptText: string, modelName: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: promptText },
                    { inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] || base64Image } }
                ]
            }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`REST API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const json = await response.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function findUserShift(base64Image: string, targetName: string): Promise<UserShiftResult | null> {
    console.log(`Starting Detective Mode for agent: ${targetName}`);
    console.log(`[GEMINI] API Key present: ${!!apiKey}`);

    // Store last error for debugging
    let lastGeminiError = "";

    // 1. Try Gemini Cloud (Best for Context)
    if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const base64Data = base64Image.split(',')[1] || base64Image;
        // Use ONLY the stable flash model to avoid 404s on experimental/pro models
        const candidates = ["gemini-1.5-flash", "gemini-1.5-pro"];

        const prompt = `Eres un EXPERTO analizando cuadrantes de la GUARDIA CIVIL de España.

DOCUMENTO: "PREVISIÓN DE SERVICIOS PARA LA MAÑANA-TARDE-NOCHE"
ESTRUCTURA DEL DOCUMENTO:
1. CABECERA: Contiene "COMANDANCIA DE LA GUARDIA CIVIL" y la fecha completa (ej: "30 DE ENERO DE 2026")
2. SECCIONES DE SERVICIO: Barras grises con nombres como:
   - "SERVICIO CENTRO PENITENCIARIO CASTELLÓN"
   - "SERVICIO EN SUBDELEGACIÓN" 
   - "SERVICIO SEGURIDAD EN ACUARTELAMIENTO"
   - "CONDUCCIÓN DE PRESOS/DETENIDOS"
   - "MONITORES"
   - "CURSOS DE FORMACIÓN"
   - "SALIENTES DE SERVICIO" (al final)
3. CADA SECCIÓN tiene 3 COLUMNAS con sus horarios en la cabecera:
   - MAÑANA: "DE 06 A 14 HORAS" o "DE 07 A 14 HORAS"
   - TARDE: "DE 14 A 22 HORAS" o "DE 15 A 22 HORAS"  
   - NOCHE: "DE 22 A 06 HORAS" o "DE 23 A 07 HORAS"
4. NOMBRES: Aparecen como "G.C. D. NOMBRE APELLIDO1 APELLIDO2" o "G.C. Dª. NOMBRE..."

OBJETIVO: Buscar a "${targetName}" en el documento.

INSTRUCCIONES DE BÚSQUEDA:
1. Busca "${targetName}" (puede ser nombre completo o solo un apellido)
2. Si encuentras a la persona, identifica:
   a) En qué SECCIÓN está (la barra gris superior más cercana)
   b) En qué COLUMNA está (MAÑANA, TARDE o NOCHE)
   c) El HORARIO exacto que aparece en la cabecera de esa columna (ej: "DE 06 A 14")
   d) Los otros nombres que están EN LA MISMA COLUMNA de la misma sección

RESPUESTA OBLIGATORIA EN JSON PURO (sin markdown, sin explicación):
{
  "found": true,
  "date": "2026-01-30",
  "targetName": "G.C. D. NOMBRE COMPLETO TAL CUAL APARECE",
  "service": "NOMBRE DE LA SECCIÓN/SERVICIO",
  "shift": "MAÑANA",
  "startTime": "06:00",
  "endTime": "14:00",
  "colleagues": ["G.C. D. COMPAÑERO 1", "G.C. Dª. COMPAÑERA 2"]
}

Si NO encuentras a la persona:
{
  "found": false,
  "date": "2026-01-30",
  "targetName": "${targetName}",
  "shift": "",
  "startTime": "",
  "endTime": "",
  "colleagues": []
}
`;

        for (let i = 0; i < candidates.length; i++) {
            try {
                const modelName = candidates[i];
                console.log(`[GEMINI] Trying model: ${modelName} via REST API`);

                // Use REST instead of SDK for broader compatibility
                const rawText = await callGeminiRestApi(base64Image, prompt, modelName);

                console.log(`[GEMINI] Raw response:`, rawText);
                const text = rawText.trim().replace(/```json/g, '').replace(/```/g, '').trim();
                console.log(`[GEMINI] Cleaned text:`, text);

                const data = JSON.parse(text);
                console.log(`[GEMINI] Parsed data:`, JSON.stringify(data, null, 2));
                console.log(`[GEMINI] found=${data.found}, shift="${data.shift}", startTime="${data.startTime}", endTime="${data.endTime}"`);
                console.log(`[GEMINI] colleagues:`, data.colleagues);

                if (data.found || data.date) {
                    const finalResult = { ...data, rawContext: `Gemini ${modelName} (REST)` };
                    console.log(`[GEMINI] ✅ Returning result:`, JSON.stringify(finalResult, null, 2));
                    return finalResult;
                }
            } catch (e: any) {
                lastGeminiError = e?.message || String(e);
                console.warn(`[GEMINI] ❌ Model ${candidates[i]} failed:`, lastGeminiError);
            }
        }
    } else {
        lastGeminiError = "NO API KEY - process.env.GEMINI_API_KEY is undefined";
        console.error("[GEMINI] ❌", lastGeminiError);
    }

    // 2. Fallback: Local Text Search (Expanded)
    console.warn(`Cloud Detective failed (${lastGeminiError}). Trying Local Search...`);
    const localScan = await scanRosterLocal(base64Image);

    if (localScan) {
        // A. Search in Columns (Best Case)
        for (const col of localScan.columns) {
            const match = col.names.find(n => n.toUpperCase().includes(targetName.toUpperCase()));
            if (match) {
                // Check if the name itself has the SALIENTE tag from local scanner
                const isSaliente = match.includes("(SALIENTE");
                const finalShift = isSaliente ?
                    match.match(/\(SALIENTE ([^)]+)\)/)?.[1] ? `SALIENTE ${match.match(/\(SALIENTE ([^)]+)\)/)?.[1]}` : "SALIENTE DE SERVICIO"
                    : col.title;

                return {
                    found: true,
                    date: localScan.date,
                    targetName: match,
                    shift: finalShift,
                    startTime: "00:00",
                    endTime: "00:00",
                    colleagues: col.names.filter(n => n !== match),
                    rawContext: `Local Search (Columns) - GEMINI FALLÓ: ${lastGeminiError}`
                };
            }
        }

        // B. Search in Raw Text (Worst Case)
        // Heuristic: If we find the name, try to guess the context based on lines nearby
        if (localScan.rawText.toUpperCase().includes(targetName.toUpperCase())) {
            return {
                found: true,
                date: localScan.date,
                targetName: targetName.toUpperCase(),
                shift: "DETECTADO EN TEXTO (Sin estructura clara)",
                startTime: "--:--",
                endTime: "--:--",
                colleagues: ["No se pudieron determinar compañeros"],
                rawContext: "Local Search (Raw Text)"
            };
        }
    }

    return null;
}
