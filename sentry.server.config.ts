// sentry.server.config.ts
// 서버(Node.js) 런타임 Sentry 초기화

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),

        // 에러 샘플링 — 모든 에러 기록
        sampleRate: 1.0,

        // 트랜잭션 샘플링 — 운영은 10%로 제한 (비용 절감)
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        // 무시할 에러 패턴
        ignoreErrors: [
            // Supabase 세션 만료는 에러 아님
            'JWT expired',
            'invalid JWT',
            // AbortController 취소
            'AbortError',
            'The operation was aborted',
            // Next.js redirect는 에러가 아니라 제어 흐름
            'NEXT_REDIRECT',
            'NEXT_NOT_FOUND',
        ],

        // ──────────────────────────────────────────────
        // 민감정보 마스킹 (PII 스크러빙)
        // ──────────────────────────────────────────────
        beforeSend(event, hint) {
            // URL에서 토큰/키 제거
            if (event.request?.url) {
                event.request.url = scrubUrl(event.request.url);
            }
            // 쿠키 제거
            if (event.request?.cookies) {
                delete event.request.cookies;
            }
            // Authorization 헤더 마스킹
            if (event.request?.headers) {
                const h = event.request.headers as Record<string, string>;
                if (h.authorization) h.authorization = '[Filtered]';
                if (h.cookie) h.cookie = '[Filtered]';
            }

            // 에러 메시지에서 카드번호/주민번호/키 패턴 마스킹
            if (event.message) event.message = scrubSensitive(event.message);
            if (hint?.originalException instanceof Error) {
                const e = hint.originalException;
                if (e.message) e.message = scrubSensitive(e.message);
            }

            // 개별 에러 프레임 변수값도 마스킹
            if (event.exception?.values) {
                for (const ex of event.exception.values) {
                    if (ex.value) ex.value = scrubSensitive(ex.value);
                }
            }
            return event;
        },

        // 파생 이벤트(transaction)에서도 URL 마스킹
        beforeSendTransaction(event) {
            if (event.request?.url) {
                event.request.url = scrubUrl(event.request.url);
            }
            return event;
        },
    });
}

// URL에서 민감 쿼리 파라미터 제거
function scrubUrl(url: string): string {
    try {
        const u = new URL(url, 'http://localhost');
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

// 에러 메시지/스택의 민감 정보 마스킹
function scrubSensitive(text: string): string {
    return text
        // 주민등록번호 (6자리-7자리)
        .replace(/\b\d{6}-?[1-4]\d{6}\b/g, '[Filtered-RRN]')
        // 카드번호 (12~19자리 연속 숫자)
        .replace(/\b(?:\d[ -]?){12,19}\b/g, '[Filtered-Card]')
        // 휴대폰 번호 (선택적 마스킹 — PII지만 에러 디버깅에 유용할 수도)
        // .replace(/\b01[0-9]-?\d{3,4}-?\d{4}\b/g, '[Filtered-Phone]')
        // 이메일 (local part 마스킹)
        .replace(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '***@$2')
        // Bearer 토큰
        .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [Filtered]')
        // 일반 API 키 패턴 (32자 이상 hex/base64)
        .replace(/\b[A-Za-z0-9+/=_-]{32,}\b/g, (m) => {
            // UUID는 유지 (로그 추적에 필요)
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m)) return m;
            return '[Filtered-Token]';
        });
}
