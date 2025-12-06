import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

import fs from 'fs';

async function checkModels() {
    if (!apiKey) {
        console.error("No API Key found");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        fs.writeFileSync('models.json', JSON.stringify(data, null, 2));
        console.log("Saved models to models.json");

    } catch (error: any) {
        console.error("Fetch error:", error);
        fs.writeFileSync('models.json', JSON.stringify({ error: error.message }, null, 2));
    }
}

checkModels();
