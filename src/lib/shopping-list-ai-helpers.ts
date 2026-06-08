export const CATEGORY_MAP: Record<string, { keywords: string[], emoji: string, expiryDays: number }> = {
    'Frutas y Verduras': {
        keywords: ['manzana', 'platano', 'tomate', 'lechuga', 'cebolla', 'ajo', 'patata', 'pimiento', 'zanahoria', 'naranja', 'limon', 'fresa', 'fruta', 'verdura', 'aguacate'],
        emoji: '🥬',
        expiryDays: 7
    },
    'Carnes': {
        keywords: ['pollo', 'ternera', 'cerdo', 'carne', 'pechuga', 'lomo', 'chuleta', 'salchicha', 'hamburguesa', 'picada', 'pavo'],
        emoji: '🥩',
        expiryDays: 4
    },
    'Pescados': {
        keywords: ['pescado', 'salmon', 'merluza', 'atun', 'bacalao', 'gamba', 'langostino', 'calamar', 'pulpo'],
        emoji: '🐟',
        expiryDays: 2
    },
    'Lácteos y Huevos': {
        keywords: ['leche', 'queso', 'yogur', 'mantequilla', 'huevo', 'huevos', 'nata'],
        emoji: '🥛',
        expiryDays: 14
    },
    'Limpieza': {
        keywords: ['friegaplatos', 'detergente', 'suavizante', 'lejia', 'limpiasuelos', 'fregona', 'escoba', 'papel higienico', 'servilletas', 'basura'],
        emoji: '🧼',
        expiryDays: 999
    },
    'Snacks y Dulces': {
        keywords: ['galleta', 'chocolate', 'patatas fritas', 'snack', 'caramelo', 'helado', 'postre'],
        emoji: '🍫',
        expiryDays: 180
    },
    'Bebidas': {
        keywords: ['agua', 'coca', 'refresco', 'cerveza', 'vino', 'zumo', 'cafe', 'te'],
        emoji: '🥤',
        expiryDays: 365
    },
    'Despensa Básica': {
        keywords: ['arroz', 'pasta', 'macarron', 'aceite', 'sal', 'azucar', 'harina', 'legumbre', 'garbanzo', 'lenteja', 'pan'],
        emoji: '🥫',
        expiryDays: 365
    }
};

