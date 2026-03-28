import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kr.bobi.app',
  appName: 'BoBi',
  webDir: 'out',
  android: {
    // 웹뷰 내부에서 https로 로드 (외부 브라우저로 열리지 않게)
    allowMixedContent: false,
  },
  server: {
    url: 'https://www.bobi.co.kr',
    cleartext: false,
    // 외부 도메인 탐색을 앱 내부 웹뷰에서 처리 (브라우저로 열지 않음)
    allowNavigation: [
      'www.bobi.co.kr',
      'bobi.co.kr',
      'bo-bi.vercel.app',
      '*.supabase.co',
    ],
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
