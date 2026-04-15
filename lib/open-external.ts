import { isNative } from '@/lib/iap/platform';

/**
 * 외부 URL을 열 때 네이티브 앱에서는 인앱 브라우저,
 * 웹에서는 새 탭으로 엽니다.
 */
export async function openExternal(url: string) {
  if (isNative()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
