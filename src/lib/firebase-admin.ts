import admin from 'firebase-admin';

if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(serviceAccount)),
        });
    }
}

export const firebaseAdmin = admin;
