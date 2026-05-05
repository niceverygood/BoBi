import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { log } from '@/lib/monitoring/system-log';

// 사용자 본인이 자기 구독을 해지한다.
//
// - immediate=true: 즉시 해지. status=cancelled, 분석 한도 무료(5)로 리셋.
//   환불은 별도 처리(관리자 대시보드).
// - immediate=false (기본): 기간 만료 후 해지. cancel_at_period_end=true만
//   세팅하고 status는 active 유지 → 사용자는 current_period_end까지 정상 사용,
//   cron이 만료 시점에 cancelled 처리한다.
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const immediate = body.immediate === true;

    const serviceClient = await createServiceClient();

    if (immediate) {
        const { data: cancelled } = await serviceClient
            .from('subscriptions')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancelled_by: 'user',
                cancel_at_period_end: false,
            })
            .eq('user_id', user.id)
            .in('status', ['active', 'trialing', 'past_due'])
            .select()
            .maybeSingle();

        if (!cancelled) {
            return NextResponse.json({ error: '활성 구독이 없습니다.' }, { status: 404 });
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const periodStart = `${year}-${month}-01`;

        await serviceClient
            .from('usage_tracking')
            .update({ analyses_limit: 5 })
            .eq('user_id', user.id)
            .eq('period_start', periodStart);

        log.info('subscription', 'subscription_cancelled', {
            userId: user.id,
            userEmail: user.email,
            message: '즉시 해지',
            metadata: { by: 'user', immediate: true, subscriptionId: cancelled.id },
        });

        return NextResponse.json({
            success: true,
            immediate: true,
            message: '구독이 즉시 해지되었습니다. 무료 플랜으로 전환됩니다.',
        });
    }

    // 기간 만료 후 해지: 플래그만 세우고 사용자가 만료일까지 그대로 쓰게 둔다.
    // status는 active로 둔 채 cron이 current_period_end 도래 시 cancelled로 전환.
    const { data: updated, error } = await serviceClient
        .from('subscriptions')
        .update({
            cancel_at_period_end: true,
            cancelled_by: 'user',
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .select('id, current_period_end')
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!updated) {
        return NextResponse.json({ error: '활성 구독이 없습니다.' }, { status: 404 });
    }

    log.info('subscription', 'subscription_cancel_at_period_end', {
        userId: user.id,
        userEmail: user.email,
        message: '기간 만료 후 해지 예약',
        metadata: { by: 'user', immediate: false, subscriptionId: updated.id, periodEnd: updated.current_period_end },
    });

    return NextResponse.json({
        success: true,
        immediate: false,
        periodEnd: updated.current_period_end,
        message: `구독이 ${new Date(updated.current_period_end).toLocaleDateString('ko-KR')}에 해지됩니다. 그 전까지는 정상적으로 이용하실 수 있습니다.`,
    });
}

// 해지 예약 취소 (사용자가 마음을 바꿨을 때)
export async function DELETE() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const serviceClient = await createServiceClient();

    const { data: restored, error } = await serviceClient
        .from('subscriptions')
        .update({
            cancel_at_period_end: false,
            cancelled_by: null,
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .eq('cancel_at_period_end', true)
        .select('id')
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!restored) {
        return NextResponse.json({ error: '해지 예약된 구독이 없습니다.' }, { status: 404 });
    }

    log.info('subscription', 'subscription_cancel_undone', {
        userId: user.id,
        userEmail: user.email,
        message: '해지 예약 취소',
        metadata: { by: 'user', subscriptionId: restored.id },
    });

    return NextResponse.json({
        success: true,
        message: '해지 예약이 취소되었습니다. 구독이 유지됩니다.',
    });
}
