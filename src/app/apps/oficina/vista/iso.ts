// ─── Proyección isométrica (2:1) ─────────────────────────────────────────────
// Coordenadas de rejilla (celdas) → coordenadas de pantalla SVG.

export const TILE_W = 64;
export const TILE_H = 32;

/** Convierte celda (gx, gy) a punto de pantalla [x, y]. */
export function iso(gx: number, gy: number): [number, number] {
    return [(gx - gy) * (TILE_W / 2), (gx + gy) * (TILE_H / 2)];
}

/** Punto "x,y" listo para un atributo points de SVG. */
export function p(gx: number, gy: number): string {
    const [x, y] = iso(gx, gy);
    return `${x},${y}`;
}

/** Rombo de suelo que cubre el rectángulo de celdas (gx,gy)–(gx+w,gy+h). */
export function suelo(gx: number, gy: number, w: number, h: number): string {
    return [p(gx, gy), p(gx + w, gy), p(gx + w, gy + h), p(gx, gy + h)].join(' ');
}

/** Muro vertical extruido `alto` px hacia arriba entre dos celdas. */
export function muro(x1: number, y1: number, x2: number, y2: number, alto: number): string {
    const [ax, ay] = iso(x1, y1);
    const [bx, by] = iso(x2, y2);
    return `${ax},${ay} ${bx},${by} ${bx},${by - alto} ${ax},${ay - alto}`;
}

/** Las tres caras visibles de una caja isométrica en (gx,gy) de tamaño w×d y alto px. */
export function caja(gx: number, gy: number, w: number, d: number, alto: number) {
    const top = (dy: number) =>
        [p(gx, gy), p(gx + w, gy), p(gx + w, gy + d), p(gx, gy + d)]
            .map(pt => {
                const [x, y] = pt.split(',').map(Number);
                return `${x},${y - dy}`;
            })
            .join(' ');
    return {
        top: top(alto),
        // cara derecha (este)
        derecha: muro(gx + w, gy, gx + w, gy + d, alto),
        // cara frontal (sur)
        frente: muro(gx, gy + d, gx + w, gy + d, alto),
    };
}
