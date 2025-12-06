'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export async function identifyProductAction(base64Image: string): Promise<{ success: boolean; data?: string; error?: string }> {
    if (!apiKey) {
        console.error("Server Action: Gemini API Key not found");
        return { success: false, error: "Clave API no configurada en el servidor" };
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // List of models to try in order of preference (based on user's available models)
    const modelsToTry = [
        "gemini-2.0-flash-exp",
        "gemini-flash-latest",
        "gemini-pro-latest",
        "gemini-1.5-flash",
        "gemini-pro"
    ];

    let lastError = "";

    for (const modelName of modelsToTry) {
        try {
            console.log(`Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            // Remove header if present (data:image/jpeg;base64,)
            const base64Data = base64Image.includes('base64,')
                ? base64Image.split('base64,')[1]
                : base64Image;

            const prompt = "Identifica el producto en esta imagen. Devuelve SOLO el nombre del producto (ej. 'Coca Cola 33cl', 'Leche Asturiana Entera'). Sé conciso. Si no es un producto claro, devuelve 'Desconocido'.";

            const imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg",
                },
            };

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text().trim();

            console.log(`Success with ${modelName}:`, text);

            if (text.toLowerCase().includes("desconocido")) {
                return { success: false, error: "No se pudo identificar el producto" };
            }

            return { success: true, data: text };

        } catch (error: any) {
            console.error(`Failed with ${modelName}:`, error.message);
            lastError = error.message;
            // Continue to next model
        }
    }

    return { success: false, error: `Fallo con todos los modelos. Último error: ${lastError}` };
}
