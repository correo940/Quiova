import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export interface MedicineData {
    name: string;
    description: string;
    expiration_date: string | null; // YYYY-MM-DD
}

export async function POST(req: Request) {
    if (!apiKey) {
        return NextResponse.json({ success: false, error: "Clave API no configurada" }, { status: 500 });
    }

    try {
        const { base64Image } = await req.json();

        if (!base64Image) {
            return NextResponse.json({ success: false, error: "Imagen no proporcionada" }, { status: 400 });
        }

        // Clean base64 string
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: "image/jpeg",
            },
        };

        const modelsToTry = [
            "gemini-1.5-flash",
            "gemini-flash-latest",
            "gemini-1.5-flash-latest",
            "gemini-pro-vision",
            "gemini-1.5-pro",
            "gemini-pro"
        ];

        let errorLog: string[] = [];

        for (const modelName of modelsToTry) {
            try {
                console.log(`Trying model (Medicine): ${modelName}`);
                const genAI = new GoogleGenerativeAI(apiKey);

                const isVisionModel = modelName.includes("vision");
                const useJsonMode = (modelName.includes("1.5") || modelName.includes("flash") || modelName.includes("2.0")) && !isVisionModel;

                const generationConfig = useJsonMode ? { responseMimeType: "application/json" } : undefined;

                const model = genAI.getGenerativeModel({ model: modelName, generationConfig });

                const jsonInstruction = useJsonMode ? "" : "Respond ONLY with raw JSON.";

                const prompt = `Analiza esta imagen de una caja de medicamento.
                Identifica:
                1. Nombre exacto del medicamento.
                2. "Para qué sirve" (description): Breve resumen de 1 frase (ej: "Analgésico para el dolor y fiebre", "Antibiótico para infecciones").
                3. Fecha de caducidad (expiration_date): Busca "CAD", "EXP", o fechas impresas. Devuelve formato YYYY-MM-DD. Si solo hay MES/AÑO, usa el último día del mes. Si NO encuentras fecha, devuelve null.

                Devuelve un JSON con esta estructura:
                {
                    "name": "Nombre",
                    "description": "Para qué sirve...",
                    "expiration_date": "YYYY-MM-DD" or null
                }
                ${jsonInstruction}
                `;

                const result = await model.generateContent([prompt, imagePart]);
                const responseText = result.response.text();

                // Clean up code blocks
                const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

                try {
                    const medicineData = JSON.parse(cleanedText) as MedicineData;
                    return NextResponse.json({ success: true, data: medicineData });
                } catch (jsonError: any) {
                    console.error(`JSON parse error with ${modelName}:`, jsonError);
                    errorLog.push(`${modelName}: JSON Parse Error`);
                    continue;
                }

            } catch (error: any) {
                console.error(`Failed with ${modelName}:`, error.message);
                errorLog.push(`${modelName}: ${error.message}`);
            }
        }

        return NextResponse.json({ success: false, error: `No se pudo identificar el medicamento. Detalles: ${errorLog.join(' || ')}` }, { status: 500 });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: `Error interno: ${error.message}` }, { status: 500 });
    }
}
