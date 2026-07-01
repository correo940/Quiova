const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const publicDir = path.join(__dirname, '../public');

const server = http.createServer((req, res) => {
    const filePath = path.join(publicDir, req.url === '/' ? 'index.html' : req.url);
    const normalizedPath = path.normalize(filePath);

    // Seguridad: no permitir acceso fuera de public
    if (!normalizedPath.startsWith(publicDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(normalizedPath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }

        const ext = path.extname(normalizedPath);
        const contentType = {
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mp3': 'audio/mpeg',
            '.json': 'application/json',
            '.html': 'text/html',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
        }[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`🌐 Server running at http://localhost:${PORT}`);
    console.log(`📁 Serving from: ${publicDir}`);
    console.log('\n🎬 En otra terminal, ejecuta:\n   npx remotion render remotion/index.ts VideoWithSubtitles out/video-with-subtitles.mp4\n');
    console.log('Presiona Ctrl+C para detener el servidor.');
});
