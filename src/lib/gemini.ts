import { GoogleGenerativeAI } from "@google/generative-ai";
import { scanRosterImage as scanRosterLocal } from './roster-scanner';
import { processWithLLMWhisperer } from './llm-whisperer';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

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
    return null;
}

export async function scanRosterImage(base64Image: string): Promise<DigitalRoster | null> {
    console.log("Starting Omni-Scan (v4.0 - PROXY FIXED): LLM Whisperer -> Cloud AI -> Local...");

    // 0. Try LLM Whisperer
    const whispererKey = "mWn3oyQa2qsF5etL9FuPxceTFC657J-DmtEgbBO0YEU";

    if (whispererKey) {
        try {
            console.log("Attempting LLM Whisperer...");
            const textLayout = await processWithLLMWhisperer(base64Image, whispererKey);
            if (textLayout) {
                console.log("Parsing Whisperer Output...");
                const parsed = parseLayoutText(textLayout);
                if (parsed.columns.length > 0) {
                    return parsed;
                }
            } else {
                console.warn("LLM Whisperer returned empty result.");
            }
        } catch (e: any) {
            console.error("LLM Whisperer CRITICAL FAILURE:", e.message || e);
            // Likely CORS if running client-side. 
        }
    }

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
    rawContext: string;
}

export async function findUserShift(base64Image: string, targetName: string): Promise<UserShiftResult | null> {
    console.log(`Starting Detective Mode for agent: ${targetName}`);

    // 1. Try Gemini Cloud (Best for Context)
    if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const base64Data = base64Image.split(',')[1] || base64Image;
        const candidates = ["gemini-1.5-flash-002", "gemini-1.5-flash", "gemini-pro"];

        const prompt = `Actúa como un DETECTIVE analizando un cuadrante de policía.
        OBJETIVO: Encontrar el turno del agente "${targetName}".
        
        INSTRUCCIONES:
        1.  Busca el nombre "${targetName}" (o similar, ej. si busco "GARCIA" y hay "G. GARCIA", cuenta).
        2.  Mira en qué COLUMNA está (Mañana, Tarde, Noche).
        3.  IMPORTANTE: Mira si el agente está en la sección inferior de "SALIENTES DE SERVICIO". Si es así, su turno es "SALIENTE [SERVICIO]" (ej. SALIENTE PUERTAS) y NO "Noche".
        4.  Mira quién más está en ESA MISMA COLUMNA (compañeros).
        5.  Detecta la FECHA del documento.

        RESPUESTA JSON:
        {
            "found": true/false,
            "date": "YYYY-MM-DD",
            "targetName": "Nombre Exacto Encontrado",
            "shift": "MAÑANA/TARDE/NOCHE o SALIENTE [SERVICIO]",
            "startTime": "HH:MM",
            "endTime": "HH:MM",
            "colleagues": ["Agente 1", "Agente 2"]
        }
        `;

        for (let i = 0; i < candidates.length; i++) {
            try {
                const model = genAI.getGenerativeModel({ model: candidates[i] });
                const result = await model.generateContent([prompt, { inlineData: { data: base64Data, mimeType: "image/jpeg" } }]);
                const text = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();
                const data = JSON.parse(text);

                if (data.found || data.date) {
                    return { ...data, rawContext: "Gemini Detective" };
                }
            } catch (e) {
                console.warn("Detective Cloud failed:", e);
            }
        }
    }

    // 2. Fallback: Local Text Search (Expanded)
    console.warn("Cloud Detective failed. Trying Local Search...");
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
                    rawContext: "Local Search (Columns)"
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
