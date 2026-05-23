'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Verificar si el usuario ya ha tomado una decisión sobre las cookies
    const cookieConsent = localStorage.getItem('quioba_cookie_consent');
    if (!cookieConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('quioba_cookie_consent', 'accepted');
    setShowBanner(false);
  };

  const handleReject = () => {
    localStorage.setItem('quioba_cookie_consent', 'rejected');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 p-4 md:p-6 animate-in slide-in-from-bottom-5 duration-700">
      <div className="max-w-4xl mx-auto bg-[#071e10]/95 backdrop-blur-md border border-[#1a5c2e]/50 rounded-2xl shadow-2xl overflow-hidden text-white">
        <div className="flex flex-col md:flex-row items-center justify-between p-6 gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🍪</span>
              <h3 className="text-lg font-bold">Valoramos tu privacidad</h3>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              Utilizamos cookies propias y de terceros para mejorar nuestros servicios, personalizar el contenido y analizar el tráfico de nuestro sitio web. 
              Al hacer clic en "Aceptar todas", aceptas el uso de todas las cookies. Puedes leer más al respecto en nuestra{' '}
              <Link href="/cookies" className="underline hover:text-white transition-colors font-medium">
                Política de Cookies
              </Link>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={handleReject}
              className="px-6 py-2.5 rounded-full border border-white/20 text-sm font-semibold hover:bg-white/10 transition-colors w-full sm:w-auto"
            >
              Rechazar no esenciales
            </button>
            <button
              onClick={handleAccept}
              className="px-6 py-2.5 rounded-full bg-white text-[#071e10] text-sm font-bold hover:bg-gray-200 transition-colors hover:scale-105 active:scale-95 w-full sm:w-auto"
            >
              Aceptar todas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
