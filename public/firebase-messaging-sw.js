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
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.notification?.tag || 'default',
    requireInteraction: false,
    silent: false,
    data: payload.data || {},
    actions: [
      {
        action: 'reply',
        title: 'Reply',
        icon: '/pwa-192x192.png'
      },
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

    const options = {
      body,
      icon: n.icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: n.tag || 'default',
      data: Object.assign({}, d, { link })
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
  
  console.log('Notification clicked:', { action, data });
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // If action is reply, navigate to chat with focus on input
      if (action === 'reply' && conversationId) {
        const chatLink = `/chat?conversationId=${conversationId}&focus=input`;
        
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
      }
      
      // Default behavior: navigate to the link
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if (link) client.navigate(link);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    })
  );
});


