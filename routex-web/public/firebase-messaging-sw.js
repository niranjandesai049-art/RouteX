// Official Firebase Cloud Messaging Background Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Parse query parameters from the service worker registration URL to avoid hardcoding configuration
const params = new URLSearchParams(self.location.search);

const firebaseConfig = {
  apiKey: params.get('apiKey') || 'AIzaSyPlaceholderKeyForRouteXApp12345678',
  authDomain: params.get('authDomain') || 'routex-india.firebaseapp.com',
  projectId: params.get('projectId') || 'routex-india',
  storageBucket: params.get('storageBucket') || 'routex-india.appspot.com',
  messagingSenderId: params.get('messagingSenderId') || '123456789012',
  appId: params.get('appId') || '1:123456789012:web:abcdef1234567890',
};

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Background notifications handler
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message: ', payload);
    const notificationTitle = payload.notification?.title || 'RouteX Telematics';
    const notificationOptions = {
      body: payload.notification?.body || 'New cargo update received.',
      icon: '/logo.png',
      data: payload.data,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
