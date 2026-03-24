const { execSync } = require('child_process');

console.log('Iniciando build movil de Quioba...');
console.log('La APK usara los assets locales y seguira conectando con produccion para APIs y datos.');

try {
    execSync('npx next build', {
        stdio: 'inherit',
        env: {
            ...process.env,
            STATIC_EXPORT: 'true',
            NEXT_PUBLIC_IS_MOBILE_BUILD: 'true',
        },
    });

    execSync('npx cap sync android', {
        stdio: 'inherit',
        env: process.env,
    });

    console.log('Build movil completado con exito.');
    console.log('Abre android/ en Android Studio y genera la APK desde Build > Build APK(s).');
} catch (error) {
    console.error('Error durante el build movil:', error.message);
    process.exit(1);
}
