require('dotenv').config({ path: '.env.local' });
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

async function transcribe() {
    const audioPath = path.join(__dirname, '../out/audio.mp3');

    if (!fs.existsSync(audioPath)) {
        console.error('Audio file not found:', audioPath);
        process.exit(1);
    }

    console.log('🎙️ Transcribing...');

    const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-large-v3-turbo',
        language: 'es',
        response_format: 'verbose_json',
    });

    console.log('\n✅ Transcription complete');
    console.log('Text:', transcription.text);

    if (transcription.segments) {
        console.log('\n📍 Word-level timing:');
        const words = [];
        for (const segment of transcription.segments) {
            if (segment.words) {
                for (const word of segment.words) {
                    words.push({
                        word: word.word.trim(),
                        start: Math.round(word.start * 1000) / 1000,
                        end: Math.round(word.end * 1000) / 1000,
                    });
                    console.log(`  ${word.word.trim().padEnd(15)} ${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s`);
                }
            }
        }

        // Save to JSON
        fs.writeFileSync(
            path.join(__dirname, '../out/transcript.json'),
            JSON.stringify({ text: transcription.text, words }, null, 2)
        );
        console.log('\n💾 Saved to out/transcript.json');
    }
}

transcribe().catch(console.error);
