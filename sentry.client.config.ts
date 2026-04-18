// sentry.client.config.ts
// 브라우저 런타임 Sentry 초기화 (App Router + Capacitor 앱 공용)

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
        release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7),

        // 에러 샘플링
        sampleRate: 1.0,

        // 세션 리플레이 — 에러 발생 시 직전 30초만 캡처 (용량 절약)
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0.1,

        // 트랜잭션 샘플링
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        // 세션 리플레이 통합 (설치 옵션)
        integrations: [
            Sentry.replayIntegration({
                maskAllText: false,       // 한글 UI 가독성 위해 유지
                maskAllInputs: true,      // 입력값은 마스킹 (카드/주민번호/이메일 등)
                blockAllMedia: true,      // 이미지/비디오 차단
            }),
        ],

        ignoreErrors: [
            // 브라우저 확장프로그램 노이즈
            'Non-Error promise rejection captured',
            'ResizeObserver loop limit exceeded',
            'ResizeObserver loop completed with undelivered notifications',
            // 네트워크 일시 끊김
            'Network request failed',
            'Load failed',
            'Failed to fetch',
            // Next.js 라우팅
            'NEXT_REDIRECT',
            'NEXT_NOT_FOUND',
            // 사용자 결제 취소는 에러 아님
            'USER_CANCEL',
            '결제가 취소되었습니다',
            '빌링키 발급이 취소되었습니다',
        ],

        denyUrls: [
            // 브라우저 확장프로그램
            /chrome-extension:/,
            /safari-extension:/,
            /moz-extension:/,
            // 외부 분석 스크립트 에러 무시
            /googletagmanager\.com/,
            /google-analytics\.com/,
        ],

        beforeSend(event, hint) {
            // URL 쿼리에서 민감 파라미터 제거
            if (event.request?.url) {
                event.request.url = scrubUrl(event.request.url);
            }
            // 사용자 IP는 서버에서 결정하도록 — 브라우저에서 굳이 전달 안 함
            if (event.user) {
                delete event.user.ip_address;
                delete event.user.email;  // 이메일 개별 필드로는 안 보냄
            }
            // 에러 메시지 마스킹
            if (event.message) event.message = scrubSensitive(event.message);
            if (hint?.originalException instanceof Error) {
                const e = hint.originalException;
                if (e.message) e.message = scrubSensitive(e.message);
            }
            if (event.exception?.values) {
                for (const ex of event.exception.values) {
                    if (ex.value) ex.value = scrubSensitive(ex.value);
                }
            }
            // Breadcrumb(네트워크 요청 로그)에서도 URL 마스킹
            if (event.breadcrumbs) {
                for (const bc of event.breadcrumbs) {
                    if (bc.data?.url && typeof bc.data.url === 'string') {
                        bc.data.url = scrubUrl(bc.data.url);
                    }
                }
            }
            return event;
        },
    });
}

function scrubUrl(url: string): string {
    try {
        const u = new URL(url, window.location.origin);
        const sensitiveKeys = [
            'token', 'authKey', 'billingKey', 'billing_key', 'customerKey',
            'authToken', 'api_key', 'apikey', 'secret', 'signkey', 'signKey',
            'pg_token', 'sid', 'tid', 'paymentId', 'payment_id',
            'accessToken', 'refresh_token',
        ];
        for (const key of sensitiveKeys) {
            if (u.searchParams.has(key)) u.searchParams.set(key, '[Filtered]');
        }
        return u.toString();
    } catch {
        return url;
    }
}

function scrubSensitive(text: string): string {
    return text
        .replace(/\b\d{6}-?[1-4]\d{6}\b/g, '[Filtered-RRN]')
        .replace(/\b(?:\d[ -]?){12,19}\b/g, '[Filtered-Card]')
        .replace(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '***@$2')
        .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [Filtered]')
        .replace(/\b[A-Za-z0-9+/=_-]{32,}\b/g, (m) => {
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m)) return m;
            return '[Filtered-Token]';
        });
}
