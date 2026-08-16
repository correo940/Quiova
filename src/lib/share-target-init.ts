/**
 * Share Target Early Init
 *
 * This module registers the share listener IMMEDIATELY on import,
 * BEFORE React hydration. This ensures we capture the intent that
 * launched the app (cold start), not just intents received while running.
 *
 * Any received share data is buffered and also dispatched as a custom
 * DOM event for React components to pick up.
 */

let pendingShareEvent: any = null;
let listenerRegistered = false;

// Self-executing: register listener immediately on import
if (typeof window !== 'undefined') {
    // Use dynamic import to avoid SSR issues
    import('@capacitor/core').then(({ Capacitor }) => {
        if (!Capacitor.isNativePlatform()) return;

        import('@capgo/capacitor-share-target').then(({ CapacitorShareTarget }) => {
            if (listenerRegistered) return;
            listenerRegistered = true;

            CapacitorShareTarget.addListener('shareReceived', (event) => {
                console.log('[ShareTarget:Early] 📥 Event received:', JSON.stringify(event).substring(0, 300));
                pendingShareEvent = event;

                // Dispatch DOM event for any mounted React components
                window.dispatchEvent(
                    new CustomEvent('quioba-share-received', { detail: event })
                );
            });

            // Also check if there's already a pending intent that was received
            // before we registered the listener (race condition fix)
            if (typeof (CapacitorShareTarget as any).checkForPendingIntent === 'function') {
                (CapacitorShareTarget as any).checkForPendingIntent().then((result: any) => {
                    if (result && (result.files?.length > 0 || result.texts?.length > 0)) {
                        console.log('[ShareTarget:Early] 📥 Found pending intent:', JSON.stringify(result).substring(0, 300));
                        pendingShareEvent = result;
                        window.dispatchEvent(
                            new CustomEvent('quioba-share-received', { detail: result })
                        );
                    }
                }).catch(() => {});
            }

            console.log('[ShareTarget:Early] ✅ Listener registered (before React)');
        }).catch((err) => {
            console.log('[ShareTarget:Early] Plugin not available:', err);
        });
    }).catch(() => { });
}

/**
 * Get and consume any pending share data from cold start.
 * Returns null if no pending data.
 */
export function consumePendingShareEvent() {
    const data = pendingShareEvent;
    pendingShareEvent = null;
    return data;
}

/**
 * Check if there's pending share data without consuming it.
 */
export function hasPendingShareEvent() {
    return pendingShareEvent !== null;
}
