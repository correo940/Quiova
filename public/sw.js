self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Quioba', body: event.data ? event.data.text() : '' };
  }

  const isChat = data.type === 'chat';
  const title = data.title || 'Quioba';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/', type: data.type || 'general' },
    tag: data.tag || 'quioba',
    renotify: true,
    vibrate: [200, 100, 200],
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      if (navigator.setAppBadge) {
        return self.registration.getNotifications().then((notifications) => {
          navigator.setAppBadge(notifications.length);
        });
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    self.registration.getNotifications().then((notifications) => {
      if (navigator.clearAppBadge && notifications.length === 0) {
        navigator.clearAppBadge();
      } else if (navigator.setAppBadge) {
        navigator.setAppBadge(notifications.length);
      }
    }).then(() => {
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
  event.waitUntil(
    self.registration.getNotifications().then((notifications) => {
      if (navigator.clearAppBadge && notifications.length === 0) {
        navigator.clearAppBadge();
      } else if (navigator.setAppBadge) {
        navigator.setAppBadge(notifications.length);
      }
    })
  );
});
