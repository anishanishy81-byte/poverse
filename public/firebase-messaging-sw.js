// Firebase Cloud Messaging Service Worker
// This file must be in the public folder for FCM to work

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase with your config
firebase.initializeApp({
  apiKey: 'AIzaSyB7hNZXeXr5cy2o3U1xrGm3ih-Ce2mToiY',
  authDomain: 'po-verse.firebaseapp.com',
  projectId: 'po-verse',
  storageBucket: 'po-verse.firebasestorage.app',
  messagingSenderId: '604319923602',
  appId: '1:604319923602:web:31e82e06e9a9cf5aae154b',
});

const messaging = firebase.messaging();

// Helper function to check if app is in foreground (visible window exists)
const isAppInForeground = async () => {
  const windowClients = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  
  // Check if any window is visible (not minimized or in background)
  return windowClients.some(client => client.visibilityState === 'visible');
};

// Handle background messages - ONLY when app is not in foreground
messaging.onBackgroundMessage(async (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  // Check if app is in foreground - if so, don't show notification
  // The in-app notification will handle it
  const inForeground = await isAppInForeground();
  if (inForeground) {
    console.log('[firebase-messaging-sw.js] App is in foreground, skipping notification bar');
    return;
  }

  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    image: payload.notification?.image,
    tag: payload.data?.notificationId || 'default',
    data: payload.data,
    vibrate: [200, 100, 200],
    requireInteraction: payload.data?.priority === 'high' || payload.data?.priority === 'urgent',
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'dismiss') {
    return;
  }

  // Get the click action URL
  const clickAction = data?.clickAction || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: data,
            clickAction: clickAction,
          });
          return;
        }
      }

      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});

// Handle push event directly (fallback)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received');

  event.waitUntil(
    (async () => {
      // Check if app is in foreground - if so, don't show notification
      const inForeground = await isAppInForeground();
      if (inForeground) {
        console.log('[firebase-messaging-sw.js] App is in foreground, skipping push notification');
        return;
      }

      if (event.data) {
        try {
          const payload = event.data.json();
          
          // Only show notification if messaging handler didn't already
          if (!payload.notification) {
            const title = payload.data?.title || 'New Notification';
            const options = {
              body: payload.data?.body || '',
              icon: '/icons/icon-192x192.png',
              badge: '/icons/badge-72x72.png',
              data: payload.data,
            };

            await self.registration.showNotification(title, options);
          }
        } catch (error) {
          console.error('[firebase-messaging-sw.js] Error parsing push data:', error);
        }
      }
    })()
  );
});

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated');
  event.waitUntil(self.clients.claim());
});

// Service worker installation
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installed');
  self.skipWaiting();
});
