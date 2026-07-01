const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const inputVideo = './public/input-video.mp4';
const outputVideo = './out/video-with-subtitles.mp4';
const transcript = JSON.parse(fs.readFileSync('./out/transcript.json', 'utf-8'));
const words = transcript.words || [];

console.log('🎬 Renderizando video con subtítulos dinámicos...\n');

// Crear filtro FFmpeg complejo para subtítulos con colores dinámicos
// Usaremos drawtext filter con expresiones de tiempo

let filterComplex = '[0:v]';
const GREEN = '0x1a5c2e'; // Verde Quioba en hex
const WHITE = '0xffffff';

// Para cada palabra, crear un drawtext que aparezca en el tiempo correcto
let textFilters = [];
words.forEach((word, idx) => {
    const escapedWord = word.word.replace(/'/g, "\\'");
    // Expresión: blanca por defecto, verde durante el tiempo de la palabra
    const isActiveExpr = `between(t,${word.start},${word.end})?${GREEN}:${WHITE}`;

    textFilters.push(
        `drawtext=text='${escapedWord}':x='(w-text_w)/2':y='h-100':fontsize=32:fontcolor='${isActiveExpr}':fontfile='C\\\\:\\\\\\\\Windows\\\\\\\\Fonts\\\\\\\\arial.ttf':enable='between(t,${word.start},${word.end+0.5})'`
    );
});

// Combinar todos los filtros
let ffmpegCmd = `ffmpeg -i "${inputVideo}" -vf "${filterComplex.slice(0, -1)}${textFilters.join(',')}${']'}format=yuv420p" -c:a copy "${outputVideo}" -y`;

// Versión simplificada: solo agregar subtítulos de texto básico
// Esto es más compatible
const simpleFilterComplex = `[0:v]drawtext=textfile='./out/subtitles.vtt':fontsize=28:fontcolor=white:x='(w-text_w)/2':y='h-100':fontfile='C\\\\:\\\\\\\\Windows\\\\\\\\Fonts\\\\\\\\arial.ttf'[v];[v]scale=1080:1920[out]`;

// Aún más simple: usar subtítulos SRT directamente
const srtFilterComplex = `[0:v]scale=1080:1920[v];[v]subtitles='./out/subtitles.srt':force_style='FontSize=28,FontName=Arial,PrimaryColour=&HFFFFFF'[out]`;

console.log('📝 Generando video con subtítulos SRT...\n');
const ffmpegSrtCmd = `ffmpeg -i "${inputVideo}" -vf "subtitles='./out/subtitles.srt':force_style='FontSize=28,PrimaryColour=&HFFFFFF'" -c:a copy "${outputVideo}" -y`;

try {
    execSync(ffmpegSrtCmd, { stdio: 'inherit', shell: true });
    console.log('\n✅ Video generado: ' + outputVideo);
} catch (err) {
    console.error('\n❌ Error en ffmpeg:', err.message);
    process.exit(1);
}
