self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Quioba', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Quioba';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/', type: data.type || 'general' },
    tag: data.tag || 'quioba-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Cerrar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      if (self.navigator && self.navigator.setAppBadge) {
        return self.registration.getNotifications().then((notifications) => {
          self.navigator.setAppBadge(notifications.length);
        });
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  if (action === 'close') {
    event.waitUntil(updateBadge());
    return;
  }

  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    updateBadge().then(() => {
      return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
        return undefined;
      });
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  event.waitUntil(updateBadge());
});

function updateBadge() {
  return self.registration.getNotifications().then((notifications) => {
    if (self.navigator && self.navigator.setAppBadge) {
      if (notifications.length === 0) {
        return self.navigator.clearAppBadge();
      }
      return self.navigator.setAppBadge(notifications.length);
    }
  });
}
