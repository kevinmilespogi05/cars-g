/* eslint-disable no-undef */
// Firebase Messaging service worker

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Firebase Web App config (required for installations). Keep these in sync with your env config.
var FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBaDNk0l_Hveq0r4xp15-K_Zm2uFwhkIPs',
  authDomain: 'carsg-d5bed.firebaseapp.com',
  projectId: 'carsg-d5bed',
  messagingSenderId: '672452977686',
  appId: '1:672452977686:web:109661be796952ddbf8137'
};

firebase.initializeApp(FIREBASE_CONFIG);

const messaging = firebase.messaging();

// Ensure SW takes control immediately (useful during development)
self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function() {
  self.clients.claim();
});

messaging.onBackgroundMessage(function(payload) {
  console.log('Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'Cars-G';
  const isChatNotification = payload.data?.type === 'chat' || notificationTitle.includes('message');
  
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: isChatNotification ? 'chat' : 'default',
    requireInteraction: isChatNotification, // Chat notifications should require interaction
    silent: false,
    data: payload.data || {},
    vibrate: isChatNotification ? [200, 100, 200] : undefined, // Special vibration for chat
    actions: isChatNotification ? [
      {
        action: 'reply',
        title: 'Reply',
        icon: '/pwa-192x192.png'
      },
      {
        action: 'view',
        title: 'View Chat',
        icon: '/pwa-192x192.png'
      }
    ] : [
      {
        action: 'view',
        title: 'View',
        icon: '/pwa-192x192.png'
      }
    ]
  };
  
  // Show the notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('push', function(event) {
  try {
    const raw = event.data ? event.data.json() : {};
    // Normalize payload structure between generic WebPush and FCM
    const n = raw.notification || {};
    const d = raw.data || {};
    const title = n.title || raw.title || 'Cars-G';
    const body = n.body || raw.body || '';
    const link = (raw.fcmOptions && raw.fcmOptions.link) || d.link || '/';
    const isChatNotification = d.type === 'chat' || title.includes('message');

    const options = {
      body,
      icon: n.icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: isChatNotification ? 'chat' : 'default',
      requireInteraction: isChatNotification, // Chat notifications should require interaction
      silent: false,
      vibrate: isChatNotification ? [200, 100, 200] : undefined, // Special vibration for chat
      data: Object.assign({}, d, { link }),
      actions: isChatNotification ? [
        {
          action: 'reply',
          title: 'Reply',
          icon: '/pwa-192x192.png'
        },
        {
          action: 'view',
          title: 'View Chat',
          icon: '/pwa-192x192.png'
        }
      ] : [
        {
          action: 'view',
          title: 'View',
          icon: '/pwa-192x192.png'
        }
      ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    // Fallback: show minimal notification
    event.waitUntil(self.registration.showNotification('Cars-G', { body: '' }));
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const data = event.notification?.data || {};
  const link = data.link || '/';
  const conversationId = data.conversationId;
  const action = event.action;
  const isChatNotification = data.type === 'chat';
  
  console.log('Notification clicked:', { action, data, isChatNotification });
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Handle chat-specific actions
      if (isChatNotification) {
        if (action === 'reply') {
          // For reply action, navigate to chat with focus on input
          const chatLink = link.includes('?') ? `${link}&focus=input` : `${link}?focus=input`;
          
          for (const client of windowClients) {
            if ('focus' in client) {
              client.focus();
              client.navigate(chatLink);
              return;
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(chatLink);
          }
        } else if (action === 'view' || !action) {
          // For view action or default click, navigate to chat
          for (const client of windowClients) {
            if ('focus' in client) {
              client.focus();
              client.navigate(link);
              return;
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(link);
          }
        }
      } else {
        // Handle non-chat notifications
        if (action === 'view' || !action) {
          for (const client of windowClients) {
            if ('focus' in client) {
              client.focus();
              client.navigate(link);
              return;
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(link);
          }
        }
      }
    })
  );
});


