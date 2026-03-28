// lib/push.ts - FCM 푸시 알림 클라이언트 초기화

export async function initPushNotifications() {
  try {
    // Dynamic imports to avoid build failures on web
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    const { PushNotifications } = await import('@capacitor/push-notifications');

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
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[FCM] Notification tapped:', action);
      const url = action.notification.data?.url;
      if (url) {
        window.location.href = url;
      }
    });
  } catch {
    // Silently fail on web or when Capacitor plugins aren't available
  }
}

async function saveTokenToServer(token: string) {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { Capacitor } = await import('@capacitor/core');
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
