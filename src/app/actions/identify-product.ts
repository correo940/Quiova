'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export async function identifyProductAction(base64Image: string): Promise<{ success: boolean; data?: { productName: string, supermarket?: string }; error?: string }> {
    if (!apiKey) {
        console.error("Server Action: Gemini API Key not found");
        return { success: false, error: "Clave API no configurada en el servidor" };
    }

    const genAI = new GoogleGenerativeAI(apiKey);

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
            const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });

            const base64Data = base64Image.includes('base64,')
                ? base64Image.split('base64,')[1]
                : base64Image;

            const prompt = `Identifica el producto en esta imagen.
            Devuelve un objeto JSON con dos campos:
            1. "productName": El nombre del producto (ej. 'Coca Cola 33cl', 'Leche Asturiana Entera').
            2. "supermarket": El nombre del supermercado SI se puede deducir de la marca (ej. 'Hacendado' -> 'Mercadona', 'Deliplus' -> 'Mercadona', 'Carrefour' -> 'Carrefour', 'Milbona' -> 'Lidl'). Si no es una marca blanca o no estás seguro, deja este campo vacío o null.
            Sé conciso. Si no se puede identificar el producto, devuelve { "productName": "Desconocido" }.`;

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

            try {
                const jsonResponse = JSON.parse(text);
                if (jsonResponse.productName && jsonResponse.productName.toLowerCase().includes("desconocido")) {
                    return { success: false, error: "No se pudo identificar el producto" };
                }
                return { success: true, data: { productName: jsonResponse.productName, supermarket: jsonResponse.supermarket || undefined } };
            } catch (e) {
                console.error("Error parsing JSON:", e);
                // Fallback for non-JSON models or errors
                if (text.toLowerCase().includes("desconocido")) {
                    return { success: false, error: "No se pudo identificar el producto" };
                }
                return { success: true, data: { productName: text } };
            }

        } catch (error: any) {
            console.error(`Failed with ${modelName}:`, error.message);
            lastError = error.message;
        }
    }

    return { success: false, error: `Fallo con todos los modelos. Último error: ${lastError}` };
}
