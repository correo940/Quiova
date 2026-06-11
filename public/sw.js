// Service Worker — handles scheduled (TimestampTrigger) and push notifications

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Open the app (or focus existing tab) when user taps a notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((all) => {
        const existing = all.find((c) => c.url.startsWith(self.location.origin));
        return existing ? existing.focus() : self.clients.openWindow(url);
      })
  );
});