// Most specific keywords first
const PRODUCT_EMOJI_MAP: [string[], string][] = [
    // Fruits
    [['manzana'], '🍎'],
    [['naranja', 'mandarina', 'clementina'], '🍊'],
    [['limon', 'lima'], '🍋'],
    [['pera'], '🍐'],
    [['uva', 'uvas'], '🍇'],
    [['platano', 'banana'], '🍌'],
    [['fresa', 'fresones'], '🍓'],
    [['sandia'], '🍉'],
    [['melon'], '🍈'],
    [['kiwi'], '🥝'],
    [['aguacate'], '🥑'],
    [['cereza', 'cerezas'], '🍒'],
    [['mango'], '🥭'],
    [['pina', 'anana'], '🍍'],
    [['coco'], '🥥'],
    [['arandano', 'frambuesa', 'mora'], '🫐'],
    [['melocoton', 'nectarina', 'ciruela', 'durazno'], '🍑'],
    [['fruta'], '🍑'],

    // Vegetables
    [['tomate'], '🍅'],
    [['zanahoria'], '🥕'],
    [['brocoli', 'brecol'], '🥦'],
    [['maiz', 'elote'], '🌽'],
    [['pepino', 'calabacin'], '🥒'],
    [['cebolla', 'cebolleta'], '🧅'],
    [['ajo'], '🧄'],
    [['patata', 'papa'], '🥔'],
    [['pimiento', 'pimenton'], '🫑'],
    [['berenjena'], '🍆'],
    [['champinon', 'seta', 'boletus'], '🍄'],
    [['guisante', 'tirabeque'], '🫛'],
    [['garbanzo', 'lenteja', 'alubias', 'judias', 'habas', 'legumbre'], '🫘'],
    [['lechuga', 'espinaca', 'acelga', 'esparrago', 'canonigos', 'rucula', 'verdura'], '🥬'],

    // Meats
    [['pollo', 'pechuga', 'muslo', 'alita'], '🍗'],
    [['jamon', 'serrano', 'pata negra'], '🍖'],
    [['salchicha', 'chorizo', 'salchichon', 'mortadela', 'frankfurt'], '🌭'],
    [['bacon', 'tocino', 'panceta'], '🥓'],
    [['pavo'], '🦃'],
    [['carne', 'ternera', 'buey', 'filete', 'chuleta', 'lomo', 'costilla', 'hamburguesa', 'picada', 'cordero'], '🥩'],

    // Fish & seafood
    [['gamba', 'langostino', 'camaron'], '🦐'],
    [['calamar', 'tinta'], '🦑'],
    [['pulpo'], '🐙'],
    [['mejillon', 'almeja', 'berberecho', 'navaja'], '🐚'],
    [['langosta', 'bogavante'], '🦞'],
    [['cangrejo'], '🦀'],
    [['tiburon'], '🦈'],
    [['salmon', 'atun', 'bonito', 'bacalao', 'merluza', 'lubina', 'dorada', 'rape', 'lenguado', 'sardina', 'anchoa', 'pescado'], '🐟'],

    // Dairy & eggs
    [['huevo', 'huevos'], '🥚'],
    [['queso'], '🧀'],
    [['mantequilla', 'margarina'], '🧈'],
    [['yogur', 'yoghurt', 'yogurt'], '🥛'],
    [['leche', 'nata'], '🥛'],

    // Bakery
    [['baguette', 'barra de pan'], '🥖'],
    [['croissant'], '🥐'],
    [['bizcocho', 'tarta', 'pastel'], '🎂'],
    [['magdalena', 'muffin', 'cupcake'], '🧁'],
    [['donut', 'donuts'], '🍩'],
    [['pan'], '🍞'],

    // Beverages
    [['cafe', 'capuchino', 'espresso', 'descafeinado', 'dolce gusto', 'nespresso', 'cappuccino', 'cortado'], '☕'],
    [['te ', 'infusion', 'manzanilla', 'tila', 'poleo'], '🍵'],
    [['cerveza'], '🍺'],
    [['vino', 'cava', 'champan'], '🍷'],
    [['agua'], '💧'],
    [['zumo', 'jugo'], '🧃'],
    [['refresco', 'cola', 'fanta', 'sprite', 'pepsi', 'schweppes'], '🥤'],
    [['batido', 'smoothie'], '🥤'],

    // Cleaning
    [['papel higienico', 'papel wc'], '🧻'],
    [['servilleta', 'papel cocina'], '🧻'],
    [['lejia', 'amoniaco'], '🧴'],
    [['detergente', 'suavizante', 'limpiasuelos', 'limpiador'], '🧴'],
    [['friegaplatos', 'fairy', 'mistol', 'lavaplatos'], '🧼'],
    [['bayeta', 'estropajo', 'fregona'], '🧽'],
    [['escoba', 'cepillo', 'recogedor'], '🧹'],
    [['basura', 'bolsa basura'], '🗑️'],

    // Personal care
    [['champu', 'acondicionador'], '🧴'],
    [['gel', 'jabon'], '🧼'],
    [['pasta dientes', 'cepillo dientes'], '🦷'],
    [['desodorante', 'colonia', 'perfume'], '🌸'],
    [['maquinilla', 'afeitar'], '🪒'],

    // Pantry
    [['arroz'], '🍚'],
    [['pasta', 'espagueti', 'macarron', 'tallarines', 'fettuccine', 'penne'], '🍝'],
    [['aceite'], '🫙'],
    [['vinagre'], '🫙'],
    [['sal'], '🧂'],
    [['azucar'], '🍬'],
    [['harina', 'maicena'], '🌾'],
    [['tomate frito', 'tomate triturado', 'conserva'], '🥫'],
    [['aceitunas', 'aceituna', 'oliva'], '🫒'],
    [['nuez', 'almendra', 'cacahuete', 'pistacho', 'avellana', 'frutos secos'], '🥜'],
    [['miel'], '🍯'],
    [['mermelada', 'confitura'], '🍯'],
    [['chocolate', 'cacao', 'nutella', 'nocilla'], '🍫'],
    [['cereal', 'avena', 'granola', 'musli', 'copos'], '🥣'],

    // Snacks & sweets
    [['galleta', 'oreo', 'cookie'], '🍪'],
    [['patatas fritas', 'chips', 'lays'], '🍟'],
    [['palomita', 'popcorn'], '🍿'],
    [['caramelo', 'gominola', 'chuche'], '🍬'],
    [['helado'], '🍦'],
    [['pizza'], '🍕'],

    // Baby & pets
    [['panal', 'pampers', 'dodot'], '👶'],
    [['pienso', 'comida gato', 'comida perro', 'whiskas', 'purina'], '🐾'],

    // Household
    [['tinta impresora', 'cartucho', 'toner'], '🖨️'],
    [['pila', 'bateria alcalina'], '🔋'],
    [['bombilla', 'led'], '💡'],
];

