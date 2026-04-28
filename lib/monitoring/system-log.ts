// lib/monitoring/system-log.ts
// 관리자 로그 뷰어용 이벤트 기록 헬퍼.
// Sentry(에러 전용)와 별도로 결제·구독·웹훅 등 주요 이벤트를 DB에 적재한다.
// - 실패해도 호출자 로직을 깨뜨리지 않도록 예외를 내부에서 삼킨다.
// - 서비스 롤 클라이언트로만 write (RLS 우회 필요).

import type { SupabaseClient } from '@supabase/supabase-js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogArea =
    | 'billing'
    | 'iap'
    | 'kakaopay'
    | 'tosspayments'
    | 'inicis'
    | 'webhook'
    | 'auth'
    | 'subscription'
    | 'coupon'
    | 'admin';

export interface LogEntry {
    level?: LogLevel;
    area: LogArea;
    event: string;
    userId?: string | null;
    userEmail?: string | null;
    message?: string;
    metadata?: Record<string, unknown>;
}

async function getServiceClient(): Promise<SupabaseClient | null> {
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return null;
        const { createClient } = await import('@supabase/supabase-js');
        return createClient(url, key);
    } catch {
        return null;
    }
}

/**
 * 시스템 로그 기록. Fire-and-forget 패턴 권장 — await 해도 되고 안 해도 된다.
 * 실패는 silent (관리자 로그 누락이 결제 흐름을 끊으면 안 됨).
 */
export async function logEvent(entry: LogEntry): Promise<void> {
    try {
        const svc = await getServiceClient();
        if (!svc) return;

        await svc.from('system_logs').insert({
            level: entry.level || 'info',
            area: entry.area,
            event: entry.event,
            user_id: entry.userId ?? null,
            user_email: entry.userEmail ?? null,
            message: entry.message ?? null,
            metadata: entry.metadata ?? null,
        });
    } catch {
        // silent — 로그 쓰기 실패가 서비스 흐름을 깨뜨리지 않도록
    }
}

/** 편의 래퍼 */
export const log = {
    info: (area: LogArea, event: string, rest?: Omit<LogEntry, 'area' | 'event' | 'level'>) =>
        logEvent({ ...rest, area, event, level: 'info' }),
    warn: (area: LogArea, event: string, rest?: Omit<LogEntry, 'area' | 'event' | 'level'>) =>
        logEvent({ ...rest, area, event, level: 'warn' }),
    error: (area: LogArea, event: string, rest?: Omit<LogEntry, 'area' | 'event' | 'level'>) =>
        logEvent({ ...rest, area, event, level: 'error' }),
};
