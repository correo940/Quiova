import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quioba.app',
  appName: 'Quioba',
  webDir: 'out',
  server: {
    // Carga desde el servidor de producción
    // Para desarrollo local, cambia a: http://TU_IP_LOCAL:3000
    url: 'https://www.quioba.com',
    cleartext: true
  }
};

export default config;
