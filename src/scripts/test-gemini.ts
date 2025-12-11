import { GoogleGenerativeAI } from "@google/generative-ai";

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

import fs from 'fs';

async function listModels() {
    if (!apiKey) {
        console.error("No API Key found");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTest = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-002",
        "gemini-1.5-pro",
        "gemini-1.5-pro-latest",
        "gemini-1.5-pro-001",
        "gemini-1.5-pro-002",
        "gemini-1.0-pro",
        "gemini-pro",
        "gemini-pro-vision"
    ];

    const results: any = {};

    console.log("Starting model test...");

    for (const modelName of modelsToTest) {
        try {
            console.log(`Testing ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            // For vision models, we might need an image, but let's try text first. 
            // If it fails with "image required", that's a success (model exists).
            // If it fails with "404 not found", that's a failure.
            const result = await model.generateContent("Hello");
            console.log(`✅ SUCCESS: ${modelName}`);
            results[modelName] = "SUCCESS";
        } catch (e: any) {
            if (e.message.includes("404") || e.message.includes("not found")) {
                console.log(`❌ FAILED (404): ${modelName}`);
                results[modelName] = "404 NOT FOUND";
            } else {
                console.log(`⚠️ ERROR (Other): ${modelName} - ${e.message}`);
                results[modelName] = `ERROR: ${e.message}`;
                // If it's not a 404, the model probably exists but maybe needs an image or has other constraints.
                // We can consider this a "partial success" in finding the model.
            }
        }
    }

    fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
    console.log("Results saved to results.json");
}

listModels();
