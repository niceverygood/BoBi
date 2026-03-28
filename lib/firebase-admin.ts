// lib/firebase-admin.ts - Firebase Admin SDK 초기화 (서버 전용)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _messaging: any = null;

export async function getFirebaseMessaging() {
  if (_messaging) return _messaging;

  try {
    const { cert, getApps, initializeApp } = await import('firebase-admin/app');
    const { getMessaging } = await import('firebase-admin/messaging');

    if (getApps().length === 0) {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
      );
      initializeApp({
        credential: cert(serviceAccount),
      });
    }

    _messaging = getMessaging();
    return _messaging;
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
    throw new Error('Firebase Admin SDK를 초기화할 수 없습니다.');
  }
}

