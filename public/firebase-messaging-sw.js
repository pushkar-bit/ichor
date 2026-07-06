importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBKeC_4lEH4RSLSSCQcR0IeRNGTIT8hf7A",
  authDomain: "ichor-f5690.firebaseapp.com",
  projectId: "ichor-f5690",
  storageBucket: "ichor-f5690.firebasestorage.app",
  messagingSenderId: "945676736472",
  appId: "1:945676736472:web:df9bc5e95cb71e132b04ad",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? "ICHOR", {
    body,
    icon: "/icon.png",
    data: payload.data,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const deepLink = event.notification.data?.deepLink ?? "/feed";
  event.waitUntil(clients.openWindow(deepLink));
});
