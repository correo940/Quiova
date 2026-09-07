import { expect, test } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { debeMostrarAvisoIOS } from '../../src/lib/ios-install';

/**
 * El aviso de "Añadir a pantalla de inicio" solo debe salir a quien puede
 * hacerlo: Safari en iPhone o iPad, sin la app ya instalada. Si sale en un
 * escritorio o en Chrome de iOS, es un cartel inutil que estorba.
 */

const base = { maxTouchPoints: 5, yaInstalada: false, descartado: false };

const UA = {
    iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1',
    ipadSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
    macEscritorio: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
};

test('sale en Safari de iPhone', () => {
    expect(debeMostrarAvisoIOS({ ...base, userAgent: UA.iphoneSafari })).toBe(true);
});

test('sale en Safari de iPad, que se hace pasar por Mac', () => {
    expect(debeMostrarAvisoIOS({ ...base, userAgent: UA.ipadSafari, maxTouchPoints: 5 })).toBe(true);
});

test('no sale en Chrome de iPhone, que no puede instalar', () => {
    expect(debeMostrarAvisoIOS({ ...base, userAgent: UA.iphoneChrome })).toBe(false);
});

test('no sale en Android, que ya tiene su propio aviso', () => {
    expect(debeMostrarAvisoIOS({ ...base, userAgent: UA.android, maxTouchPoints: 5 })).toBe(false);
});

test('no sale en un Mac de escritorio (sin pantalla tactil)', () => {
    expect(debeMostrarAvisoIOS({ ...base, userAgent: UA.macEscritorio, maxTouchPoints: 0 })).toBe(false);
});

test('no sale en Windows', () => {
    expect(debeMostrarAvisoIOS({ ...base, userAgent: UA.windows, maxTouchPoints: 0 })).toBe(false);
});

test('no sale si ya esta instalada en la pantalla de inicio', () => {
    expect(debeMostrarAvisoIOS({ ...base, userAgent: UA.iphoneSafari, yaInstalada: true })).toBe(false);
});

test('no vuelve a salir si lo cerraron', () => {
    expect(debeMostrarAvisoIOS({ ...base, userAgent: UA.iphoneSafari, descartado: true })).toBe(false);
});

test('el viewport deja sitio a la muesca del iPhone', () => {
    // Sin viewport-fit=cover, los env(safe-area-inset-*) del CSS valen 0 y el
    // contenido se mete debajo de la barra de estado translucida.
    const layout = readFileSync(join(process.cwd(), 'src', 'app', 'layout.tsx'), 'utf8');
    expect(layout).toMatch(/viewportFit:\s*'cover'/);
});
