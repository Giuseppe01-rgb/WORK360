// Custom Service Worker for Push Notifications
// This file is injected into the generated service worker by vite-plugin-pwa

// Handle push events
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);

    let payload = {
        title: 'WORK360',
        body: 'Hai una nuova notifica',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url: '/',
        tag: 'work360-notification'
    };

    // Parse push data if available
    if (event.data) {
        try {
            payload = { ...payload, ...event.data.json() };
        } catch (e) {
            console.error('[SW] Error parsing push data:', e);
        }
    }

    const options = {
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        tag: payload.tag,
        requireInteraction: payload.requireInteraction || false,
        data: {
            url: payload.url,
            ...payload.data
        },
        // Vibration pattern for mobile
        vibrate: [200, 100, 200],
        // Actions (optional)
        actions: payload.actions || [
            { action: 'open', title: 'Apri' },
            { action: 'close', title: 'Chiudi' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click:', event);

    event.notification.close();

    // Get the URL to open
    const url = event.notification.data?.url || '/';

    // Handle action buttons
    if (event.action === 'close') {
        return;
    }

    // Open or focus the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                // Otherwise, open a new window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed:', event.notification.tag);
});
