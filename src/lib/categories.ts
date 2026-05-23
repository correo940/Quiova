export interface CategoryDef {
    id: string;
    label: string;
    color: string;         // hex (#RRGGBB) — se aplica como background dot/chip
    emoji?: string;        // icono opcional si no hay logo
    logo?: string;         // ruta a imagen (sólo defaults Quioba)
    isDefault: boolean;
}

export const DEFAULT_CATEGORIES: CategoryDef[] = [
    { id: 'cuerpo', label: 'Cuerpo', color: '#1a5c2e', logo: '/images/logo-cuerpo.png', isDefault: true },
    { id: 'mente', label: 'Mente', color: '#1558a8', logo: '/images/logo-mente.png', isDefault: true },
    { id: 'finanzas', label: 'Finanzas', color: '#b87514', logo: '/images/logo-finanzas.png', isDefault: true },
];

export const CATEGORY_COLOR_PALETTE = [
    '#dc2626', // rojo
    '#ea580c', // naranja
    '#d97706', // ámbar
    '#65a30d', // lima
    '#059669', // esmeralda
    '#0891b2', // cian
    '#0284c7', // sky
    '#4f46e5', // índigo
    '#7c3aed', // violeta
    '#c026d3', // fucsia
    '#db2777', // rosa
    '#64748b', // slate
];

export const CATEGORY_EMOJIS = [
    // Personas & cuerpo
    '🏃', '🧘', '💪', '🚴', '🏊', '⚽', '🏀', '🎾', '🥊', '🤸', '🧗', '⛹️',
    // Mente & estudio
    '🧠', '📚', '📖', '✏️', '📝', '🎓', '💡', '🔬', '🔭', '🧪', '🎯', '🧩',
    // Trabajo & finanzas
    '💼', '💰', '💵', '💳', '🏦', '📊', '📈', '📉', '💹', '🪙', '💎', '🛒',
    // Hogar
    '🏠', '🛏️', '🛁', '🧹', '🧺', '🍳', '🔑', '🪴', '🛋️', '🚪', '🪟', '🧴',
    // Comida & bebida
    '🍎', '🥑', '🥗', '🍞', '🥐', '🍕', '🍔', '🍣', '🍜', '☕', '🍵', '🍷',
    // Salud
    '❤️', '🩺', '💊', '🩹', '🦷', '👁️', '🧬', '🫀', '🫁', '🩻', '💉', '🌡️',
    // Naturaleza
    '🌱', '🌳', '🌲', '🌴', '🌻', '🌹', '🌸', '🍀', '🌿', '🌊', '⛰️', '🏖️',
    // Animales
    '🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🦁', '🐯', '🐮', '🐷', '🐸', '🦋',
    // Clima & ambiente
    '☀️', '⛅', '🌧️', '⛈️', '🌈', '❄️', '🌙', '⭐', '🌟', '✨', '🔥', '⚡',
    // Tiempo & calendario
    '⏰', '⏳', '📅', '📆', '🗓️', '⏱️', '🕐', '📍', '🗺️', '🧭',
    // Comunicación
    '📞', '📱', '💬', '📧', '✉️', '📨', '📤', '📥', '🔔', '📢',
    // Transporte
    '✈️', '🚗', '🚕', '🚌', '🚆', '🚲', '🛴', '🚀', '⛵', '🚢',
    // Música & arte
    '🎵', '🎶', '🎸', '🎹', '🎤', '🎨', '🖌️', '🎭', '🎬', '📷',
    // Ocio
    '🎮', '🎲', '🎳', '🎯', '🎤', '🎬', '🍿', '📺', '📻',
    // Objetos útiles
    '🔧', '🔨', '⚙️', '🧰', '📦', '🗂️', '📁', '📂', '🗃️', '🗄️',
    // Símbolos & estados
    '✅', '⚠️', '🚨', '⛔', '🎉', '🎁', '🏆', '🥇', '🏅', '🎖️',
];

const STORAGE_KEY = 'quioba_categories_v1';

export function loadCustomCategories(): CategoryDef[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(c => c && c.id && c.label && c.color).map(c => ({ ...c, isDefault: false }));
    } catch {
        return [];
    }
}

export function saveCustomCategories(cats: CategoryDef[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cats.filter(c => !c.isDefault)));
        window.dispatchEvent(new Event('quioba_categories_changed'));
    } catch { }
}

export function getAllCategories(): CategoryDef[] {
    return [...DEFAULT_CATEGORIES, ...loadCustomCategories()];
}

export function findCategory(id: string | null | undefined): CategoryDef | null {
    if (!id) return null;
    return getAllCategories().find(c => c.id === id) || null;
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 32);
}

export function generateUniqueId(label: string, existing: CategoryDef[]): string {
    const base = slugify(label) || 'cat';
    let id = base;
    let i = 1;
    while (existing.some(c => c.id === id)) {
        id = `${base}-${i++}`;
    }
    return id;
}
