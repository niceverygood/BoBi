// lib/analytics/fb-pixel.ts
//
// Meta Pixel 클라이언트 사이드 이벤트 트래킹.
//
// 핵심 원칙:
//   1. NEXT_PUBLIC_FB_PIXEL_ID 환경변수가 없으면 모든 함수가 no-op.
//   2. 클라이언트 픽셀(브라우저)과 서버 CAPI 둘 다 같은 event_id로 호출하면
//      Meta가 dedup 처리 → 이중 카운트 방지.
//   3. 개인정보(이메일·전화번호)는 서버 CAPI에서만 SHA256 해시로 전달.
//      클라이언트는 식별 정보 안 보냄.
//
// 표준 이벤트 (Meta 권장):
//   PageView              — 자동 (MetaPixel 컴포넌트)
//   CompleteRegistration  — 회원가입 완료
//   StartTrial            — 무료 체험 시작 (billing-key 발급)
//   Subscribe             — 정기결제 성공
//   Lead                  — 1차 관심 (진료조회·분석·상담메모 시작)
//   Purchase              — 1회성 결제 (현재 보비 미사용)

declare global {
    interface Window {
        fbq?: (...args: unknown[]) => void;
        _fbq?: unknown;
    }
}

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || '';

export type FbStandardEvent =
    | 'PageView'
    | 'CompleteRegistration'
    | 'StartTrial'
    | 'Subscribe'
    | 'Lead'
    | 'Purchase'
    | 'InitiateCheckout'
    | 'AddPaymentInfo'
    | 'ViewContent';

interface TrackOptions {
    /** Meta에서 중복 제거(dedup)에 사용. CAPI 서버 호출과 같은 값을 보내야 함. */
    eventId?: string;
    /** 결제 이벤트의 거래 금액 (원) */
    value?: number;
    /** 통화 — 기본 KRW */
    currency?: string;
    /** 자유 속성 (예: plan_slug, billing_cycle) */
    [k: string]: unknown;
}

/**
 * 클라이언트 사이드 픽셀 이벤트 발행.
 * fbq 로드 안 됐으면 silent skip.
 */
export function trackPixel(event: FbStandardEvent, options: TrackOptions = {}): void {
    if (typeof window === 'undefined' || !window.fbq) return;
    if (!FB_PIXEL_ID) return;
    const { eventId, value, currency = 'KRW', ...rest } = options;
    const params: Record<string, unknown> = { ...rest };
    if (value !== undefined) {
        params.value = value;
        params.currency = currency;
    }
    try {
        if (eventId) {
            window.fbq('track', event, params, { eventID: eventId });
        } else {
            window.fbq('track', event, params);
        }
    } catch (err) {
        console.warn('[fb-pixel] track 실패:', (err as Error).message);
    }
}

/**
 * 클라이언트 + 서버(CAPI) 동시 이벤트 발행.
 * CAPI는 /api/fb-capi 프록시로 보냄 — Vercel 서버에서 Meta Conversions API 호출.
 * 같은 eventId를 양쪽에 보내야 Meta가 dedup.
 *
 * 호출 예:
 *   await trackConversion('Subscribe', {
 *       eventId: 'sub-' + subscriptionId,
 *       value: 5400, currency: 'KRW',
 *       email, phoneNo, userId,
 *   });
 */
export async function trackConversion(
    event: FbStandardEvent,
    options: TrackOptions & {
        /** 서버 CAPI 전용 — SHA256 해시 후 전달 */
        email?: string;
        phoneNo?: string;
        userId?: string;
    } = {},
): Promise<void> {
    const eventId = options.eventId || `${event.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 1) 클라이언트 픽셀 (식별정보 제외)
    const { email, phoneNo, userId, ...clientParams } = options;
    void email; void phoneNo; void userId;  // 클라이언트에는 안 보냄
    trackPixel(event, { ...clientParams, eventId });

    // 2) 서버 CAPI (식별정보 포함, 해시는 서버에서)
    try {
        await fetch('/api/fb-capi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event,
                eventId,
                value: options.value,
                currency: options.currency,
                email: options.email,
                phoneNo: options.phoneNo,
                userId: options.userId,
                customData: { ...clientParams, eventId: undefined },
                eventSourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
            }),
            // 페이지 이동 중에도 발사되도록 keepalive
            keepalive: true,
        });
    } catch (err) {
        // CAPI 실패해도 클라이언트 픽셀은 이미 발사됨 — 사용자 흐름 막지 않음
        console.warn('[fb-capi] 호출 실패:', (err as Error).message);
    }
}
