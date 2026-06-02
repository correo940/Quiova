import { CONTEXTO_EMPRESA } from './contexto-empresa';
import { bloquesModoRealidad } from './modo-realidad';
import type { PiezaContenido, CategoriaProduccion, FormatoProduccion, ObjetivoProduccion } from './sala-produccion';

// ── Reglas por categoría ──────────────────────────────────────────────────────

const AUDIENCIA: Record<CategoriaProduccion, string> = {
    quioba:
        `Profesionales de 25-40 años que gestionan su vida entre múltiples apps y sienten que su organización digital está fragmentada. Pueden ser trabajadores remotos, padres, freelancers o emprendedores. Buscan un sistema que unifique su vida personal y profesional sin complicarla más.`,
    cuerpo:
        `Trabajadores de oficina o en remoto que pasan 6-10 horas sentados al día. Son conscientes de que su sedentarismo es un problema pero no tienen energía ni tiempo para soluciones complejas. Responden a contenido práctico, sin culpa y sin gimnasio obligatorio.`,
    mente:
        `Personas de 20-45 años con vidas activas que experimentan sobrecarga mental, estrés crónico o dificultad para concentrarse. Han probado apps de meditación pero no las mantienen. Valoran la honestidad sobre los resultados perfectos y buscan técnicas concretas que puedan usar hoy.`,
    finanzas:
        `Personas con ingresos medios que saben que deberían gestionar mejor su dinero pero no lo hacen porque les parece complicado o aburrido. No son expertos en finanzas. Responden a métodos simples, replicables y con resultados visibles en el primer mes.`,
};

// ── Reglas por formato ────────────────────────────────────────────────────────

const INSTRUCCIONES_FORMATO: Record<FormatoProduccion, string> = {
    corto:
        `Duración objetivo: 45-90 segundos. REGLAS ESTRICTAS:
- El primer segundo nombra el problema exacto. Sin introducción, sin nombre.
- Máximo 3 ideas. No más.
- Cada frase debe poder entenderse sin ver la pantalla.
- Estructura obligatoria: Hook → Problema → Solución → Cierre.
- Sin música bajo la voz en off. Sin intro de marca.`,
    largo:
        `Duración objetivo: 8-15 minutos. ESTRUCTURA:
- Intro con promesa clara (30 seg)
- Contexto del problema con datos o historia (2 min)
- Desarrollo con ejemplos reales y accionables (8-10 min)
- Conclusión con resumen y siguiente paso (2 min)
Incluir indicaciones para timestamps y capítulos.`,
    tutorial:
        `Duración objetivo: 3-8 minutos. REGLAS:
- Numeración visible en cada paso (Paso 1, Paso 2...).
- Cada paso debe ser ejecutable por el espectador de inmediato.
- Sin pasos teóricos: todo demostrable.
- Mostrar el resultado antes de explicar el proceso.
- Cerrar con un resumen de los pasos en 10 segundos.`,
    historia:
        `Duración libre. ESTRUCTURA NARRATIVA:
- Situación antes (qué estaba pasando)
- Momento de quiebre (qué cambió o por qué busqué algo diferente)
- Lo que hice (el proceso real, sin filtros)
- Resultado honesto (no prometas transformación perfecta)
Tono: primera persona, sin distancia emocional. La vulnerabilidad genera confianza.`,
    opinion:
        `Duración objetivo: 3-6 minutos. POSTURA CLARA desde el primer segundo:
- Empieza con la afirmación más directa o polémica.
- Argumenta con 3 razones concretas y ejemplos reales.
- Reconoce la postura contraria en una frase (honestidad da autoridad).
- Refuerza la postura final con contundencia.
Prohibido: "Depende", "Hay que ver el caso", "No soy experto pero".`,
};

// ── Reglas por objetivo ───────────────────────────────────────────────────────

