import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quiova.app',
  appName: 'Quiova',
  webDir: 'out',
  server: {
    // ⚠️ IMPORTANTE: Cambia esto por tu URL real (ej: https://quiova.vercel.app)
    // Para probar en local con el móvil en la misma red wifi: http://192.168.1.X:3000
    url: 'https://quiova.vercel.app',
    cleartext: true
  }
};

export default config;
