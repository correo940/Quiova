// Aldi (España) no vende alimentación online: su web de producto
// (aldi.es/producto/...) es solo un catálogo informativo sin precio (el
// precio varía por tienda/región — Baleares y Canarias tienen precio
// distinto, así que ni publican uno nacional). El único sitio con precios
// es el folleto semanal en PDF (aldi.es/folleto/semanal-SS-AAAA.html →
// botón "Descargar", un PDF público sin protección, o las imágenes de cada
// página en `ipaper.ipapercms.dk/aldi-spain/semanal/<slug>/Image.ashx?PageNumber=N`).
// Igual que Lidl: sin datos de producto/precio estructurados, solo
// imágenes — hay que leerlo a mano.
//
// Los productos y precios de abajo se leyeron a mano del folleto semanal de
// Aldi Península vigente el 14-20 de septiembre de 2026.
//
// Cubre solo lo que sale en oferta esa semana (no el catálogo fijo
// completo), y el folleto cambia cada semana (día de referencia: lunes),
// así que hay que repetir esta lectura manual una vez por semana para no
// quedarse desactualizado — como Lidl, pero solo una vez (Lidl cambia dos
// veces por semana).

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const envText = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = Object.fromEntries(
    envText.split('\n').filter((l) => l.includes('=')).map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

// id: sintético (página-orden), no hay identificador oficial de Aldi para esto.
const PRODUCTOS = [
    { id: 'p01-01', nombre: 'Manzana Royal Gala', precio: 1.45, formato: 'a granel, kg' },
    { id: 'p01-02', nombre: 'Queso curado', precio: 2.69, formato: '300 g' },
    { id: 'p01-03', nombre: 'Jamón serrano gran reserva', precio: 1.69, formato: '90 g' },
    { id: 'p01-04', nombre: 'Vino tinto monastrell DOP Alicante', precio: 3.49, formato: '0,75 l' },
    { id: 'p01-05', nombre: 'Filetes de pechuga de pollo', precio: 3.65, formato: '570 g aprox.' },
    { id: 'p02-01', nombre: 'Pata de pulpo cocida', precio: 7.99, formato: '250 g' },
    { id: 'p02-02', nombre: 'Magnum Helado bombón mini', precio: 3.99, formato: '6-8 uds' },
    { id: 'p02-03', nombre: 'Esselt Papel multiusos', precio: 2.89, formato: 'rollo jumbo' },
    { id: 'p02-04', nombre: 'Fripozo Solomillo de pollo Kentucky', precio: 2.99, formato: '250 g' },
    { id: 'p02-05', nombre: 'Otoñal Vino blanco verdejo DOP Rueda', precio: 3.99, formato: '0,75 l' },
    { id: 'p04-01', nombre: 'Zespri Kiwi amarillo', precio: 0.65, formato: '124 g aprox.' },
    { id: 'p04-02', nombre: 'Uva de mesa roja sin semillas', precio: 1.35, formato: '500 g' },
    { id: 'p04-03', nombre: 'Fresa', precio: 2.85, formato: '400 g' },
    { id: 'p04-04', nombre: 'Higos', precio: 2.89, formato: '500 g' },
    { id: 'p04-05', nombre: 'Pera ercolina DOP Jumilla', precio: 2.89, formato: '850 g' },
    { id: 'p05-01', nombre: 'Pimiento dulce verde', precio: 1.69, formato: 'a granel, kg' },
    { id: 'p05-02', nombre: 'Espárragos verdes finos', precio: 1.99, formato: '250 g' },
    { id: 'p05-03', nombre: 'Lechuga iceberg', precio: 0.89, formato: '350 g' },
    { id: 'p05-04', nombre: 'Patata especial para freír', precio: 1.32, formato: '3 kg, kg' },
    { id: 'p05-05', nombre: 'Tomate maduro', precio: 1.39, formato: '750 g' },
    { id: 'p06-01', nombre: 'Picada de pollo y pavo', precio: 2.99, formato: '500 g' },
    { id: 'p06-02', nombre: 'Cinta de lomo de cerdo', precio: 4.72, formato: '1,1 kg aprox.' },
    { id: 'p06-03', nombre: 'Hamburguesa de pollo y espinacas', precio: 3.95, formato: '480 g' },
    { id: 'p06-04', nombre: 'Cabeza de lomo fileteada', precio: 3.09, formato: '500 g aprox.' },
    { id: 'p06-05', nombre: 'Alas Crunchy Chicken', precio: 4.79, formato: '600 g aprox.' },
    { id: 'p06-06', nombre: 'Filete de pechuga de pollo empanada', precio: 3.82, formato: '450 g' },
    { id: 'p07-01', nombre: 'Brocheta de cerdo adobado con verduras', precio: 2.91, formato: '350 g aprox.' },
    { id: 'p07-02', nombre: 'Solomillo de cerdo', precio: 4.17, formato: '550 g' },
    { id: 'p07-03', nombre: 'Albóndigas de cerdo', precio: 4.18, formato: '800 g' },
    { id: 'p07-04', nombre: 'Croissant de mantequilla', precio: 0.33, formato: '53 g aprox., 3x0,99€' },
    { id: 'p07-05', nombre: 'Panecillo integral 100%', precio: 0.25, formato: '70 g aprox., 4x1€' },
    { id: 'p07-06', nombre: 'Pan de hogaza gran reserva', precio: 0.99, formato: '400 g aprox.' },
    { id: 'p08-01', nombre: 'La Tabla Queso de oveja ahumado V de Navarra', precio: 3.49, formato: '250 g' },
    { id: 'p08-02', nombre: 'Sal de Plata Atún en aceite de girasol', precio: 1.75, formato: '3 x 52 g' },
    { id: 'p08-03', nombre: 'Carbonell Aceite de oliva suave', precio: 3.99, formato: '1 l' },
    { id: 'p08-04', nombre: 'All Seasons Mix de brócoli, coliflor y zanahoria', precio: 1.49, formato: '1 kg' },
    { id: 'p08-05', nombre: 'Dr. Oetker Ristorante Pizza sin gluten', precio: 4.65, formato: '345-375 g' },
    { id: 'p08-06', nombre: 'Golden Seafood Filete de dorada', precio: 3.49, formato: '180 g' },
    { id: 'p08-07', nombre: 'Coca-Cola Pack ahorro', precio: 10.2, formato: '12 x 330 ml' },
    { id: 'p08-08', nombre: 'Heinz Kétchup', precio: 3.49, formato: '700 g' },
    { id: 'p08-09', nombre: 'La Piara Paté de cerdo', precio: 3.94, formato: '4 x 75 g' },
    { id: 'p09-01', nombre: 'Hellmann\'s Mayonesa', precio: 3.49, formato: '430 ml' },
    { id: 'p09-02', nombre: 'La Villa Mayonesa', precio: 1.32, formato: '475 ml' },
    { id: 'p09-03', nombre: 'Estrella Galicia Cerveza especial', precio: 0.9, formato: '0,33 l' },
    { id: 'p09-04', nombre: 'Karlsquell Cerveza lager especial', precio: 0.34, formato: '0,33 l' },
    { id: 'p09-05', nombre: 'Victoria Málaga Cerveza lager', precio: 6.24, formato: '12 x 0,33 l' },
    { id: 'p09-06', nombre: 'Ladrón de Manzanas Sidra de manzana', precio: 0.89, formato: '0,25 l' },
    { id: 'p09-07', nombre: 'Viña Albali Vino tinto crianza DOP Valdepeñas', precio: 2.79, formato: '0,75 l' },
    { id: 'p09-08', nombre: 'Budweiser Cerveza lager americana', precio: 0.75, formato: '0,33 l' },
    { id: 'p09-09', nombre: 'Rio D\'Oro Zumo exprimido de naranja con pulpa', precio: 1.65, formato: '1 l' },
    { id: 'p09-10', nombre: 'Monster Energy Bebida energética', precio: 1.45, formato: '500 ml' },
    { id: 'p10-01', nombre: 'Crema 100% cacahuete', precio: 2.29, formato: '500 g' },
    { id: 'p10-02', nombre: 'Nestlé Cereales para desayuno (Kit Kat / Cheerios)', precio: 1.99, formato: '190-210 g' },
    { id: 'p10-03', nombre: 'Palmera mix', precio: 2.29, formato: '250 g' },
    { id: 'p10-04', nombre: 'L\'Or Cápsulas de café', precio: 7.75, formato: '20 cápsulas' },
    { id: 'p10-05', nombre: 'Nestlé Extrafino Chocolate con leche', precio: 3.75, formato: '3 x 125 g' },
    { id: 'p10-06', nombre: 'Valor Chocolate con almendras', precio: 3.95, formato: '250 g' },
    { id: 'p10-07', nombre: 'Puleva Peques 3 Leche de crecimiento', precio: 1.89, formato: '1 l' },
    { id: 'p10-08', nombre: 'Grandessa Miel de flores', precio: 4.89, formato: '1 kg' },
    { id: 'p10-09', nombre: 'La Villa Azúcar moreno', precio: 1.79, formato: '1 kg' },
    { id: 'p10-10', nombre: 'Barissimo Café molido natural', precio: 2.45, formato: '250 g' },
    { id: 'p11-01', nombre: 'Esselt Pañuelos faciales 3 capas', precio: 0.99, formato: '120 uds' },
    { id: 'p11-02', nombre: 'Pato Discos activos lima', precio: 2.49, formato: 'unidad' },
    { id: 'p11-03', nombre: 'Dove Desodorante en spray', precio: 3.19, formato: '200 ml' },
    { id: 'p11-04', nombre: 'Moussel Gel de ducha', precio: 3.49, formato: '650+250 ml' },
    { id: 'p11-05', nombre: 'H&S Champú anticaspa XL', precio: 7.13, formato: '800 ml' },
    { id: 'p11-06', nombre: 'Nivea Leche / Loción corporal Q10', precio: 3.89, formato: '250 ml' },
    { id: 'p11-07', nombre: 'Listerine Enjuague bucal', precio: 5.15, formato: '500 ml' },
    { id: 'p12-01', nombre: 'Sal de Plata Mejillones en escabeche', precio: 1.49, formato: '69 g' },
    { id: 'p14-01', nombre: 'La Tabla Pechuga de pollo cocida loncheada', precio: 1.99, formato: '150 g' },
    { id: 'p14-02', nombre: 'La Tabla Pechuga de pollo (natural / ahumada)', precio: 2.09, formato: '150 g' },
    { id: 'p14-03', nombre: 'La Tabla Pechuga de pavo', precio: 2.35, formato: '150 g' },
    { id: 'p14-04', nombre: 'La Tabla Jamón cocido extra reducido en sal', precio: 1.99, formato: '200 g' },
    { id: 'p14-05', nombre: 'Pleno Sabor Jamón serrano gran reserva', precio: 1.69, formato: '90 g' },
    { id: 'p14-06', nombre: 'La Tabla Jamón serrano gran reserva', precio: 3.85, formato: '240 g' },
    { id: 'p14-07', nombre: 'La Tabla Jamón serrano reserva 50% duroc', precio: 2.65, formato: '100 g' },
    { id: 'p14-08', nombre: 'La Tabla Longaniza rústica al corte', precio: 2.39, formato: '100 g' },
    { id: 'p14-09', nombre: 'La Tabla Embutidos de pavo (chorizo / salchichón)', precio: 2.69, formato: '150 g' },
    { id: 'p14-10', nombre: 'La Tabla Pepperoni lonchas', precio: 1.55, formato: '75 g' },
    { id: 'p15-01', nombre: 'La Tabla Queso tierno', precio: 2.29, formato: '300 g' },
    { id: 'p15-02', nombre: 'La Tabla Queso tierno', precio: 7.39, formato: '980 g' },
    { id: 'p15-03', nombre: 'Milsani Queso fresco de vaca', precio: 1.55, formato: '250 g' },
    { id: 'p15-04', nombre: 'Milsani Queso fresco (cabra / vaca y cabra)', precio: 2.85, formato: '250 g' },
    { id: 'p15-05', nombre: 'Milsani Queso fresco burgos', precio: 1.99, formato: 'pack 2 x 250 g' },
    { id: 'p15-06', nombre: 'Milsani Queso fresco burgos', precio: 1.09, formato: 'pack 4 x 62,5 g' },
    { id: 'p15-07', nombre: 'Milsani Queso fresco burgos 0%', precio: 1.09, formato: 'pack 4 x 62,5 g' },
    { id: 'p15-08', nombre: 'Milsani Lonchas de queso tierno', precio: 1.95, formato: '200 g' },
    { id: 'p15-09', nombre: 'Milsani Lonchas de queso de vaca', precio: 1.59, formato: '200 g' },
    { id: 'p15-10', nombre: 'Milsani Lonchas de queso cremoso', precio: 2.69, formato: '300 g' },
    { id: 'p23-01', nombre: 'Cachet Pienso para gatos esterilizados', precio: 5.95, formato: '3 kg' },
    { id: 'p26-01', nombre: 'Con un Par Vino tinto monastrell DOP Alicante', precio: 3.49, formato: '0,75 l' },
    { id: 'p26-02', nombre: 'Time Lapse Vino tinto red blend DOP Navarra', precio: 3.99, formato: '0,75 l' },
    { id: 'p26-03', nombre: 'Valdeoliva Vino tinto tempranillo roble', precio: 2.99, formato: '0,75 l' },
    { id: 'p26-04', nombre: 'Viña Leirado Vino tinto mencía DOP Ribeira Sacra', precio: 2.99, formato: '0,75 l' },
    { id: 'p26-05', nombre: 'Camboral Vino tinto monastrell criado en ánfora DOP Alicante', precio: 4.49, formato: '0,75 l' },
    { id: 'p26-06', nombre: 'Era Costana Vino tinto crianza DOCa Rioja', precio: 3.99, formato: '0,75 l' },
    { id: 'p26-07', nombre: 'La Tabla Queso viejo reserva', precio: 3.99, formato: '375 g' },
    { id: 'p26-08', nombre: 'Devina Dados de queso en aceite y hierbas', precio: 2.99, formato: '200 g' },
    { id: 'p26-09', nombre: 'Aire Sano Jamón DOP Teruel en lonchas', precio: 3.99, formato: '130 g' },
    { id: 'p26-10', nombre: 'España e Hijos Lomo embuchado en lonchas', precio: 3.99, formato: '200 g' },
    { id: 'p27-01', nombre: 'Blume Vino blanco sauvignon blanc DOP Rueda', precio: 4.49, formato: '0,75 l' },
    { id: 'p27-02', nombre: 'Blume Pack de 2 vinos blancos verdejo DOP Rueda', precio: 10.99, formato: '2 x 0,75 l' },
    { id: 'p27-03', nombre: 'Vino blanco godello sobre lías edición limitada', precio: 4.99, formato: '0,75 l' },
    { id: 'p27-04', nombre: 'Camboral Vino blanco viognier sobre lías', precio: 3.79, formato: '0,75 l' },
    { id: 'p27-05', nombre: 'Mucho Mas Pack de 2 vinos blancos', precio: 11.99, formato: '2 x 0,75 l' },
    { id: 'p27-06', nombre: 'Victoria Málaga Cerveza lager', precio: 0.95, formato: '0,5 l' },
    { id: 'p27-07', nombre: 'Voll-Damm Cerveza lager doble malta', precio: 1.25, formato: '0,5 l' },
    { id: 'p27-08', nombre: 'Trader Joe\'s Mix frutos secos mediterráneo', precio: 2.29, formato: '125 g' },
    { id: 'p28-01', nombre: 'Corazones de cogollo', precio: 1.49, formato: '450 g' },
    { id: 'p28-02', nombre: 'Mandarina', precio: 2.09, formato: 'a granel, kg' },
    { id: 'p28-03', nombre: 'Alas de pollo partidas', precio: 2.29, formato: '550 g aprox.' },
    { id: 'p28-04', nombre: 'Chorizo criollo', precio: 2.59, formato: '360 g' },
    { id: 'p28-05', nombre: 'Ezequiel Sartas ahumadas (chorizo / salchichón)', precio: 3.19, formato: '250 g' },
    { id: 'p28-06', nombre: 'Karlsquell Cerveza 100% malta', precio: 0.35, formato: '0,33 l' },
];

const ahora = new Date().toISOString();
const filas = PRODUCTOS.map((p) => ({
    supermercado: 'aldi',
    producto_externo_id: p.id,
    nombre: p.nombre,
    precio: p.precio,
    formato: p.formato,
    ean: null,
    imagen_url: null,
    actualizado_en: ahora,
}));

console.log('Filas a guardar:', filas.length);

const { error } = await supabaseAdmin
    .from('precios_supermercado')
    .upsert(filas, { onConflict: 'supermercado,producto_externo_id' });

if (error) console.error('Error guardando:', error.message);
else console.log('Guardados:', filas.length);
