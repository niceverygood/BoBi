// lib/firebase-admin.ts - Firebase Admin SDK 초기화 (서버 전용)
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

function getFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  );

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export function getFirebaseMessaging() {
  getFirebaseAdmin();
  return getMessaging();
}
