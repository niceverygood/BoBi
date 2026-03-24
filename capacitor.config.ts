import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kr.bobi.app',
  appName: 'BoBi',
  webDir: 'out',
  server: {
    url: 'https://bo-bi.vercel.app',
    cleartext: false,
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
