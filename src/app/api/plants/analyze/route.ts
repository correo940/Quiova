import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageB64 } = body;

        if (!imageB64) {
            return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 });
        }

        const base64Data = imageB64.replace(/^data:image\/\w+;base64,/, '');

        // 1. PlantNet Identification (opcional, para referencia)
        let plantnetSpecies = "Por identificar";
        let plantnetCommon = "Por identificar";

        try {
            const formData = new FormData();
            
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });
            
            formData.append('images', blob, 'plant.jpg');
            formData.append('organs', 'auto');

            console.log("🔍 Enviando imagen a PlantNet...");
            const plantnetRes = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${process.env.PLANTNET_API_KEY}`, {
                method: 'POST',
                body: formData
            });

            if (plantnetRes.ok) {
                const pnData = await plantnetRes.json();
                console.log("PlantNet response:", JSON.stringify(pnData).substring(0, 200));
                
                if (pnData.results && pnData.results.length > 0) {
                    const bestMatch = pnData.results[0];
                    const score = bestMatch.score || 0;
                    
                    if (score > 0.1) { // Solo si tiene confianza mínima
                        plantnetSpecies = bestMatch.species?.scientificNameWithoutAuthor || plantnetSpecies;
                        plantnetCommon = bestMatch.species?.commonNames?.[0] || bestMatch.species?.scientificNameWithoutAuthor || plantnetCommon;
                        console.log(`✅ PlantNet identificó: ${plantnetCommon} (confianza: ${(score * 100).toFixed(1)}%)`);
                    } else {
                        console.warn(`⚠️ PlantNet encontró algo pero con baja confianza (${(score * 100).toFixed(1)}%)`);
                    }
                } else {
                    console.warn("⚠️ PlantNet no encontró resultados");
                }
            } else {
                const err = await plantnetRes.text();
                console.warn(`⚠️ PlantNet HTTP ${plantnetRes.status}: ${err.substring(0, 100)}`);
            }
        } catch (pnError) {
            console.error("❌ PlantNet Exception:", pnError);
        }

        // 2. Vision Analysis: Groq → OpenRouter fallback
        let careData = {
            health_status: 'Saludable',
            care_instructions: 'Riega cuando la tierra esté seca.',
            watering_frequency_days: 7,
            sunlight_needs: 'Luz indirecta'
        };

        const systemPrompt = `Eres un experto botánico agrícola con capacidad de identificación de plantas.

${plantnetCommon !== "Por identificar" ? `PlantNet sugiere que es: ${plantnetCommon} (${plantnetSpecies})` : 'PlantNet no pudo identificarla, analiza la imagen tú mismo.'}

Tu trabajo es:
1. Si es necesario, identifica la planta en la foto (nombre común y científico si lo sabes).
2. Confirma brevemente la salud o enfermedades visibles.
3. Dar instrucciones exactas de cuidado (luz, abono, riego).
4. Establecer la frecuencia de riego en días (número entero entre 1 y 30).

