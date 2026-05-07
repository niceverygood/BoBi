// lib/analytics/meta-pixel.ts
// Meta Pixel (Facebook Pixel) 초기화 + 안전 헬퍼
//
// 환경변수:
//   NEXT_PUBLIC_META_PIXEL_ID — Meta Pixel ID (16-자리 숫자, Vercel ENV에서 직접 설정)
//
// 인스타·페북 광고 전환 측정용. 한승수 대표가 Meta Business Suite에서 발급.
//
// 추적 이벤트:
//   - PageView (자동, MetaPixelProvider에서 경로 변경마다)
//   - CompleteRegistration (회원가입 완료)
//   - StartTrial (3일 무료체험 시작)
//   - Purchase (결제 완료)
//
// 보안·프라이버시:
//   - Client-side only (브라우저에서만 발송)
//   - Pixel은 Meta(Facebook)에 데이터 전송 → privacy 페이지 명시 필수
//   - PII는 절대 보내지 않음 (이메일·이름·전화 등은 파라미터에서 제외)
//   - 로컬·미설정 환경에선 no-op (조용히 스킵)

'use client';

// Meta Pixel 표준 이벤트 타입 — Meta가 정의한 표준 이벤트만 사용 (오타 방지)
//
// 표준 이벤트 vs 커스텀 이벤트:
//   - 표준 이벤트: Meta 광고 최적화 알고리즘이 자동 인식 → 광고 효율 ↑
//   - 커스텀 이벤트: track('CustomEvent', ...) — 추적 가능하지만 광고 최적화 약함
//
// 참고: https://developers.facebook.com/docs/meta-pixel/reference#standard-events
export type MetaPixelStandardEvent =
    | 'PageView'
    | 'CompleteRegistration'   // 회원가입 완료
    | 'StartTrial'             // 무료체험 시작
    | 'Subscribe'              // 정기 구독 시작
    | 'Purchase'               // 결제 완료
    | 'Lead'                   // 잠재고객 (미사용)
    | 'AddPaymentInfo'         // 결제수단 입력 (미사용)
    | 'InitiateCheckout'       // 결제 시작 (미사용)
    | 'ViewContent';           // 콘텐츠 조회 (미사용)

export interface MetaPixelEventParams {
    /** 이벤트 식별용 콘텐츠 이름 */
    content_name?: string;
    /** 이벤트 가치 (Purchase·Subscribe 시 결제금액) */
    value?: number;
    /** 통화 (Purchase·Subscribe 시 KRW 등) */
    currency?: string;
    /** 콘텐츠 종류 (예: 'product', 'subscription') */
    content_type?: string;
    /** 콘텐츠 카테고리 */
    content_category?: string;
    /** 추가 커스텀 파라미터 — Meta가 자동 인식하지 못해도 보고서에 노출 */
    [key: string]: string | number | boolean | null | undefined;
}

// fbq 함수 타입 (window.fbq) — Meta Pixel 스크립트가 주입.
// 부트스트랩 시점엔 callMethod·queue·loaded 등 보조 속성을 갖는 함수로 패치되며,
// fbevents.js 로드 후 실제 호출 함수로 교체된다.
type FbqFunction = ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void;
    queue?: unknown[];
    push?: FbqFunction;
    loaded?: boolean;
    version?: string;
};

declare global {
    interface Window {
        fbq?: FbqFunction;
        _fbq?: FbqFunction;
    }
}

let initialized = false;

/**
 * Meta Pixel 스크립트 로드 + 초기화.
 * MetaPixelProvider 에서 마운트 시 1회 호출.
 *
 * 일반적인 fbq 부트스트랩 코드를 동적으로 주입한다 (Meta 공식 권장 패턴).
 * SSR-safe: window 체크 + 1회 초기화 가드.
 */
export function initMetaPixel(): void {
    if (initialized) return;
    if (typeof window === 'undefined') return;

    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    if (!pixelId) {
        // ID 없으면 초기화 스킵 (개발환경 또는 미설정)
        return;
    }

    // Meta 공식 부트스트랩 (https://developers.facebook.com/docs/meta-pixel/get-started)
    // window.fbq가 이미 있으면 스킵
    if (window.fbq) {
        initialized = true;
        return;
    }

    // fbq 함수 셋업 (큐 방식, Meta 공식 부트스트랩 패턴)
    const fbq: FbqFunction = function (this: FbqFunction, ...args: unknown[]) {
        if (fbq.callMethod) {
            fbq.callMethod.apply(fbq, args);
        } else {
            fbq.queue?.push(args);
        }
    } as FbqFunction;

    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;

    // 스크립트 태그 주입
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript?.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
    } else {
        document.head.appendChild(script);
    }

    // Pixel 초기화 (PageView 발송은 MetaPixelProvider의 라우트 변경 감지에 위임 →
    // 첫 마운트 시 1회 + 라우트 변경마다 1회. 여기서 직접 호출하면 중복됨)
    window.fbq?.('init', pixelId);

    initialized = true;
}

/** 초기화 여부 (UI 분기·테스트용) */
export function isMetaPixelEnabled(): boolean {
    return !!process.env.NEXT_PUBLIC_META_PIXEL_ID;
}

/**
 * 이벤트 전송 — Pixel 미설치 환경에선 no-op.
 *
 * 사용 예:
 *   trackMetaPixel('CompleteRegistration', { content_name: 'signup' });
 *   trackMetaPixel('Purchase', { value: 19900, currency: 'KRW' });
 */
export function trackMetaPixel(
    event: MetaPixelStandardEvent,
    params?: MetaPixelEventParams,
): void {
    if (typeof window === 'undefined') return;
    if (!isMetaPixelEnabled()) return;
    if (!window.fbq) return;

    try {
        if (params) {
            window.fbq('track', event, params);
        } else {
            window.fbq('track', event);
        }
    } catch {
        // 조용히 실패 (분석 도구가 앱 작동을 막으면 안 됨)
    }
}

/**
 * PageView 이벤트 — 라우트 변경 시 MetaPixelProvider에서 호출.
 * 분리한 이유: PageView는 라우트마다 호출 → 표준 이벤트와 분리해서 빈도 명확.
 */
export function trackMetaPixelPageView(): void {
    if (typeof window === 'undefined') return;
    if (!isMetaPixelEnabled()) return;
    if (!window.fbq) return;

    try {
        window.fbq('track', 'PageView');
    } catch {
        // ignore
    }
}
