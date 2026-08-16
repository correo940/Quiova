'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';
import { consumePendingShareEvent, hasPendingShareEvent } from '@/lib/share-target-init';
import { toast } from 'sonner';

interface ShareTargetContextType {
    sharedImageBase64: string | null;
    consumeSharedImage: () => string | null;
}

const ShareTargetContext = createContext<ShareTargetContextType>({
    sharedImageBase64: null,
    consumeSharedImage: () => null,
});

export function useShareTarget() {
    return useContext(ShareTargetContext);
}

/**
 * Converts a native file path to a base64 data URL.
 * Uses fetch+FileReader (avoids Image+Canvas CORS issues with remote server URLs).
 * Falls back to Image+Canvas if fetch fails.
 */
async function imageUriToBase64(uri: string): Promise<string> {
    let webUrl = uri;
    try {
        webUrl = Capacitor.convertFileSrc(uri);
    } catch (e) {
        console.log('[ShareTarget] convertFileSrc failed, using raw URI');
    }

    // Also try file:// prefix if the URI is an absolute path without scheme
    const fileUrl = uri.startsWith('/') ? `file://${uri}` : uri;

    console.log('[ShareTarget] Loading image from:', webUrl.substring(0, 120));

    // Method 1: fetch + FileReader (most reliable in WebView with remote server URL)
    for (const url of [webUrl, fileUrl]) {
        try {
            const response = await fetch(url, { mode: 'no-cors' });
            if (response.type === 'opaque') {
                // no-cors gave us an opaque response, try without
                const response2 = await fetch(url);
                if (response2.ok) {
                    const blob = await response2.blob();
                    if (blob.size > 0) {
                        const dataUrl = await blobToDataUrl(blob);
                        console.log('[ShareTarget] ✅ Image → base64 via fetch, length:', dataUrl.length);
                        return dataUrl;
                    }
                }
            } else if (response.ok) {
                const blob = await response.blob();
                if (blob.size > 0) {
                    const dataUrl = await blobToDataUrl(blob);
                    console.log('[ShareTarget] ✅ Image → base64 via fetch, length:', dataUrl.length);
                    return dataUrl;
                }
            }
        } catch (fetchErr) {
            console.log('[ShareTarget] fetch failed for', url.substring(0, 80), fetchErr);
        }
    }

    // Method 2: XMLHttpRequest (some WebViews handle XHR differently from fetch)
    try {
        const dataUrl = await xhrToDataUrl(webUrl);
        console.log('[ShareTarget] ✅ Image → base64 via XHR, length:', dataUrl.length);
        return dataUrl;
    } catch (xhrErr) {
        console.log('[ShareTarget] XHR failed:', xhrErr);
    }

    // Method 3: Image + Canvas fallback (original approach, may have CORS issues)
    return new Promise((resolve, reject) => {
        const tryCanvas = (crossOrigin: boolean) => {
            const img = new Image();
            if (crossOrigin) img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { reject(new Error('No canvas context')); return; }
                    ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    console.log('[ShareTarget] ✅ Image → base64 via canvas, length:', dataUrl.length);
                    resolve(dataUrl);
                } catch (err) {
                    if (crossOrigin) {
                        console.log('[ShareTarget] Canvas tainted with crossOrigin, retrying without');
                        tryCanvas(false);
                    } else {
                        reject(err);
                    }
                }
            };
            img.onerror = () => {
                if (crossOrigin) {
                    console.log('[ShareTarget] Image load failed with crossOrigin, retrying without');
                    tryCanvas(false);
                } else {
                    reject(new Error('Failed to load image from all methods'));
                }
            };
            img.src = webUrl;
        };
        tryCanvas(true);
    });
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function xhrToDataUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        xhr.onload = () => {
            if (xhr.status === 200 && xhr.response.size > 0) {
                blobToDataUrl(xhr.response).then(resolve).catch(reject);
            } else {
                reject(new Error(`XHR status ${xhr.status}`));
            }
        };
        xhr.onerror = () => reject(new Error('XHR error'));
        xhr.send();
    });
}

/**
 * Process a ShareReceivedEvent: extract the image, convert to base64, navigate.
 */
async function processShareEvent(
    event: any,
    setImage: (img: string) => void,
    router: ReturnType<typeof useRouter>
) {
    console.log('[ShareTarget] Processing event:', JSON.stringify(event).substring(0, 200));

    if (!event) {
        console.error('[ShareTarget] ❌ Null event received');
        return;
    }

    if (event.files && event.files.length > 0) {
        const file = event.files[0];
        console.log('[ShareTarget] Processing file:', file.name, file.mimeType, 'uri:', file.uri?.substring(0, 100));

        if (!file.uri) {
            console.error('[ShareTarget] ❌ No URI in file data');
            toast.error('Error: la imagen compartida no tiene ruta de archivo');
            return;
        }

        toast.loading('Procesando imagen compartida...', { id: 'share-processing' });

        try {
            const base64 = await imageUriToBase64(file.uri);
            toast.dismiss('share-processing');
            setImage(base64);
            router.push('/apps/mi-hogar/tasks');
        } catch (err) {
            toast.dismiss('share-processing');
            console.error('[ShareTarget] ❌ Error converting image:', err);
            toast.error('No se pudo procesar la imagen compartida. Intenta subirla manualmente desde Tareas.');
        }
    } else if (event.texts && event.texts.length > 0) {
        console.log('[ShareTarget] Received text share (not supported yet):', event.texts[0]?.substring(0, 100));
        toast.info('Solo se pueden compartir imágenes por ahora');
    } else {
        console.error('[ShareTarget] ❌ No files or texts in share event:', Object.keys(event));
        toast.error('No se detectó contenido en el envío');
    }
}

export function ShareTargetProvider({ children }: { children: React.ReactNode }) {
    const [sharedImageBase64, setSharedImageBase64] = useState<string | null>(null);
    const router = useRouter();
    const processedRef = useRef(false);

    const consumeSharedImage = useCallback(() => {
        const img = sharedImageBase64;
        setSharedImageBase64(null);
        return img;
    }, [sharedImageBase64]);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        // === COLD START ===
        // Check if the early-init module buffered a share event.
        // Retry a few times to handle the race condition where the native plugin
        // fires the event before the JS listener in share-target-init.ts is ready.
        const checkPending = () => {
            if (processedRef.current) return;
            const pendingEvent = consumePendingShareEvent();
            if (pendingEvent) {
                processedRef.current = true;
                console.log('[ShareTarget] 🧊 Cold start: found buffered event');
                processShareEvent(pendingEvent, setSharedImageBase64, router);
            }
        };

        checkPending();
        // Retry after short delays in case the native event hasn't been bridged yet
        const t1 = setTimeout(checkPending, 500);
        const t2 = setTimeout(checkPending, 1500);
        const t3 = setTimeout(checkPending, 3000);

        // === WARM START ===
        // Listen for future shares via DOM event from share-target-init
        const handleShareEvent = (e: Event) => {
            const customEvent = e as CustomEvent;
            console.log('[ShareTarget] 🔥 Warm start: received DOM event');
            processShareEvent(customEvent.detail, setSharedImageBase64, router);
        };

        window.addEventListener('quioba-share-received', handleShareEvent);

        return () => {
            window.removeEventListener('quioba-share-received', handleShareEvent);
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [router]);

    return (
        <ShareTargetContext.Provider value={{ sharedImageBase64, consumeSharedImage }}>
            {children}
        </ShareTargetContext.Provider>
    );
}
