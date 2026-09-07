// Configuracion estatica de SplitSmart (la app de Gastos de Mi Hogar).
// Estaba dentro de page.tsx; se saca aqui para poder reutilizarla y probarla.

export const COLORES = ['#1a5c2e', '#3B6D11', '#b87514', '#F5C400', '#1558a8', '#0f6e56', '#4a8a16', '#298A46'];

export const CAT_COLORS = { comida: '#b87514', transporte: '#1558a8', alojamiento: '#3B6D11', ocio: '#F5C400', otros: '#1a5c2e' };

export const CAT_ICONS = { comida: '🍽', transporte: '🚕', alojamiento: '🏨', ocio: '🎉', otros: '📌' };

export const UBICACIONES = {
  madrid: { nombre: 'Madrid', lat: 40.4168, lng: -3.7038 },
  barcelona: { nombre: 'Barcelona', lat: 41.3851, lng: 2.1734 },
  valencia: { nombre: 'Valencia', lat: 39.4699, lng: -0.3763 },
  lisboa: { nombre: 'Lisboa', lat: 38.7223, lng: -9.1393 },
  oporto: { nombre: 'Oporto', lat: 41.1579, lng: -8.6291 },
  sintra: { nombre: 'Sintra', lat: 38.8018, lng: -9.3938 },
  belem: { nombre: 'Belém', lat: 38.6617, lng: -9.2057 },
  cascais: { nombre: 'Cascais', lat: 38.6820, lng: -9.4213 },
  paris: { nombre: 'París', lat: 48.8566, lng: 2.3522 },
  roma: { nombre: 'Roma', lat: 41.9028, lng: 12.4964 },
  london: { nombre: 'Londres', lat: 51.5074, lng: -0.1278 },
  berlin: { nombre: 'Berlín', lat: 52.5200, lng: 13.4050 },
  amsterdam: { nombre: 'Ámsterdam', lat: 52.3676, lng: 4.9041 },
  vegas: { nombre: 'Las Vegas', lat: 36.1699, lng: -115.1398 },
  nyc: { nombre: 'Nueva York', lat: 40.7128, lng: -74.0060 },
  losangeles: { nombre: 'Los Ángeles', lat: 34.0522, lng: -118.2437 },
};

/**
 * `r` es cuantas unidades de esa divisa vale 1 euro, asi que para pasar un
 * importe a euros se divide entre `r`. Son tasas fijas escritas a mano: no se
 * actualizan solas y por tanto son aproximadas.
 */
export const DIVISAS = {
  EUR: { s: '€', r: 1 },
  USD: { s: '$', r: 1.08 },
  GBP: { s: '£', r: 0.86 },
  JPY: { s: '¥', r: 163 },
  MXN: { s: 'M$', r: 18.5 },
};

export type Divisa = keyof typeof DIVISAS;

export const EMOJIS = ['👍', '❤️', '🔥', '😂', '🙌', '😍', '🎉', '💯', '✨', '🚀'];

export const QUICK_REPLIES = ['👍 Ok, lo apunto!', '💸 Yo puedo pagar', '⏰ ¿Cuándo saldamos?', '✅ Ya he pagado'];
