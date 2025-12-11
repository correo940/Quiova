import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("No API KEY found");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// List of models to brute-force test
// We prioritize Flash models for speed/cost, then Pro, then others.
const candidates = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash-lite-preview-02-05",
    "gemini-2.0-flash-001",
    "gemini-flash-latest",
    "gemini-pro-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash-latest",
    "gemini-2.5-flash",
    "gemini-1.0-pro"
];

async function findWorkingModel() {
    console.log("Starting brute-force test for working model...");

    for (const modelName of candidates) {
        process.stdout.write(`Testing ${modelName.padEnd(35)} ... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            // Simple text generation test
            const result = await model.generateContent("Say 'OK'");
            const response = await result.response;
            const text = response.text();

            console.log(`✅ SUCCESS! Output: ${text.trim()}`);
            console.log(`\n>>> FOUND WORKING MODEL: ${modelName} <<<\n`);
            // return; // Don't stop, find all working ones
        } catch (error: any) {
            let msg = error.message || "Unknown error";
            if (msg.includes("404")) msg = "404 Not Found";
            else if (msg.includes("429")) msg = "429 Quota Exceeded";
            console.log(`❌ FAILED: ${msg}`);
        }
    }

    console.log("\nNo working model found in the candidate list.");
}

findWorkingModel();
