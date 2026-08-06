import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

let messaging: Messaging | null = null;

if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccount) {
        initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
    }
}

if (getApps().length > 0) {
    messaging = getMessaging();
}

export const fcmMessaging = messaging;
