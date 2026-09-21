'use client';

import { useEffect, useState } from 'react';
import { useShareTarget } from '@/context/ShareTargetContext';
import ShareAnalysisDialog from './share-analysis-dialog';

/**
 * Entrada única de "Compartir → Quioba", montada a nivel de app: cualquier
 * imagen compartida desde el móvil abre este diálogo, sea cual sea la
 * pantalla en la que esté el usuario.
 */
export default function ShareAnalysisManager() {
    const { sharedImageBase64, consumeSharedImage } = useShareTarget();
    const [image, setImage] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (sharedImageBase64) {
            setImage(consumeSharedImage());
            setOpen(true);
        }
    }, [sharedImageBase64, consumeSharedImage]);

    return <ShareAnalysisDialog open={open} onOpenChange={setOpen} imageBase64={image} />;
}
