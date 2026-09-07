'use client';

import { useEffect, useState } from 'react';
import { Share, X } from 'lucide-react';
import { debeMostrarAvisoIOS } from '@/lib/ios-install';

const CLAVE_DESCARTADO = 'quioba_aviso_instalar_ios';

/**
 * En iPhone no existe el aviso automatico de instalacion que sale en Android:
 * hay que tocar Compartir y luego "Añadir a pantalla de inicio", y casi nadie
 * lo sabe. Esto lo explica una vez, solo a quien puede hacerlo.
 */
export default function IosInstallHint() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let descartado = false;
        try {
            descartado = localStorage.getItem(CLAVE_DESCARTADO) === '1';
        } catch {
            // Modo privado o cookies bloqueadas: se muestra igual, no pasa nada.
        }

        setVisible(debeMostrarAvisoIOS({
            userAgent: window.navigator.userAgent,
            maxTouchPoints: navigator.maxTouchPoints,
            yaInstalada: (window.navigator as { standalone?: boolean }).standalone === true
                || window.matchMedia('(display-mode: standalone)').matches,
            descartado,
        }));
    }, []);

    const cerrar = () => {
        setVisible(false);
        try {
            localStorage.setItem(CLAVE_DESCARTADO, '1');
        } catch {
            // Sin almacenamiento volvera a salir; es preferible a fallar.
        }
    };

    if (!visible) return null;

    return (
        <div
            role="complementary"
            aria-label="Instalar Quioba en la pantalla de inicio"
            className="fixed left-3 right-3 z-[60] bottom-[calc(1rem+env(safe-area-inset-bottom))]
                       rounded-2xl border border-green-900/10 bg-white/95 p-4 shadow-lg backdrop-blur
                       dark:border-white/10 dark:bg-slate-900/95"
        >
            <div className="flex items-start gap-3">
                <img src="/icon-192.png" alt="" width={40} height={40} className="rounded-xl" />

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Instala Quioba en tu iPhone
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                        Toca{' '}
                        <Share className="inline h-4 w-4 -mt-0.5 text-blue-600 dark:text-blue-400" aria-label="Compartir" />{' '}
                        y luego <span className="font-medium">Añadir a pantalla de inicio</span>. Se abrirá
                        como una app, sin barra del navegador.
                    </p>
                </div>

                <button
                    onClick={cerrar}
                    aria-label="Cerrar el aviso"
                    className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full
                               text-slate-400 transition hover:bg-slate-100 hover:text-slate-600
                               dark:hover:bg-white/10"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
