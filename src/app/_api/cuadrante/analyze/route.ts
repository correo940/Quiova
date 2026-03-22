import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
    if (!apiKey) {
        return NextResponse.json({ success: false, error: "API key not configured" }, { status: 500, headers: corsHeaders });
    }

    try {
        const { base64Image } = await req.json();

        if (!base64Image) {
            return NextResponse.json({ success: false, error: "No image provided" }, { status: 400, headers: corsHeaders });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `Analiza esta imagen de un cuadrante de turnos de trabajo.
        
        Extrae toda la información de la tabla/cuadrante incluyendo:
        - Nombres de los trabajadores
        - Fechas
        - Turnos asignados (mañana, tarde, noche, libre, etc.)
        - Ubicaciones si están indicadas
        
        Devuelve un JSON con esta estructura:
        {
            "success": true,
            "employees": ["nombre1", "nombre2", ...],
            "dates": ["fecha1", "fecha2", ...],
            "shifts": {
                "nombre1": {
                    "fecha1": { "shift": "turno", "location": "ubicación" },
                    "fecha2": { "shift": "turno", "location": "ubicación" }
                },
                "nombre2": { ... }
            }
        }
        
        Si no se puede leer el cuadrante, devuelve:
        { "success": false, "error": "No se pudo leer el cuadrante. Asegúrate de que la imagen sea clara y esté bien enfocada." }`;

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: "image/jpeg",
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text().trim();

        try {
            const jsonResponse = JSON.parse(text);
            return NextResponse.json({
                success: true,
                schedule: jsonResponse
            }, { headers: corsHeaders });
        } catch (e) {
            return NextResponse.json({
                success: false,
                error: "Error al procesar la respuesta del análisis"
            }, { headers: corsHeaders });
        }

    } catch (error: any) {
        console.error("Cuadrante analyze error:", error);
        return NextResponse.json({
            success: false,
            error: `Error: ${error.message}`
        }, { status: 500, headers: corsHeaders });
    }
}