const INSTRUCCIONES_OBJETIVO: Record<ObjetivoProduccion, string> = {
    alcance:
        `OBJETIVO: Alcance orgánico.
Este vídeo debe ser tan útil que alguien que no te sigue quiera compartirlo. Diseña cada frase pensando: "¿esto lo reenviaría alguien a un amigo?".
- Sin menciones de marca en los primeros 30 segundos.
- El valor tiene que ser independiente del producto.
- Terminar con una pregunta o afirmación que invite a comentar.`,
    captacion:
        `OBJETIVO: Captación de usuarios.
El vídeo debe despertar curiosidad por ${CONTEXTO_EMPRESA.nombre} de forma natural, no como anuncio.
- Menciona la app en un contexto de uso real, nunca como interrupción.
- El CTA final debe ser claro y sin presión: "Puedes probarlo en [url]".
- El espectador debe sentir que descubrió algo, no que le vendieron algo.`,
    marca:
        `OBJETIVO: Construcción de marca.
Este vídeo construye la relación a largo plazo. No necesita CTA agresivo.
- Muestra la personalidad y forma de pensar detrás de ${CONTEXTO_EMPRESA.nombre}.
- Los valores de la marca (simplicidad, integración, bienestar) deben ser perceptibles.
- El espectador debe salir sintiendo que conoce mejor quién está detrás.
- Autenticidad por encima de perfección de producción.`,
    conversion:
        `OBJETIVO: Conversión directa.
El vídeo debe mover al espectador a una acción específica.
- Primera mención del CTA: a mitad del vídeo, de forma natural.
- Segunda mención: en los últimos 15 segundos, directa y sin disculpas.
- El argumento final debe resolver la última objeción antes de pedir la acción.
- El enlace debe ser visible en pantalla o en la descripción.`,
};

// ── Generador principal ───────────────────────────────────────────────────────

export function generarBriefing(pieza: PiezaContenido): string {
    const fecha = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const angulo = `El contenido debe conectar directamente con el problema cotidiano de la audiencia. El título es el hook: si no para el scroll, el guion no importa.`;

    const sep = '─'.repeat(54);

    return `BRIEFING EDITORIAL
${'═'.repeat(54)}
${CONTEXTO_EMPRESA.nombre} · Sala de Producción
${fecha}
${'═'.repeat(54)}

Actúa como un guionista profesional especializado en
contenido para redes sociales y vídeo corto.

Tu cliente es ${CONTEXTO_EMPRESA.nombre}.
Necesitas crear el guion completo de un vídeo.

${sep}
PIEZA
${sep}

Título:    ${pieza.titulo}
Categoría: ${pieza.categoria.charAt(0).toUpperCase() + pieza.categoria.slice(1)}
Formato:   ${pieza.formato.charAt(0).toUpperCase() + pieza.formato.slice(1)}
Objetivo:  ${pieza.objetivo.charAt(0).toUpperCase() + pieza.objetivo.slice(1)}

${sep}
SOBRE ${CONTEXTO_EMPRESA.nombre.toUpperCase()}
${sep}

Visión: ${CONTEXTO_EMPRESA.vision}

Misión: ${CONTEXTO_EMPRESA.mision}

Iniciativa principal ahora mismo:
"${CONTEXTO_EMPRESA.iniciativaPrioritaria.nombre}" — ${CONTEXTO_EMPRESA.iniciativaPrioritaria.razon}

${sep}
AUDIENCIA OBJETIVO
${sep}

${AUDIENCIA[pieza.categoria]}

${sep}
ÁNGULO EDITORIAL
${sep}

${angulo}

${sep}
INSTRUCCIONES DE FORMATO
${sep}

${INSTRUCCIONES_FORMATO[pieza.formato]}

${sep}
INSTRUCCIONES DE OBJETIVO
${sep}

${INSTRUCCIONES_OBJETIVO[pieza.objetivo]}

${sep}
SOLICITUD
${sep}

Escribe el guion completo listo para grabar,
estructurado así:

  1. HOOK — las primeras palabras que paran el scroll
  2. PROBLEMA — qué duele y por qué le importa
  3. DESARROLLO — el contenido prometido en el título
  4. CIERRE — resumen + CTA si aplica

Requisitos técnicos:
- Primera persona, tono conversacional
- Sin tecnicismos innecesarios
- Cada párrafo pronunciable de un solo aliento
- Duración estimada indicada al inicio
- Indicaciones de ritmo o pausa donde sea necesario

${bloquesModoRealidad(CONTEXTO_EMPRESA.nombre)}

${'═'.repeat(54)}
Generado por Sala de Producción · ${CONTEXTO_EMPRESA.nombre}
${'═'.repeat(54)}`;
}
