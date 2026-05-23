import React from 'react';

export const metadata = {
  title: 'Política de Cookies | Quioba',
  description: 'Política de Cookies de Quioba.com, información sobre el uso de cookies y opciones de consentimiento.',
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-20 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#071e10] px-8 py-12 text-center">
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4">Política de Cookies</h1>
          <p className="text-white/70 text-lg">Quioba.com</p>
        </div>
        
        <div className="p-8 md:p-12 text-gray-700 space-y-8 leading-relaxed">
          <section>
            <p>
              Quioba.com utiliza cookies propias y de terceros para ofrecer una mejor experiencia de usuario, 
              personalizar contenidos y análisis del tráfico. Según la normativa española y europea vigente 
              (Ley 34/2002, LSSI-CE, y RGPD), los usuarios deben recibir información clara y comprensible sobre 
              el uso de cookies y prestar su consentimiento informado antes de activar aquellas que no sean estrictamente necesarias.
            </p>
            <p className="mt-4">
              El Tribunal de Justicia de la UE (caso Planet49) ha establecido que el consentimiento debe ser 
              activo e inequívoco: no basta con una casilla premarcada, y se debe informar sobre la duración de las 
              cookies y sobre los terceros que puedan tener acceso a ellas. La Agencia Española de Protección de Datos 
              (AEPD) insiste en que las opciones de “Aceptar” y “Rechazar” cookies deben presentarse al mismo nivel y 
              con la misma visibilidad, sin crear sesgos que dificulten el rechazo.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Qué son las cookies?</h2>
            <p>
              Son pequeños archivos que el sitio web instala en el dispositivo del usuario para almacenar información 
              técnica (por ejemplo, para mantener la sesión abierta) o sobre hábitos de navegación. Su función genérica 
              es facilitar la navegación, reconocer preferencias y recopilar información estadística o publicitaria. 
              En la práctica, pueden servir para “reconocerte como usuario, obtener información sobre tus hábitos de 
              navegación o personalizar la forma en que se muestra el contenido”.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Tipos de cookies que utilizamos</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong>Cookies estrictamente necesarias (técnicas):</strong> imprescindibles para el funcionamiento 
                básico del sitio (autenticación de usuario, seguridad, equilibrio de carga, etc.). No requieren 
                consentimiento y no pueden desactivarse.
              </li>
              <li>
                <strong>Cookies de preferencia o personalización:</strong> guardan opciones seleccionadas por el usuario 
                (por ejemplo, idioma o formato de visualización). Si el usuario elige manualmente estas preferencias 
                (por ejemplo, selecciona el idioma), estas cookies se consideran “técnicas” y no requieren consentimiento.
              </li>
              <li>
                <strong>Cookies de análisis o rendimiento:</strong> contabilizan el número de visitas y permiten conocer 
                el comportamiento de los usuarios (por ejemplo, Google Analytics). Se usan para generar estadísticas 
                anónimas que ayuden a mejorar el sitio.
              </li>
              <li>
                <strong>Cookies publicitarias o de marketing:</strong> rastrean el historial de navegación para mostrar 
                anuncios relacionados con los intereses del usuario. También facilitan la medición de efectividad de 
                campañas publicitarias.
              </li>
            </ul>
            <p className="mt-4">
              Cuando utilizamos servicios de terceros que instalan cookies en nuestro sitio (por ejemplo, herramientas 
              de analítica o redes sociales), informamos de forma genérica de su presencia y finalidad. No es obligatorio 
              detallar todos los terceros por nombre en la política, pero sí explicar sus finalidades y remitir, si es 
              posible, a sus políticas de cookies. En todo caso, el usuario puede consultar qué cookies activa cada 
              servicio tercero y cómo gestionarlas (ver más abajo).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Aceptación y gestión del consentimiento</h2>
            <p>
              Al acceder a Quioba.com aparece un aviso (banner) que resume el uso de cookies y ofrece dos opciones claras: 
              “Aceptar todas” o “Rechazar cookies no esenciales”. Estas opciones están al mismo nivel y con igual prominencia, 
              cumpliendo el criterio de la AEPD. Al pulsar Aceptar, el usuario presta su consentimiento explícito al uso 
              de todas las cookies habilitadas. Si elige Rechazar, únicamente se instalarán las cookies necesarias para 
              la navegación segura y el correcto funcionamiento del sitio.
            </p>
            <p className="mt-4">
              Según la Guía de la AEPD, el sistema de rechazo debe ser tan sencillo como el de aceptación, y el usuario 
              debe poder revocar su consentimiento “tan fácilmente como lo otorgó”. Por ello, en cualquier momento usted 
              puede cambiar de opinión y bloquear o eliminar las cookies siguiendo los mecanismos descritos a continuación.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cómo rechazar o eliminar las cookies</h2>
            <p>
              Usted puede deshabilitar o eliminar las cookies a través de las opciones de configuración de su navegador 
              o mediante herramientas específicas. La mayoría de los navegadores (Chrome, Firefox, Safari, Edge, etc.) 
              permiten, desde el apartado de Privacidad y Seguridad, gestionar las cookies: rechazarlas todas, permitir 
              solo las necesarias o borrar las existentes.
            </p>
            <p className="mt-4">
              La AEPD indica que el usuario puede “aceptar o rechazar las cookies de terceros desde las opciones de 
              configuración de su navegador”. También puede encontrar información en la ayuda de su navegador o en 
              portales especializados sobre cómo cambiar estos ajustes. Tenga en cuenta que, si bloquea o elimina las 
              cookies de terceros (por ejemplo, las de servicios de analítica o publicidad), es posible que algunas 
              funcionalidades del sitio (contenido personalizado o recomendaciones) no estén disponibles o no funcionen correctamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Actualización de la política</h2>
            <p>
              Esta Política de Cookies se actualizará conforme cambien las normas o nuestras prácticas. Cualquier 
              modificación sustancial será comunicada a los usuarios junto con la renovación del consentimiento si 
              corresponde. Para información más detallada sobre privacidad y derechos de los usuarios (acceso, 
              rectificación, supresión, portabilidad, limitación u oposición), consulte nuestra Política de Privacidad.
            </p>
          </section>

          <section>
            <p className="font-semibold text-gray-900">
              En resumen, en Quioba.com cumplimos con el artículo 22 de la LSSI-CE y con el RGPD, garantizando que 
              las cookies se utilizan sólo con el consentimiento informado del usuario. El usuario puede aceptar todas 
              las cookies o rechazarlas (al menos las no esenciales) de forma libre y fácil, y siempre queda la 
              posibilidad de gestionar sus preferencias desde su navegador o configurador de cookies.
            </p>
          </section>

          <section className="bg-gray-50 p-6 rounded-xl border border-gray-100 text-sm">
            <h3 className="font-bold text-gray-900 mb-2">Fuentes:</h3>
            <p>
              Legislación y directrices de la LSSI-CE y RGPD, sentencias del TJUE (ej. Planet49 C‑673/17) y guías 
              de la AEPD sobre cookies. Estos documentos establecen los criterios sobre información, consentimiento, 
              categorías de cookies y facilidad para revocar la aceptación. Cada una de estas obligaciones se refleja 
              en la presente política.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
