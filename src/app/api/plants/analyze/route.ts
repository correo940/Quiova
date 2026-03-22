import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageB64 } = body;

        if (!imageB64) {
            return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 });
        }

        const base64Data = imageB64.replace(/^data:image\/\w+;base64,/, '');

        // 1. PlantNet Identification
        let plantnetSpecies = "Desconocida";
        let plantnetCommon = "Planta desconocida";

        try {
            const formData = new FormData();
            
            // Note: In Next.js App Router (Node.js 18+) we can use Blob
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });
            
            formData.append('images', blob, 'plant.jpg');
            formData.append('organs', 'auto');

            const plantnetRes = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${process.env.PLANTNET_API_KEY}`, {
                method: 'POST',
                body: formData
            });

            if (plantnetRes.ok) {
                const pnData = await plantnetRes.json();
                if (pnData.results && pnData.results.length > 0) {
                    const bestMatch = pnData.results[0];
                    plantnetSpecies = bestMatch.species?.scientificNameWithoutAuthor || plantnetSpecies;
                    plantnetCommon = bestMatch.species?.commonNames?.[0] || plantnetSpecies;
                }
            } else {
                console.error("PlantNet Error:", await plantnetRes.text());
            }
        } catch (pnError) {
            console.error("PlantNet API Catch Error:", pnError);
        }

        // 2. Groq Vision for Care Instructions & Diagnosis
        const groqApi = "https://api.groq.com/openai/v1/chat/completions";
        
        const systemPrompt = `Eres un experto botánico agrícola. 
El usuario ha enviado una foto de una planta que PlantNet ha identificado como:
- Nombre científico: ${plantnetSpecies}
- Nombre común: ${plantnetCommon}

Tu trabajo es:
1. Confirmar brevemente la salud o enfermedades visibles en la foto.
2. Dar instrucciones exactas de cuidado (luz, abono).
3. Establecer la frecuencia de riego en días (número entero).

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta y sin formato markdown:
{
    "health_status": "Breve estado de salud (ej: Saludable, o Hojas marchitas por falta de agua)",
    "care_instructions": "Instrucciones de cuidado y fertilización breves",
    "watering_frequency_days": 7,
    "sunlight_needs": "Sol directo / Sombra parcial / Luz indirecta"
}`;

        const groqRes = await fetch(groqApi, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.2-90b-vision-preview',
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: systemPrompt },
                            { type: "image_url", image_url: { url: imageB64 } }
                        ]
                    }
                ]
            })
        });

       if (!groqRes.ok) {
            const err = await groqRes.text();
            console.error("Groq Error:", err);
            throw new Error("Llama 3 Vision API falló");
       }

       const groqData = await groqRes.json();
       const careData = JSON.parse(groqData.choices[0].message.content);

       const result = {
           species: plantnetSpecies,
           common_name: plantnetCommon,
           watering_frequency_days: careData.watering_frequency_days || 7,
           sunlight_needs: careData.sunlight_needs || 'Luz indirecta',
           health_status: careData.health_status || 'Saludable',
           care_instructions: careData.care_instructions || 'Riega cuando la tierra esté seca.',
       };

       return NextResponse.json(result);

    } catch (error: any) {
        console.error("Error analyzing plant:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
