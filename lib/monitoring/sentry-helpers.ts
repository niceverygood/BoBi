// lib/monitoring/sentry-helpers.ts
// Sentry 이벤트에 비즈니스 컨텍스트를 덧붙이기 위한 헬퍼
// 사용 예:
//   import { captureError, setSentryUser } from '@/lib/monitoring/sentry-helpers';
//   captureError(err, { area: 'billing', userId, metadata: { provider } });

import * as Sentry from '@sentry/nextjs';

export interface CaptureContext {
    /** 기능 영역 — billing / analyze / future-me / auth / codef 등 */
    area?: string;
    /** 사용자 식별 (이메일/이름 말고 id만) */
    userId?: string;
    /** 추가 메타데이터 — 민감정보 제외 */
    metadata?: Record<string, unknown>;
    /** 태그 — Sentry 필터링용 */
    tags?: Record<string, string>;
    /** 심각도 */
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

/**
 * 에러 캡처 — 컨텍스트 자동 첨부
 * 일반 console.error 대신 이것을 사용하면 Sentry 대시보드에서 바로 보임.
 */
export function captureError(error: unknown, ctx: CaptureContext = {}): string {
    return Sentry.withScope((scope) => {
        if (ctx.area) scope.setTag('area', ctx.area);
        if (ctx.level) scope.setLevel(ctx.level);
        if (ctx.userId) scope.setUser({ id: ctx.userId });
        if (ctx.tags) {
            for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v);
        }
        if (ctx.metadata) {
            scope.setContext('metadata', ctx.metadata);
        }

        if (error instanceof Error) {
            return Sentry.captureException(error);
        }
        return Sentry.captureMessage(String(error));
    });
}

/** 경고성 이벤트 — 에러는 아니지만 기록하고 싶은 것 (예: 결제 성공률 저하) */
export function captureWarning(message: string, ctx: CaptureContext = {}): string {
    return captureError(message, { ...ctx, level: 'warning' });
}

/** 현재 세션의 사용자 정보 설정 */
export function setSentryUser(user: { id: string; email?: string } | null) {
    if (!user) {
        Sentry.setUser(null);
        return;
    }
    // 이메일은 저장하지 않음 — id 해시만 식별자로
    Sentry.setUser({ id: user.id });
}

/** 브레드크럼(사용자 액션 로그) 추가 */
export function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>) {
    Sentry.addBreadcrumb({
        category,
        message,
        data,
        level: 'info',
    });
}
