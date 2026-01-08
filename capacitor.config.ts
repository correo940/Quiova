import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quioba.app',
  appName: 'Quioba',
  webDir: 'out',
  server: {
    // ⚠️ IMPORTANTE: Cambia esto por tu URL real (ej: https://www.quioba.com)
    // Esta es SOLO para desarrollo. En producción, comenta esta línea.
    url: 'https://www.quioba.com',
    cleartext: true
  }
};

export default config;
