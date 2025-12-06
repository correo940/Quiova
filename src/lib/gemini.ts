import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function identifyProduct(base64Image: string): Promise<string | null> {
    if (!apiKey) {
        console.error("Gemini API Key not found");
        throw new Error("API Key no configurada");
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Remove header if present (data:image/jpeg;base64,)
        const base64Data = base64Image.split(',')[1] || base64Image;

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

        if (text.toLowerCase().includes("desconocido")) {
            return null;
        }

        return text;
    } catch (error) {
        console.error("Error identifying product with Gemini:", error);
        return null;
    }
}
