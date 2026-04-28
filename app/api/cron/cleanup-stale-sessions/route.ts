// app/api/cron/cleanup-stale-sessions/route.ts
// 카카오페이 ready 후 approve가 완료되지 않은 고아 세션 정리.
// approve 성공 시 kakaopay/approve가 세션을 삭제 (line 323) — 1시간 이상 남은 세션은 모두 미완료.
// 운영자가 사후 추적할 수 있도록 system_logs에 기록 후 삭제.

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { log } from '@/lib/monitoring/system-log';

export const dynamic = 'force-dynamic';

const STALE_AFTER_MINUTES = 60;

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = await createServiceClient();
    const cutoff = new Date(Date.now() - STALE_AFTER_MINUTES * 60 * 1000).toISOString();

    const { data: stale, error: fetchErr } = await svc
        .from('kakaopay_sessions')
        .select('id, user_id, tid, partner_order_id, plan_slug, billing_cycle, amount, intent, created_at')
        .lt('created_at', cutoff);

    if (fetchErr) {
        return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!stale || stale.length === 0) {
        return NextResponse.json({ message: '정리 대상 없음', cleaned: 0 });
    }

    for (const row of stale) {
        await log.warn('kakaopay', 'stale_session_cleaned', {
            userId: row.user_id,
            message: `approve가 ${STALE_AFTER_MINUTES}분 내 완료되지 않은 ready 세션`,
            metadata: {
                sessionId: row.id,
                tid: row.tid,
                partnerOrderId: row.partner_order_id,
                planSlug: row.plan_slug,
                billingCycle: row.billing_cycle,
                amount: row.amount,
                intent: row.intent,
                createdAt: row.created_at,
                hint: '카카오페이 PG 어드민에서 TID로 SID 발급/결제 여부 확인 후 admin/recover-payment로 복구',
            },
        });
    }

    const ids = stale.map(r => r.id);
    const { error: delErr } = await svc
        .from('kakaopay_sessions')
        .delete()
        .in('id', ids);

    if (delErr) {
        return NextResponse.json({ error: delErr.message, fetched: stale.length, deleted: 0 }, { status: 500 });
    }

    return NextResponse.json({
        message: `고아 세션 ${stale.length}건 정리`,
        cleaned: stale.length,
        cutoff,
    });
}
