import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import fs from 'fs';

// Load env from current directory or parent
dotenv.config({ path: '.env.local' });

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

async function checkModels() {
    if (!apiKey) {
        console.error("No API KEY found in environment!");
        return;
    }

    console.log("Using API Key:", apiKey.substring(0, 10) + "...");

    // Note: The google-generative-ai SDK usually provides a ModelService or similar? 
    // Actually the standard GoogleGenerativeAI class doesn't strictly have a 'listModels' helper exposed easily 
    // in all versions, but let's try the common Manager pattern if available, 
    // OR just try the REST API directly to be sure if SDK fails.

    // Let's try REST API for certainty as it avoids SDK version quirks
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        console.log("Fetching models via REST API...");
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Found models, saving to file...");
            fs.writeFileSync('available_models.json', JSON.stringify(data.models, null, 2));
            console.log("Saved to available_models.json");
        } else {
            console.log("No models returned. Data:", JSON.stringify(data, null, 2));
        }
    } catch (err: any) {
        console.error("Fetch error:", err.message);
    }
}

checkModels();
