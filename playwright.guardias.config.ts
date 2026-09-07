import { defineConfig } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

/**
 * Tests "guardia": no abren navegador ni levantan servidor, asi que tardan
 * segundos y sirven para ejecutarlos antes de cada despliegue.
 * Los de navegador siguen en playwright.config.ts.
 */
export default defineConfig({
    testDir: './tests/guardias',
    timeout: 30_000,
    expect: { timeout: 10_000 },
    reporter: [['list']],
    fullyParallel: true,
});
