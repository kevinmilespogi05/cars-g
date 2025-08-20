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
  const notificationTitle = payload.notification?.title || 'Cars-G';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/pwa-192x192.png',
    data: payload.data || {},
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const link = event.notification?.data?.link;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if (link) client.navigate(link);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(link || '/');
      }
    })
  );
});


