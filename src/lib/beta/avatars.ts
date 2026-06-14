// Biblioteca de avatares Beta. Sin subida de imágenes: solo selección.
export interface BetaAvatar {
    id: string;
    emoji: string;
    label: string;
}

export const BETA_AVATARS: BetaAvatar[] = [
    { id: 'fox', emoji: '🦊', label: 'Zorro' },
    { id: 'lion', emoji: '🦁', label: 'León' },
    { id: 'tiger', emoji: '🐯', label: 'Tigre' },
    { id: 'panda', emoji: '🐼', label: 'Panda' },
    { id: 'koala', emoji: '🐨', label: 'Koala' },
    { id: 'wolf', emoji: '🐺', label: 'Lobo' },
    { id: 'bear', emoji: '🐻', label: 'Oso' },
    { id: 'cat', emoji: '🐱', label: 'Gato' },
    { id: 'dog', emoji: '🐶', label: 'Perro' },
    { id: 'rabbit', emoji: '🐰', label: 'Conejo' },
    { id: 'frog', emoji: '🐸', label: 'Rana' },
    { id: 'monkey', emoji: '🐵', label: 'Mono' },
    { id: 'unicorn', emoji: '🦄', label: 'Unicornio' },
    { id: 'dragon', emoji: '🐲', label: 'Dragón' },
    { id: 'owl', emoji: '🦉', label: 'Búho' },
    { id: 'eagle', emoji: '🦅', label: 'Águila' },
    { id: 'shark', emoji: '🦈', label: 'Tiburón' },
    { id: 'octopus', emoji: '🐙', label: 'Pulpo' },
    { id: 'penguin', emoji: '🐧', label: 'Pingüino' },
    { id: 'butterfly', emoji: '🦋', label: 'Mariposa' },
    { id: 'robot', emoji: '🤖', label: 'Robot' },
    { id: 'alien', emoji: '👽', label: 'Alien' },
    { id: 'ninja', emoji: '🥷', label: 'Ninja' },
    { id: 'astronaut', emoji: '👨‍🚀', label: 'Astronauta' },
    { id: 'wizard', emoji: '🧙', label: 'Mago' },
    { id: 'ghost', emoji: '👻', label: 'Fantasma' },
    { id: 'fire', emoji: '🔥', label: 'Fuego' },
    { id: 'star', emoji: '⭐', label: 'Estrella' },
    { id: 'rocket', emoji: '🚀', label: 'Cohete' },
    { id: 'crown', emoji: '👑', label: 'Corona' },
    { id: 'diamond', emoji: '💎', label: 'Diamante' },
    { id: 'lightning', emoji: '⚡', label: 'Rayo' },
];

export function getBetaAvatar(id: string | null | undefined): BetaAvatar {
    return BETA_AVATARS.find(a => a.id === id) ?? BETA_AVATARS[0];
}

export const isValidAvatarId = (id: string) => BETA_AVATARS.some(a => a.id === id);
