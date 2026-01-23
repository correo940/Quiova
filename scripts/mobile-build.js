const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiPath = path.join(process.cwd(), 'src/app/api');
const backupPath = path.join(process.cwd(), 'src/app/_api');

console.log('🚀 Iniciando build optimizado para Móvil...');

try {
    // 1. Ocultar carpeta API para evitar errores de Next.js Static Export
    if (fs.existsSync(apiPath)) {
        console.log('📦 Ocultando temporalmente la carpeta API...');
        fs.renameSync(apiPath, backupPath);
    }

    // 2. Ejecutar el build de Next.js
    console.log('🛠️ Ejecutando next build...');
    process.env.STATIC_EXPORT = 'true';
    execSync('npx next build', {
        stdio: 'inherit',
        env: { ...process.env, STATIC_EXPORT: 'true' }
    });

    console.log('✅ Build completado con éxito.');

} catch (error) {
    console.error('❌ Error durante el build:', error.message);
    process.exit(1);
} finally {
    // 3. Restaurar carpeta API pase lo que pase
    if (fs.existsSync(backupPath)) {
        console.log('📂 Restaurando carpeta API...');
        try {
            fs.renameSync(backupPath, apiPath);
        } catch (e) {
            console.error('⚠️ No se pudo restaurar la carpeta API automáticamente. Por favor, renombra "src/app/_api" a "src/app/api" manualmente.');
        }
    }
}
