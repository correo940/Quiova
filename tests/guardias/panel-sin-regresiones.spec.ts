import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * El panel llego a lanzar 54 peticiones al abrirse, 21 de ellas fallando.
 * Estas tres comprobaciones evitan volver a caer en las mismas trampas.
 */

const DASHBOARD = join(process.cwd(), 'src', 'components', 'dashboard');

function ficherosDashboard(dir: string): string[] {
    const salida: string[] = [];
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
        const ruta = join(dir, entrada.name);
        if (entrada.isDirectory()) salida.push(...ficherosDashboard(ruta));
        else if (entrada.name.endsWith('.tsx')) salida.push(ruta);
    }
    return salida;
}

test('ningun efecto del panel depende del objeto user completo', () => {
    // El contexto reemplaza `user` varias veces al arrancar: son objetos
    // distintos para el mismo usuario, y cada uno relanza la carga de datos.
    const culpables: string[] = [];

    for (const fichero of ficherosDashboard(DASHBOARD)) {
        const codigo = readFileSync(fichero, 'utf8');
        // deps del tipo }, [algo, user]) -- pero no user?.id
        if (/\}, \[[^\]]*[^.?\w]user\s*\]\)/.test(codigo) || /\}, \[\s*user\s*\]\)/.test(codigo)) {
            culpables.push(fichero.split(/[\\/]/).pop()!);
        }
    }

    expect(culpables, `Usan [user] en vez de [user?.id]: ${culpables.join(', ')}`).toEqual([]);
});

test('el panel espera a saber la plataforma antes de montar un diseno', () => {
    // Sin esto monta el diseno de escritorio, lo tira y monta el de movil,
    // duplicando todas las peticiones de todos los widgets.
    const codigo = readFileSync(join(DASHBOARD, 'home-dashboard.tsx'), 'utf8');

    expect(codigo).toContain('isResolved');
    expect(codigo.indexOf('if (!isResolved)')).toBeLessThan(codigo.indexOf('if (isMobile)'));
});

test('los contadores del panel van en una sola llamada', () => {
    // Once COUNT simultaneos saturaban las conexiones y devolvian 503.
    const widget = readFileSync(join(DASHBOARD, 'widgets', 'apps-summary-widget.tsx'), 'utf8');

    expect(widget).toContain("rpc('dashboard_counts'");
    expect(widget, 'vuelve a haber COUNT sueltos en el panel').not.toContain("count: 'exact', head: true");
});
