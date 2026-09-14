// Lidl no tiene catálogo online ni API: solo vende alimentación por folleto
// semanal (ofertas puntuales, no todo el surtido). No hay forma de leerlo por
// código — el folleto es imágenes de página sin datos de producto/precio
// estructurados (ver endpoints.leaflets.schwarz/v4/flyer, que da la imagen de
// cada página pero solo un totum revolutum de palabras clave, no pares
// nombre-precio fiables).
//
// Por eso esto no es un script automático: los productos y precios de abajo
// se leyeron a mano, página a página, del folleto de Alimentación de Lidl
// vigente el 14-20 de septiembre de 2026 (bajado con
// `curl https://assets.leaflets.schwarz/leaflets/pdfs/.../FOLLETO-....pdf`,
// o página a página desde las URLs `image` de cada objeto en
// `flyer.pages[]` de esa misma API).
//
// Solo cubre lo que sale en el folleto de esta semana (unos 100-200
// productos en oferta), no el surtido fijo completo — cosas genéricas como
// "pan de molde normal" o "huevos" pueden no aparecer nunca. Y caduca cada
// pocos días: el folleto cambia los lunes y los viernes, así que para tener
// a Lidl razonablemente al día habría que repetir esta lectura manual dos
// veces por semana (mucho más esfuerzo que Carrefour, que se relee con un
// script en segundos).
//
// Precio guardado: el que aparece grande en amarillo/rojo en el folleto tal
// cual (incluye descuentos "Con Lidl Plus", que no cuestan nada activar
// desde la app, igual que en Mercadona no hace falta tarjeta de fidelidad
// para casi ningún precio mostrado).

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

