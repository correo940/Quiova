const fs = require('fs');
const path = require('path');

const transcript = JSON.parse(fs.readFileSync(path.join(__dirname, '../out/transcript.json'), 'utf-8'));
const text = transcript.text.trim();
const totalDuration = 8.29; // segundos

// Dividir en palabras
const words = text.split(/\s+/).filter(w => w.length > 0);
console.log(`📝 Total de palabras: ${words.length}`);

// Estimar tiempos: distribución uniforme simple
const avgWordDuration = totalDuration / words.length;
console.log(`⏱️  Duración promedio por palabra: ${avgWordDuration.toFixed(3)}s`);

const wordsTiming = words.map((word, i) => ({
    word: word.replace(/,|\./, ''), // eliminar puntuación
    originalWord: word,
    start: parseFloat((i * avgWordDuration).toFixed(3)),
    end: parseFloat(((i + 1) * avgWordDuration).toFixed(3)),
}));

// Guardar
const result = {
    text,
    totalDuration,
    words: wordsTiming,
};

fs.writeFileSync(
    path.join(__dirname, '../out/transcript.json'),
    JSON.stringify(result, null, 2)
);

console.log('\n✅ Timing estimado:');
wordsTiming.forEach((w) => {
    console.log(`  ${w.originalWord.padEnd(15)} ${w.start.toFixed(2)}s → ${w.end.toFixed(2)}s`);
});

console.log(`\n💾 Guardado en out/transcript.json`);
