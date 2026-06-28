/**
 * Layout propio para las Guías Vivas.
 *
 * En Next.js App Router no hay "opt-out" de layouts padre: el root layout
 * (con Header, Footer, MobileNav) siempre envuelve todo.
 *
 * Solución: `fixed inset-0 z-[100]` convierte esta capa en un overlay
 * que cubre visualmente toda la chrome del app-shell — las guías
 * se sienten como una aplicación independiente dentro de la misma URL.
 *
 * El z-[100] está por encima del Header (~z-50) y del MobileNav (~z-50)
 * pero por debajo de modales (z-[200]+) si los hubiera.
 *
 * Cada pantalla individual usa `min-h-full` para llenar este contenedor.
 */
export default function GuiasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="guia-shell"
      className="fixed inset-0 z-[9999] overflow-y-auto"
    >
      {children}
    </div>
  )
}
