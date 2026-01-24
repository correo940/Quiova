import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export interface RecipeData {
    title: string;
    description: string;
    ingredients: { name: string; quantity: string; has_it: boolean }[];
    steps: string[];
    cooking_time: string;
    difficulty: string;
}

export async function POST(req: Request) {
    if (!apiKey) {
        return NextResponse.json({ success: false, error: "Clave API no configurada" }, { status: 500 });
    }

    try {
        const { pantryItems } = await req.json();

        if (!pantryItems || !Array.isArray(pantryItems) || pantryItems.length === 0) {
            return NextResponse.json({ success: false, error: "La despensa está vacía. Añade productos primero." }, { status: 400 });
        }

        const modelsToTry = [
            "gemini-1.5-flash",
            "gemini-flash-latest",
            "gemini-1.5-flash-latest",
            "gemini-pro-latest",
            "gemini-2.0-flash-exp",
            "gemini-1.5-pro",
            "gemini-pro"
        ];

        let errorLog: string[] = [];

        for (const modelName of modelsToTry) {
            try {
                console.log(`Trying model (Recipe): ${modelName}`);
                const genAI = new GoogleGenerativeAI(apiKey);

                const useJsonMode = modelName.includes("1.5") || modelName.includes("flash") || modelName.includes("2.0");
                const generationConfig = useJsonMode ? { responseMimeType: "application/json" } : undefined;

                const model = genAI.getGenerativeModel({ model: modelName, generationConfig });

                const jsonInstruction = useJsonMode ? "" : "Respond ONLY with raw JSON.";

                const prompt = `Actúa como un Chef experto. Tengo los siguientes ingredientes en mi despensa: ${pantryItems.join(', ')}.
                
                Crea una receta deliciosa que utilice PRINCIPALMENTE estos ingredientes, pero puedes sugerir otros básicos (como sal, aceite, especias) o frescos necesarios.
                
                Devuelve un JSON con la siguiente estructura:
                {
                    "title": "Nombre de la receta",
                    "description": "Breve descripción apetitosa",
                    "cooking_time": "Tiempo estimado (ej. 30 min)",
                    "difficulty": "Fácil / Media / Difícil",
                    "ingredients": [
                        { "name": "Ingrediente", "quantity": "Cantidad (ej. 200g)", "has_it": boolean (true si está en mi lista de despensa, false si tengo que comprarlo) }
                    ],
                    "steps": ["Paso 1...", "Paso 2..."]
                }
                
                Asegúrate de marcar correctamente "has_it": false para los ingredientes que NO estaban en mi lista proporcionada.
                ${jsonInstruction}`;

                const result = await model.generateContent(prompt);
                const responseText = result.response.text();

                const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

                try {
                    const recipe = JSON.parse(cleanedText) as RecipeData;
                    return NextResponse.json({ success: true, data: recipe });
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

        return NextResponse.json({ success: false, error: `Fallo con todos los modelos. Detalles: ${errorLog.join(' || ')}` }, { status: 500 });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: `Error interno: ${error.message}` }, { status: 500 });
    }
}
