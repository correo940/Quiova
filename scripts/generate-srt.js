const fs = require('fs');
const path = require('path');

const transcript = JSON.parse(fs.readFileSync(path.join(__dirname, '../out/transcript.json'), 'utf-8'));
const words = transcript.words || [];

// Agrupar palabras en líneas (máx 5-6 palabras por línea para subtítulos)
const wordsPerLine = 5;
const lines = [];

for (let i = 0; i < words.length; i += wordsPerLine) {
    const lineWords = words.slice(i, i + wordsPerLine);
    lines.push({
        words: lineWords,
        start: lineWords[0].start,
        end: lineWords[lineWords.length - 1].end,
        text: lineWords.map(w => w.word).join(' '),
    });
}

// Generar SRT
let srtContent = '';
lines.forEach((line, idx) => {
    const startMs = Math.floor(line.start * 1000);
    const endMs = Math.floor(line.end * 1000);
    const startTime = formatTime(line.start);
    const endTime = formatTime(line.end);

    srtContent += `${idx + 1}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${line.text}\n\n`;
});

fs.writeFileSync(path.join(__dirname, '../out/subtitles.srt'), srtContent);
console.log('✅ SRT generado en out/subtitles.srt');
console.log('\nPrimeras 3 líneas:');
console.log(srtContent.split('\n\n').slice(0, 3).join('\n\n'));

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds * 1000) % 1000);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}
