// lib/device.ts
// 기기 식별 및 등록 유틸

/** 브라우저 핑거프린트 기반 기기 ID 생성 */
export function getDeviceId(): string {
    if (typeof window === 'undefined') return 'server';

    // localStorage에 저장된 기기 ID 확인
    const stored = localStorage.getItem('bobi_device_id');
    if (stored) return stored;

    // 새 기기 ID 생성 (브라우저 핑거프린트 기반)
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 0,
    ].join('|');

    // 간단한 해시
    let hash = 0;
    for (let i = 0; i < components.length; i++) {
        const char = components.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const deviceId = `dev_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;

    localStorage.setItem('bobi_device_id', deviceId);
    return deviceId;
}

/** 기기 유형 감지 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    const ua = navigator.userAgent;
    if (/iPad|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
    if (/Mobile|iPhone|Android/i.test(ua)) return 'mobile';
    return 'desktop';
}

/** 기기 이름 생성 */
export function getDeviceName(): string {
    if (typeof window === 'undefined') return 'Server';
    const ua = navigator.userAgent;

    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) {
        const match = ua.match(/Android.*?;\s*([^)]+)/);
        return match ? match[1].split(' Build')[0].trim() : 'Android';
    }
    if (/Mac/i.test(ua)) return 'Mac';
    if (/Windows/i.test(ua)) return 'Windows PC';
    if (/Linux/i.test(ua)) return 'Linux PC';
    return 'Unknown';
}

/** 기기 등록 API 호출 */
export async function registerDevice(): Promise<{ allowed: boolean; message?: string }> {
    try {
        const res = await fetch('/api/auth/device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deviceId: getDeviceId(),
                deviceName: `${getDeviceName()} (${getDeviceType()})`,
                deviceType: getDeviceType(),
            }),
        });
        if (!res.ok) return { allowed: false };
        return await res.json();
    } catch {
        return { allowed: true }; // 에러 시 허용 (서비스 중단 방지)
    }
}
