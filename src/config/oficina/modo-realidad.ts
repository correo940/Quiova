// Bloque de reglas obligatorias inyectado en todos los briefings.
// La IA lo lee justo antes de generar: actúa como último filtro editorial.

export function bloquesModoRealidad(nombre: string): string {
    const sep = '═'.repeat(54);
    return `${sep}
MODO REALIDAD
${sep}

Estas reglas son OBLIGATORIAS. No opcionales.
Léelas antes de escribir una sola palabra del guion.

1. NO inventar usuarios.
   Nunca escribas "mi cliente X" ni "una madre que usa ${nombre}".
   Si no hay un caso real documentado en el contexto, no existe.

2. NO inventar testimonios.
   Frases como "Desde que uso ${nombre}..." o "Me ha cambiado la vida..."
   solo son válidas si provienen de datos reales del contexto recibido.

3. NO inventar experiencias personales.
   "Mi hijo lleva tres semanas con su reto de lectura" es ficción
   a menos que esté documentado. No lo uses.

4. NO fabricar estadísticas ni resultados.
   Porcentajes, tiempos de mejora, tasas de retención: solo si
   aparecen literalmente en el contexto. Si no están, no los pongas.

5. NO afirmar que una funcionalidad existe si no aparece
   en el contexto recibido. La plataforma puede estar en desarrollo.

6. Si necesitas un ejemplo concreto para ilustrar algo:
   - Usa un ejemplo HIPOTÉTICO.
   - Indícalo con claridad: "Imagina que...", "Por ejemplo..."
   - Nunca lo presentes como real o como testimonio.

7. Diferencia siempre entre:
   REAL      → dato o hecho que aparece en el contexto recibido
   HIPOTÉTIC → ejemplo inventado para ilustrar, marcado como tal
   VISIÓN    → aspiración o intención futura de ${nombre}

──────────────────────────────────────────────────────
Cuando el contenido trate sobre ${nombre} o sus apps:
──────────────────────────────────────────────────────

PRIORIZA:
  • El problema real que resuelve
  • La visión y la utilidad concreta
  • Cómo funciona y qué ofrece hoy

EVITA:
  • Historias de usuarios inventados
  • Resultados que no han sido medidos
  • Afirmaciones que no puedas verificar
  • Lenguaje de marketing vacío sin respaldo real

La credibilidad del contenido vale más que el marketing.
El guion debe poder publicarse con la firma real de ${nombre}.`;
}
