// lib/push.ts - FCM 푸시 알림 클라이언트 초기화
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { createClient } from '@/lib/supabase/client';

export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', async ({ value: token }) => {
    console.log('[FCM] Token:', token);
    await saveTokenToServer(token);
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('[FCM] Registration error:', error);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[FCM] Foreground notification:', notification);
    // 포그라운드에서 받은 알림 처리 (필요시 커스텀 UI)
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('[FCM] Notification tapped:', action);
    const url = action.notification.data?.url;
    if (url) {
      window.location.href = url;
    }
  });
}

async function saveTokenToServer(token: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const platform = Capacitor.getPlatform(); // 'ios' | 'android'

  await fetch('/api/push/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: user.id,
      token,
      platform,
    }),
  });
}
