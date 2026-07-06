"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function getFirebaseApp() {
  if (!firebaseConfig.apiKey) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let messagingInstance: Messaging | null = null;

async function getMessagingInstance(): Promise<Messaging | null> {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!(await isSupported().catch(() => false))) return null;
  if (!messagingInstance) messagingInstance = getMessaging(app);
  return messagingInstance;
}

/** Requests notification permission and returns an FCM registration token, or null if unavailable. */
export async function requestPushToken(): Promise<string | null> {
  try {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const messaging = await getMessagingInstance();
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!messaging || !vapidKey) return null;

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    return await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  } catch (err) {
    console.error("[firebase] requestPushToken failed:", (err as Error).message);
    return null;
  }
}

export async function onForegroundMessage(callback: (payload: unknown) => void) {
  const messaging = await getMessagingInstance();
  if (!messaging) return;
  onMessage(messaging, callback);
}