// id: sintético (página-orden), no hay identificador oficial de Lidl para esto.
const PRODUCTOS = [
    { id: 'p01-01', nombre: 'Melocotón rojo', precio: 1.99, formato: 'a granel, kg' },
    { id: 'p01-02', nombre: 'Filete de lomo adobado', precio: 2.95, formato: 'aprox. 500 g' },
    { id: 'p01-03', nombre: 'Langostino cocido 16/24 piezas', precio: 3.19, formato: '400 g' },
    { id: 'p01-04', nombre: 'Milbona Mezcla 4 quesos', precio: 1.35, formato: '200 g' },
    { id: 'p01-05', nombre: 'Vitasia Mejillones en salsa de curry verde', precio: 2.99, formato: '450 g' },
    { id: 'p01-06', nombre: 'Vitasia Platos preparados (dim sum / rollitos primavera)', precio: 1.99, formato: '200-280 g, desde' },
    { id: 'p02-01', nombre: 'Lechuga iceberg', precio: 0.85, formato: 'unidad' },
    { id: 'p02-02', nombre: 'Aguacate', precio: 3.59, formato: 'a granel, kg' },
    { id: 'p04-01', nombre: 'Calabaza', precio: 1.29, formato: 'a granel, kg' },
    { id: 'p04-02', nombre: 'Pera conferencia', precio: 1.69, formato: '1 kg' },
    { id: 'p04-03', nombre: 'Cebolla', precio: 1.99, formato: '2 kg' },
    { id: 'p05-01', nombre: 'Limón malla', precio: 2.55, formato: '1 kg' },
    { id: 'p05-02', nombre: 'Puerro', precio: 2.29, formato: '500 g' },
    { id: 'p06-01', nombre: 'Barra campera', precio: 0.62, formato: '250 g' },
    { id: 'p06-02', nombre: 'Panecillo multisemillas', precio: 0.49, formato: '85 g' },
    { id: 'p06-03', nombre: 'Pan campeón del mundo', precio: 1.79, formato: '750 g' },
    { id: 'p07-01', nombre: 'Pan de centeno 67%', precio: 2.99, formato: '1 kg' },
    { id: 'p07-02', nombre: 'Panecillo espelta integral', precio: 0.2, formato: '85 g, 5 por 1€' },
    { id: 'p07-03', nombre: 'Napolitana de york y queso', precio: 0.67, formato: '102 g, 3 por 2€' },
    { id: 'p07-04', nombre: 'Croissant de mantequilla', precio: 0.4, formato: '53 g, 3 por 1,19€' },
    { id: 'p07-05', nombre: 'Minicroissant de chocolate', precio: 0.25, formato: '25 g' },
    { id: 'p08-01', nombre: 'Muslos de pollo con patatas (airfryer)', precio: 3.99, formato: 'aprox. 650 g' },
    { id: 'p08-02', nombre: 'Jamoncitos de pollo con verduras (airfryer)', precio: 4.49, formato: 'aprox. 750 g' },
    { id: 'p08-03', nombre: 'Secreto de cerdo con espárragos (airfryer)', precio: 5.99, formato: 'aprox. 650 g' },
    { id: 'p08-04', nombre: 'Pechuga de pollo con patatas y cebolla (airfryer)', precio: 4.99, formato: 'aprox. 650 g' },
    { id: 'p08-05', nombre: 'Pluma de cerdo con patatas (airfryer)', precio: 7.49, formato: 'aprox. 650 g' },
    { id: 'p09-01', nombre: 'Milanesa de cerdo rellena de bacon y queso', precio: 2.99, formato: 'aprox. 280 g' },
    { id: 'p09-02', nombre: 'Milanesa de pollo rellena de pavo y queso', precio: 3.42, formato: 'aprox. 300 g' },
    { id: 'p09-03', nombre: 'Cachopo de vacuno relleno de jamón y queso', precio: 4.39, formato: 'aprox. 250 g' },
    { id: 'p09-04', nombre: 'Nuggets de pechuga de pollo', precio: 3.79, formato: '435 g' },
    { id: 'p09-05', nombre: 'Pechuga de pollo empanada prefrita', precio: 3.48, formato: 'aprox. 410 g' },
    { id: 'p09-06', nombre: 'Solomillo crujiente de pollo', precio: 4.35, formato: 'aprox. 500 g' },
    { id: 'p09-07', nombre: 'Fingers de pollo', precio: 4.15, formato: 'aprox. 500 g' },
    { id: 'p09-08', nombre: 'Filete de vacuno empanado', precio: 3.99, formato: '290 g' },
    { id: 'p09-09', nombre: 'Filete empanado de cerdo', precio: 3.81, formato: 'aprox. 400 g' },
    { id: 'p10-01', nombre: 'Chuletas de aguja de cerdo', precio: 3.55, formato: 'aprox. 700 g' },
    { id: 'p10-02', nombre: 'Estofado de cerdo', precio: 2.65, formato: 'aprox. 550 g' },
    { id: 'p10-03', nombre: 'Butifarra extra familiar', precio: 3.69, formato: '700 g' },
    { id: 'p11-01', nombre: 'Hamburguesa de vacuno de raza frisona', precio: 3.39, formato: '2 x 150 g' },
    { id: 'p12-01', nombre: 'Solomillo de cerdo', precio: 3.59, formato: 'aprox. 500 g' },
    { id: 'p12-02', nombre: 'Filete de ternera 1ªA', precio: 7.29, formato: 'aprox. 450 g' },
    { id: 'p12-03', nombre: 'Pechuga de pavo al ajillo', precio: 3.89, formato: 'aprox. 550 g' },
    { id: 'p13-01', nombre: 'Ocean Sea Medallón de merluza', precio: 4.19, formato: '527 g' },
    { id: 'p13-02', nombre: 'Sepia limpia', precio: 4.99, formato: '400 g' },
    { id: 'p13-03', nombre: 'Ocean Sea Porciones de bacalao', precio: 9.19, formato: '600 g' },
    { id: 'p13-04', nombre: 'Filete de salmón', precio: 15.99, formato: 'aprox. 1 kg' },
    { id: 'p13-05', nombre: 'Filetes de lubina', precio: 6.84, formato: 'aprox. 300 g' },
    { id: 'p13-06', nombre: 'Dorada limpia', precio: 6.25, formato: 'aprox. 500 g' },
    { id: 'p14-01', nombre: 'Chef Select Alitas de pollo asadas', precio: 4.29, formato: 'aprox. 500 g' },
    { id: 'p14-02', nombre: 'Chef Select Pulled pork / chicken', precio: 4.19, formato: '550 g' },
    { id: 'p14-03', nombre: 'Chef Select Delicias de pollo', precio: 3.79, formato: '400 g' },
    { id: 'p14-04', nombre: 'Chef Select Canelón de carne', precio: 4.49, formato: '1,1 kg' },
    { id: 'p14-05', nombre: 'Chef Select Lasaña de carne', precio: 4.39, formato: '1,1 kg' },
    { id: 'p15-01', nombre: 'Chef Select Empanadas pollo al curry / verduras y queso', precio: 2.19, formato: '160 g' },
    { id: 'p15-02', nombre: 'Chef Select Burritos estilo mexicano', precio: 2.19, formato: '250 g' },
    { id: 'p15-03', nombre: 'Chef Select Flautas de pollo asado', precio: 2.09, formato: '280 g' },
    { id: 'p15-04', nombre: 'Chef Select Flauta bacon crispy', precio: 2.69, formato: '280 g' },
    { id: 'p15-05', nombre: 'Chef Select Flautas jamón y queso / bacon', precio: 2.09, formato: '275 g' },
    { id: 'p15-06', nombre: 'Chef Select Focaccia con romero y tomillo', precio: 1.59, formato: '2 x 150 g' },
    { id: 'p16-01', nombre: 'Milbona Kéfir bebible de frutas', precio: 1.59, formato: '6 x 100 g' },
    { id: 'p16-02', nombre: 'Milbona Yogur bebible de frutas', precio: 1.29, formato: '1 kg' },
    { id: 'p16-03', nombre: 'Milbona Yogur bebible de fresa', precio: 1.95, formato: '12 x 100 g' },
    { id: 'p17-01', nombre: 'Milbona Yogur griego de stracciatella', precio: 1.79, formato: '6 x 125 g' },
    { id: 'p17-02', nombre: 'Milbona Yogur griego natural', precio: 1.39, formato: '6 x 125 g' },
    { id: 'p17-03', nombre: 'Milbona Yogur griego de vainilla', precio: 1.59, formato: '6 x 125 g' },
    { id: 'p17-04', nombre: 'Milbona Yogur griego azucarado', precio: 1.29, formato: '6 x 125 g' },
    { id: 'p18-01', nombre: 'Milbona Especial pasta en polvo', precio: 0.95, formato: '150 g' },
    { id: 'p18-02', nombre: 'Milbona Emmental rallado', precio: 1.48, formato: '200 g' },
    { id: 'p18-03', nombre: 'Milbona Gouda rallado', precio: 1.39, formato: '200 g' },
    { id: 'p18-04', nombre: 'Milbona Mozzarella rallada', precio: 1.95, formato: '250 g' },
    { id: 'p18-05', nombre: 'Milbona Rallado especial para fundir', precio: 1.89, formato: '400 g' },
    { id: 'p19-01', nombre: 'Combino Salsa para pasta', precio: 1.29, formato: '400 ml' },
    { id: 'p19-02', nombre: 'Chef Select Salsa fresca para pasta', precio: 1.15, formato: '140-180 g' },
    { id: 'p19-03', nombre: 'Combino Hélices vegetales', precio: 1.15, formato: '1 kg' },
    { id: 'p19-04', nombre: 'Combino Pajaritas vegetales', precio: 0.85, formato: '500 g' },
    { id: 'p19-05', nombre: 'Combino Pasta tiburón', precio: 0.59, formato: '500 g' },
    { id: 'p19-06', nombre: 'Combino Macarrón rayado integral', precio: 1.09, formato: '500 g' },
    { id: 'p19-07', nombre: 'Combino Spaghetti n°3', precio: 1.09, formato: '1 kg' },
    { id: 'p20-01', nombre: 'Gelatelli Helado almendrado', precio: 2.65, formato: '6 x 84 g' },
    { id: 'p21-01', nombre: 'Bon Gelati Tarrina de matcha latte y fresa', precio: 1.99, formato: '500 g' },
    { id: 'p21-02', nombre: 'Bon Gelati Tarrina de chocolate chips', precio: 2.99, formato: '528 g' },
    { id: 'p21-03', nombre: 'Gelatelli Helado en tarrina', precio: 3.15, formato: '430 g' },
    { id: 'p21-04', nombre: 'Gelatelli Cono de nata', precio: 1.99, formato: '6 x 70 g' },
    { id: 'p21-05', nombre: 'Bon Gelati Cono de vainilla y chocolate', precio: 2.09, formato: '6 x 75 g' },
    { id: 'p21-06', nombre: 'Bon Gelati Cono de vainilla y fresa', precio: 1.99, formato: '6 x 75 g' },
    { id: 'p21-07', nombre: 'Gelatelli Cono de vainilla', precio: 2.09, formato: '8 x 69 g' },
    { id: 'p22-01', nombre: 'Alesto Mix de frutos secos natural', precio: 5.49, formato: '500 g' },
    { id: 'p23-01', nombre: 'Alesto Mix de frutos secos tostados', precio: 4.99, formato: '300 g' },
    { id: 'p23-02', nombre: 'Alesto Mix de frutos secos', precio: 3.49, formato: '200 g' },
    { id: 'p23-03', nombre: 'Alesto Pistachos de California tostados y salados', precio: 3.49, formato: '300 g' },
    { id: 'p23-04', nombre: 'Alesto Frutos secos (anacardo ecológico / nuez)', precio: 1.95, formato: '150 g' },
    { id: 'p23-05', nombre: 'Alesto Avellanas', precio: 3.79, formato: '200 g' },
    { id: 'p23-06', nombre: 'Alesto Cacahuetes tostados y salados', precio: 0.85, formato: '250 g' },
    { id: 'p24-01', nombre: 'Fairy Spray poder 3 en 1', precio: 5.99, formato: '2 x 500 ml' },
    { id: 'p24-02', nombre: 'Fairy Ultra poder', precio: 5.99, formato: '2 x 650 ml' },
    { id: 'p24-03', nombre: 'Mimosín Suavizante XL', precio: 3.99, formato: '1,89 l' },
    { id: 'p25-01', nombre: 'Floralys Papel de cocina superabsorbente decorado', precio: 2.99, formato: '3 capas, 4 uds' },
    { id: 'p25-02', nombre: 'Aromata Papel vegetal para hornear', precio: 1.25, formato: '30 hojas' },
    { id: 'p25-03', nombre: 'Formil Detergente líquido azul', precio: 5.49, formato: '5 l' },
    { id: 'p25-04', nombre: 'Scottex Papel higiénico original XL', precio: 6.99, formato: '30 uds' },
    { id: 'p26-01', nombre: 'Barra rústica integral 100%', precio: 0.65, formato: '210 g' },
    { id: 'p26-02', nombre: 'Freshona Mango congelado', precio: 2.95, formato: '500 g' },
    { id: 'p26-03', nombre: 'Gelatelli Bombón corazón chocolate', precio: 2.79, formato: '6 x 63 g' },
    { id: 'p26-04', nombre: 'La Cestera Tarta bombón', precio: 7.65, formato: '700 g' },
    { id: 'p26-05', nombre: 'Olisone Aceite de oliva virgen extra', precio: 5.5, formato: '75 cl' },
    { id: 'p27-01', nombre: 'Pan redondo', precio: 1.25, formato: '450 g' },
    { id: 'p27-02', nombre: 'Harvest Basket Patatas fritas corte grueso horno', precio: 1.79, formato: '1 kg' },
    { id: 'p27-03', nombre: 'Trattoria Alfredo Pizza mozzarella / jamón y queso', precio: 4.19, formato: '2 x 340-355 g' },
    { id: 'p27-04', nombre: 'Monissa Salteado de pollo con verduras', precio: 1.99, formato: '450 g' },
    { id: 'p28-01', nombre: 'Empanadilla de atún', precio: 0.89, formato: '120 g' },
    { id: 'p29-01', nombre: 'Berlina de chocolate', precio: 0.5, formato: '90 g, 3 por 1,49€' },
    { id: 'p29-02', nombre: 'Hojaldre de tomate y queso', precio: 0.99, formato: '115 g' },
    { id: 'p29-03', nombre: 'Floopy de azúcar', precio: 1.25, formato: '4 x 52 g' },
    { id: 'p29-04', nombre: 'Napolitana de york y queso (130 g)', precio: 0.67, formato: '130 g, 3 por 2€' },
    { id: 'p36-01', nombre: 'Granada', precio: 2.79, formato: 'a granel, kg' },
    { id: 'p36-02', nombre: 'Zanahorias', precio: 0.89, formato: '1 kg' },
    { id: 'p36-03', nombre: 'Chef Select Espinaca baby', precio: 0.89, formato: '100 g' },
    { id: 'p36-04', nombre: 'Chapata cristal', precio: 0.29, formato: '71 g' },
    { id: 'p37-01', nombre: 'Costillas carnosas troceadas de cerdo', precio: 3.25, formato: 'aprox. 550 g' },
    { id: 'p37-02', nombre: 'Filete de pechuga de pollo corte fino', precio: 3.09, formato: 'aprox. 500 g' },
    { id: 'p37-03', nombre: 'Burger meat de cerdo y vacuno', precio: 3.19, formato: '500 g' },
    { id: 'p37-04', nombre: 'Salmón ahumado', precio: 7.99, formato: '300 g' },
    { id: 'p37-05', nombre: 'Mejillón fresco', precio: 2.45, formato: '1 kg' },
    { id: 'p38-01', nombre: 'Realvalle Pechuga de pavo braseada', precio: 1.85, formato: '200 g' },
    { id: 'p38-02', nombre: 'Roncero Media pieza de queso curado', precio: 9.25, formato: 'aprox. 1,5 kg, kg' },
    { id: 'p38-03', nombre: 'Roncero Media pieza de queso viejo tostado', precio: 10.99, formato: 'aprox. 1,5 kg, kg' },
    { id: 'p38-04', nombre: 'Milbona Yogur natural', precio: 0.39, formato: '150 g' },
    { id: 'p38-05', nombre: 'Realvalle Mini taquitos de jamón', precio: 1.99, formato: '2 x 90 g' },
    { id: 'p39-01', nombre: 'Snack Day Tiras de maíz sabor barbacoa', precio: 0.55, formato: '150 g' },
    { id: 'p39-02', nombre: 'La Cestera Pan de leche', precio: 1.39, formato: '480 g' },
    { id: 'p39-03', nombre: 'Snack Day Torreznos', precio: 0.99, formato: '100 g' },
    { id: 'p39-04', nombre: 'Argus Cerveza doble malta', precio: 2.39, formato: '6 x 33 cl' },
    { id: 'p39-05', nombre: 'Sondey Mini cookies', precio: 1.15, formato: '160 g' },
    { id: 'p39-06', nombre: 'Aromata Papel de aluminio', precio: 5.99, formato: '29 cm x 100 m' },
    { id: 'p39-07', nombre: 'Lupilu Toallitas húmedas bebé', precio: 5.99, formato: '4 x 100 ud' },
    { id: 'p40-01', nombre: 'Yatekomo Yakisoba', precio: 4.99, formato: 'pack 3 x 213 g' },
    { id: 'p40-02', nombre: 'Milka Tableta de chocolate', precio: 1.5, formato: '100 g, 2 por 3€' },
    { id: 'p40-03', nombre: 'Scottex Papel higiénico original', precio: 3.99, formato: '16 uds' },
    { id: 'p40-04', nombre: 'Listerine Enjuague bucal blanqueador', precio: 4.99, formato: '2 x 500 ml' },
    { id: 'p40-05', nombre: 'La Antigua Lavandera Detergente líquido primavera', precio: 6.99, formato: '5 l' },
    { id: 'p40-06', nombre: 'Cif Limpiador cremoso multiusos', precio: 2.69, formato: '750 ml' },
    { id: 'p41-01', nombre: 'Puleva Batido de chocolate', precio: 2.19, formato: '2,25 l' },
    { id: 'p41-02', nombre: 'Kinder Joy', precio: 7.49, formato: '126 g' },
    { id: 'p41-03', nombre: 'Danet Natillas Dubái', precio: 1.99, formato: '4 x 125 g' },
    { id: 'p41-04', nombre: 'Cola Cao en lata', precio: 10.99, formato: '1,4 kg' },
    { id: 'p41-05', nombre: 'Oreo Galletas Original', precio: 3.99, formato: '440 g' },
    { id: 'p41-06', nombre: 'Müller Müllermilch bebida láctea alta en proteínas', precio: 1.99, formato: '400 ml' },
    { id: 'p42-01', nombre: 'Vitasia Mini bapao\'s rellenos', precio: 2.49, formato: '168 g' },
    { id: 'p42-02', nombre: 'Flying Goose Salsa sriracha', precio: 3.99, formato: '455 ml' },
    { id: 'p42-03', nombre: 'Vitasia Salsa kimchi', precio: 1.49, formato: '250 ml' },
    { id: 'p42-04', nombre: 'Vitasia Colas de surimi', precio: 2.49, formato: '320 g' },
    { id: 'p42-05', nombre: 'Vitasia Costillas de cerdo con salsa sriracha', precio: 5.99, formato: '600 g' },
    { id: 'p42-06', nombre: 'Vitasia Bocaditos de pollo con salsa sriracha', precio: 3.99, formato: '400 g' },
    { id: 'p43-01', nombre: 'Vitasia Rollitos de primavera', precio: 1.99, formato: '280 g' },
    { id: 'p43-02', nombre: 'Vitasia Dim Sum', precio: 1.99, formato: '200 g' },
    { id: 'p43-03', nombre: 'Vitasia Salsa de chili dulce', precio: 1.49, formato: '700 ml' },
    { id: 'p43-04', nombre: 'Vitasia Salsa para gyozas', precio: 1.99, formato: '250 ml' },
    { id: 'p44-01', nombre: 'Vitasia Fideos de cristal', precio: 0.59, formato: '100 g' },
    { id: 'p44-02', nombre: 'Vitasia Fideos chow mein', precio: 0.49, formato: '250 g' },
    { id: 'p44-03', nombre: 'Vitasia Fideos wok precocinados', precio: 0.79, formato: '300 g' },
    { id: 'p45-01', nombre: 'Vitasia Láminas de masa de arroz', precio: 1.49, formato: '250 g' },
    { id: 'p45-02', nombre: 'Vitasia Kits de platos asiáticos', precio: 2.49, formato: '255 g' },
    { id: 'p45-03', nombre: 'Vitasia Fideos Konjac sin gluten', precio: 0.99, formato: '270 g' },
    { id: 'p45-04', nombre: 'Vitasia Pan rallado Panko', precio: 0.99, formato: '200 g' },
    { id: 'p45-05', nombre: 'Vitasia Salsa agridulce', precio: 1.49, formato: '330 ml' },
    { id: 'p45-06', nombre: 'Vitasia Salsas tailandesas (pad thai / barbacoa / chili dulce)', precio: 0.99, formato: '290 ml' },
    { id: 'p45-07', nombre: 'Vitasia Salsa chili', precio: 0.99, formato: '250 ml' },
    { id: 'p46-01', nombre: 'Vitasia Arroz sushi', precio: 1.29, formato: '500 g' },
    { id: 'p46-02', nombre: 'Vitasia Pasta de miso', precio: 1.49, formato: '200 g' },
    { id: 'p46-03', nombre: 'Vitasia Salsas asiáticas picantes (teriyaki / soja)', precio: 1.19, formato: '250 ml' },
    { id: 'p46-04', nombre: 'Vitasia Salsa cremosa sriracha', precio: 2.49, formato: '250 ml' },
    { id: 'p46-05', nombre: 'Vitasia Queso de untar wasabi / yuzu', precio: 1.29, formato: '175 g' },
    { id: 'p46-06', nombre: 'Vitasia Tofu teriyaki', precio: 0.99, formato: '180 g' },
    { id: 'p46-07', nombre: 'Vitasia Alga wakame', precio: 1.79, formato: '30 g' },
    { id: 'p47-01', nombre: 'Vitasia Paleta de cerdo a fuego lento con miso y arce', precio: 3.99, formato: '425 g' },
    { id: 'p47-02', nombre: 'Vitasia Carne de cerdo cocida en salsa de jengibre', precio: 3.99, formato: '400 g' },
    { id: 'p47-03', nombre: 'Vitasia Plato preparado udon / soba', precio: 2.99, formato: '400 g' },
    { id: 'p47-04', nombre: 'Vitasia Tiras de pechuga de pollo con salsa picante', precio: 3.79, formato: '500 g' },
    { id: 'p47-05', nombre: 'Vitasia Sopa de fideos ramen', precio: 2.99, formato: '400 g' },
    { id: 'p47-06', nombre: 'Vitasia Snack de alga nori', precio: 0.99, formato: '5,5 g' },
    { id: 'p47-07', nombre: 'Vitasia Caldo ramen', precio: 1.29, formato: '1 l' },
    { id: 'p47-08', nombre: 'Vitasia Fideos udon gruesos', precio: 0.99, formato: '300 g' },
    { id: 'p47-09', nombre: 'Vitasia Fideos soba', precio: 0.99, formato: '300 g' },
    { id: 'p48-01', nombre: 'Vitasia Rollitos de hojaldre rellenos de edamame', precio: 2.79, formato: '250 g' },
    { id: 'p48-02', nombre: 'Vitasia Pollo desmenuzado con curry', precio: 4.49, formato: '550 g' },
    { id: 'p48-03', nombre: 'Vitasia Sopa de fideos de arroz instantánea', precio: 1.29, formato: '70 g' },
    { id: 'p48-04', nombre: 'Yum Yum Sopa de fideos asiática', precio: 0.49, formato: '60 g' },
    { id: 'p48-05', nombre: 'Vitasia Plato preparado asiático (curry / agridulce)', precio: 0.99, formato: '44 g' },
    { id: 'p48-06', nombre: 'Vitasia Fideos de arroz con verduras', precio: 1.99, formato: '200 g' },
    { id: 'p49-01', nombre: 'Vitasia Delicias de pollo', precio: 2.99, formato: '350 g' },
    { id: 'p49-02', nombre: 'Vitasia Plato preparado de pollo (tikka masala / curry verde / mantequilla)', precio: 2.99, formato: '360 g' },
    { id: 'p49-03', nombre: 'Vitasia Salsas asiáticas (tikka masala / korma / tandoori)', precio: 1.99, formato: '360 ml' },
    { id: 'p49-04', nombre: 'Vitasia Brocheta de pollo tandoori', precio: 2.79, formato: '150 g' },
    { id: 'p49-05', nombre: 'Vitasia Surtido de entrantes estilo indio', precio: 1.99, formato: '300 g' },
    { id: 'p49-06', nombre: 'Vitasia Pan naan', precio: 1.49, formato: '260 g' },
    { id: 'p49-07', nombre: 'Vitasia Pan naan tandoori', precio: 1.99, formato: '240 g' },
    { id: 'p50-01', nombre: 'Vitasia Snacks estilo asiático', precio: 1.49, formato: '150 g' },
    { id: 'p50-02', nombre: 'Vitasia Pan de gambas', precio: 1.29, formato: '100 g' },
    { id: 'p50-03', nombre: 'Vitasia Cacahuetes sabor wasabi', precio: 0.99, formato: '150 g' },
    { id: 'p51-01', nombre: 'Vitasia Lassi', precio: 0.99, formato: '250 g' },
    { id: 'p51-02', nombre: 'Vitasia Galletas de la suerte', precio: 1.49, formato: '60 g' },
    { id: 'p51-03', nombre: 'Vitasia Té helado de lima y yuzu', precio: 1.49, formato: '2 l' },
    { id: 'p51-04', nombre: 'Vitasia Macarons', precio: 3.49, formato: '12 x 13 g' },
    { id: 'p51-05', nombre: 'Vitasia Té de zumo de cítricos', precio: 0.99, formato: '330 ml' },
];

const ahora = new Date().toISOString();
const filas = PRODUCTOS.map((p) => ({
    supermercado: 'lidl',
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
