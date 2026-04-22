export const CATEGORY_MAP: Record<string, { keywords: string[], emoji: string, defaultPrice: number, expiryDays: number }> = {
    'Frutas y Verduras': {
        keywords: ['manzana', 'platano', 'tomate', 'lechuga', 'cebolla', 'ajo', 'patata', 'pimiento', 'zanahoria', 'naranja', 'limon', 'fresa', 'fruta', 'verdura', 'aguacate'],
        emoji: '🥬',
        defaultPrice: 2.50,
        expiryDays: 7
    },
    'Carnes': {
        keywords: ['pollo', 'ternera', 'cerdo', 'carne', 'pechuga', 'lomo', 'chuleta', 'salchicha', 'hamburguesa', 'picada', 'pavo'],
        emoji: '🥩',
        defaultPrice: 5.50,
        expiryDays: 4
    },
    'Pescados': {
        keywords: ['pescado', 'salmon', 'merluza', 'atun', 'bacalao', 'gamba', 'langostino', 'calamar', 'pulpo'],
        emoji: '🐟',
        defaultPrice: 8.00,
        expiryDays: 2
    },
    'Lácteos y Huevos': {
        keywords: ['leche', 'queso', 'yogur', 'mantequilla', 'huevo', 'huevos', 'nata'],
        emoji: '🥛',
        defaultPrice: 2.00,
        expiryDays: 14
    },
    'Limpieza': {
        keywords: ['friegaplatos', 'detergente', 'suavizante', 'lejia', 'limpiasuelos', 'fregona', 'escoba', 'papel higienico', 'servilletas', 'basura'],
        emoji: '🧼',
        defaultPrice: 4.50,
        expiryDays: 999
    },
    'Snacks y Dulces': {
        keywords: ['galleta', 'chocolate', 'patatas fritas', 'snack', 'caramelo', 'helado', 'postre'],
        emoji: '🍫',
        defaultPrice: 2.50,
        expiryDays: 180
    },
    'Bebidas': {
        keywords: ['agua', 'coca', 'refresco', 'cerveza', 'vino', 'zumo', 'cafe', 'te'],
        emoji: '🥤',
        defaultPrice: 1.50,
        expiryDays: 365
    },
    'Despensa Básica': {
        keywords: ['arroz', 'pasta', 'macarron', 'aceite', 'sal', 'azucar', 'harina', 'legumbre', 'garbanzo', 'lenteja', 'pan'],
        emoji: '🥫',
        defaultPrice: 1.80,
        expiryDays: 365
    }
};

export function guessCategoryAndPrice(name: string) {
    const lowerName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    for (const [category, data] of Object.entries(CATEGORY_MAP)) {
        if (data.keywords.some(k => lowerName.includes(k))) {
            return {
                category,
                emoji: data.emoji,
                estimatedPrice: data.defaultPrice,
                expiryDays: data.expiryDays
            };
        }
    }

    return {
        category: 'General',
        emoji: '🛒',
        estimatedPrice: 3.00,
        expiryDays: 90
    };
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

    // Default "Cena amigos" / Picoteo
    if (lower.includes('amigos') || lower.includes('fiesta') || lower.includes('visita') || lower.includes('cena')) {
        return ['Quesos surtidos', 'Jamón o embutido', 'Picos de pan', 'Vino o Cerveza', 'Patatas fritas', 'Aceitunas', 'Algo dulce para postre'];
    }

    return ['Bebidas variadas', 'Aperitivos / Snacks', 'Plato principal (a pensar)', 'Pan', 'Postre o fruta'];
}

export function checkExpiration(category: string, createdAtDate: string) {
    const data = CATEGORY_MAP[category];
    if (!data || data.expiryDays > 90) return null; // No caduca de forma inminente (ej. Limpieza)

    const created = new Date(createdAtDate);
    const now = new Date();
    const daysElapsed = Math.floor((now.getTime() - created.getTime()) / (1000 * 3600 * 24));
    const daysLeft = data.expiryDays - daysElapsed;

    if (daysLeft < 0) return { status: 'expired', message: 'Posiblemente caducado' };
    if (daysLeft <= 2) return { status: 'warning', message: '¡Úsalo pronto!' };

    return null; // Aún fresco
}
