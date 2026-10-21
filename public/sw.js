// Service worker: shows streak reminders sent by /api/cron/remind.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'MyGymTrack', {
    body: data.body, icon: '/icon-192.png', badge: '/badge-96.png', data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window' }).then((list) => {
    for (const c of list) if ('focus' in c) return c.focus();
    return clients.openWindow(event.notification.data.url);
  }));
});
