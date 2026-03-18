// 플랫폼 감지 유틸리티
export type AppPlatform = 'ios' | 'android' | 'web';

export function getPlatform(): AppPlatform {
  if (typeof window === 'undefined') return 'web';

  try {
    // Capacitor가 로드된 경우
    const capacitor = (window as any).Capacitor;
    if (capacitor?.isNativePlatform?.()) {
      const platform = capacitor.getPlatform?.();
      if (platform === 'ios') return 'ios';
      if (platform === 'android') return 'android';
    }
  } catch {
    // Capacitor 미설치 or 웹 환경
  }

  return 'web';
}

export function isNative(): boolean {
  return getPlatform() !== 'web';
}