Responde ÚNICAMENTE con JSON (sin markdown):
{
    "common_name": "Nombre común en español",
    "scientific_name": "Nombre científico o 'Desconocida'",
    "health_status": "Breve estado de salud observado",
    "care_instructions": "Instrucciones de cuidado breves y prácticas",
    "watering_frequency_days": 7,
    "sunlight_needs": "Sol directo / Sombra parcial / Luz indirecta"
}`;

        // Intentar Groq primero
        if (process.env.GROQ_API_KEY) {
            try {
                console.log("🤖 Intentando Groq Vision...");
                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'llama-3.2-90b-vision-preview',
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: systemPrompt },
                                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
                                ]
                            }
                        ]
                    })
                });

                if (groqRes.ok) {
                    const groqData = await groqRes.json();
                    const content = groqData.choices?.[0]?.message?.content;
                    if (content) {
                        careData = JSON.parse(content);
                        console.log("✅ Groq respondió exitosamente");
                    }
                } else {
                    const err = await groqRes.text();
                    console.warn(`⚠️ Groq fallo (${groqRes.status}): ${err.substring(0, 100)}`);
                    throw new Error("Groq fallo, intentando OpenRouter");
                }
            } catch (groqError) {
                console.warn("⚠️ Groq Exception, intentando OpenRouter...");
                
                // Fallback a OpenRouter
                if (process.env.OPENROUTER_API_KEY) {
                    try {
                        console.log("🤖 Intentando OpenRouter Vision...");
                        const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                                'Content-Type': 'application/json',
                                'HTTP-Referer': 'https://quioba.com',
                                'X-Title': 'Quioba Plant Analyzer'
                            },
                            body: JSON.stringify({
                                model: 'gpt-4-vision',
                                messages: [
                                    {
                                        role: "user",
                                        content: [
                                            { type: "text", text: systemPrompt },
                                            { 
                                                type: "image_url", 
                                                image_url: { 
                                                    url: `data:image/jpeg;base64,${base64Data}`,
                                                    detail: "low"
                                                } 
                                            }
                                        ]
                                    }
                                ]
                            })
                        });

                        if (openrouterRes.ok) {
                            const openrouterData = await openrouterRes.json();
                            const content = openrouterData.choices?.[0]?.message?.content;
                            if (content) {
                                careData = JSON.parse(content);
                                console.log("✅ OpenRouter respondió exitosamente");
                            }
                        } else {
                            const err = await openrouterRes.text();
                            console.warn(`⚠️ OpenRouter fallo (${openrouterRes.status}): ${err.substring(0, 100)}`);
                            console.log("ℹ️ Usando análisis genérico");
                        }
                    } catch (openrouterError) {
                        console.warn("⚠️ OpenRouter Exception:", openrouterError);
                        console.log("ℹ️ Usando análisis genérico");
                    }
                } else {
                    console.warn("⚠️ OPENROUTER_API_KEY no configurada");
                    console.log("ℹ️ Usando análisis genérico");
                }
            }
        } else {
            console.warn("⚠️ GROQ_API_KEY no configurada, intentando OpenRouter...");
            
            if (process.env.OPENROUTER_API_KEY) {
                try {
                    console.log("🤖 Intentando OpenRouter Vision...");
                    const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': 'https://quioba.com',
                            'X-Title': 'Quioba Plant Analyzer'
                        },
                        body: JSON.stringify({
                            model: 'gpt-4-vision',
                            messages: [
                                {
                                    role: "user",
                                    content: [
                                        { type: "text", text: systemPrompt },
                                        { 
                                            type: "image_url", 
                                            image_url: { 
                                                url: `data:image/jpeg;base64,${base64Data}`,
                                                detail: "low"
                                            } 
                                        }
                                    ]
                                }
                            ]
                        })
                    });

                    if (openrouterRes.ok) {
                        const openrouterData = await openrouterRes.json();
                        const content = openrouterData.choices?.[0]?.message?.content;
                        if (content) {
                            careData = JSON.parse(content);
                            console.log("✅ OpenRouter respondió exitosamente");
                        }
                    } else {
                        const err = await openrouterRes.text();
                        console.warn(`⚠️ OpenRouter fallo (${openrouterRes.status}): ${err.substring(0, 100)}`);
                        console.log("ℹ️ Usando análisis genérico");
                    }
                } catch (openrouterError) {
                    console.warn("⚠️ OpenRouter Exception:", openrouterError);
                    console.log("ℹ️ Usando análisis genérico");
                }
            } else {
                console.warn("⚠️ OPENROUTER_API_KEY tampoco configurada");
                console.log("ℹ️ Usando análisis genérico con PlantNet solo");
            }
        }

        const result = {
            species: careData.scientific_name || plantnetSpecies,
            common_name: careData.common_name || plantnetCommon,
            watering_frequency_days: careData.watering_frequency_days || 7,
            sunlight_needs: careData.sunlight_needs || 'Luz indirecta',
            health_status: careData.health_status || 'Saludable',
            care_instructions: careData.care_instructions || 'Riega cuando la tierra esté seca.',
        };

        console.log("✅ Análisis completado:", result);
        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Error analyzing plant:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