export function getProductEmoji(name: string): string {
    const n = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    for (const [keywords, emoji] of PRODUCT_EMOJI_MAP) {
        if (keywords.some(k => n.includes(k))) return emoji;
    }
    return guessCategoryAndPrice(name).emoji;
}

export function getTwemojiUrl(emoji: string): string {
    const codepoints = [...emoji]
        .map(c => c.codePointAt(0)!.toString(16))
        .filter(cp => cp !== 'fe0f')
        .join('-');
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoints}.png`;
}

export function guessCategoryAndPrice(name: string) {
    const lowerName = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    for (const [category, data] of Object.entries(CATEGORY_MAP)) {
        if (data.keywords.some(k => lowerName.includes(k))) {
            return { category, emoji: data.emoji, expiryDays: data.expiryDays };
        }
    }

    return { category: 'General', emoji: '🛒', expiryDays: 90 };
}

export function generatePlanItems(planText: string): string[] {
    const lower = planText.toLowerCase();

    if (lower.includes('barbacoa') || lower.includes('carne') || lower.includes('asado')) {
        return ['Carne para barbacoa', 'Carbón vegetal', 'Bebidas surtidas', 'Pan de hamburguesa', 'Salsas (Ketchup/Mayo)', 'Patatas fritas'];
    }
    if (lower.includes('tacos') || lower.includes('mexicana')) {
        return ['Tortillas mexicanas', 'Carne picada', 'Sazonador para tacos', 'Queso rallado', 'Tomate fresco', 'Cebolla', 'Aguacate'];
    }
    if (lower.includes('pasta') || lower.includes('italiana') || lower.includes('pizza')) {
        return ['Pasta o Masa de Pizza', 'Salsa de tomate casera', 'Queso Mozzarella', 'Orégano', 'Cebolla', 'Carne picada o Pepperoni'];
    }
    if (lower.includes('sushi') || lower.includes('japonesa') || lower.includes('asiatica')) {
        return ['Arroz para sushi', 'Alga Nori', 'Salmón fresco', 'Salsa de soja', 'Vinagre de arroz', 'Aguacate'];
    }
    if (lower.includes('amigos') || lower.includes('fiesta') || lower.includes('visita') || lower.includes('cena')) {
        return ['Quesos surtidos', 'Jamón o embutido', 'Picos de pan', 'Vino o Cerveza', 'Patatas fritas', 'Aceitunas', 'Algo dulce para postre'];
    }

    return ['Bebidas variadas', 'Aperitivos / Snacks', 'Plato principal (a pensar)', 'Pan', 'Postre o fruta'];
}

export function checkExpiration(category: string, createdAtDate: string) {
    const data = CATEGORY_MAP[category];
    if (!data || data.expiryDays > 90) return null;

    const created = new Date(createdAtDate);
    const now = new Date();
    const daysElapsed = Math.floor((now.getTime() - created.getTime()) / (1000 * 3600 * 24));
    const daysLeft = data.expiryDays - daysElapsed;

    if (daysLeft < 0) return { status: 'expired', message: 'Posiblemente caducado' };
    if (daysLeft <= 2) return { status: 'warning', message: '¡Úsalo pronto!' };

    return null;
}
