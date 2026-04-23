import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// 구독 해지 API
//
// 기본 동작: "기간 만료 시 해지" (cancel-at-period-end)
//   - status='active' 구독은 cancel_at_period_end=true 로 플래그만 세움. status 는
//     current_period_end 까지 유지되어 이용자가 남은 기간을 정상 사용 가능.
//   - renew-subscriptions cron 이 만료 시점에 갱신 결제 대신 free 플랜으로 전환.
//   - status='trialing' 구독은 즉시 해지. 체험 100원은 이미 환불된 상태이므로
//     남은 기간을 이어갈 이유가 없음.
//
// escape hatch: body.immediate === true 면 active 구독도 즉시 cancelled 로 전환.
//   (관리자 복구, QA 등 특수 케이스용 — 일반 UI 에서는 사용하지 않음)
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const forceImmediate = body.immediate === true;

    const serviceClient = await createServiceClient();

    // 활성/체험 구독 조회 (최신 1건)
    const { data: subList, error: fetchError } = await serviceClient
        .from('subscriptions')
        .select('id, status, current_period_end, cancel_at_period_end')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .order('updated_at', { ascending: false })
        .limit(1);

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const subscription = subList?.[0];
    if (!subscription) {
        return NextResponse.json({ error: '해지할 구독이 없습니다.' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    // 체험 중이거나 forceImmediate 면 즉시 해지
    if (subscription.status === 'trialing' || forceImmediate) {
        const { error: updateError } = await serviceClient
            .from('subscriptions')
            .update({
                status: 'cancelled',
                cancel_at_period_end: false,
                cancelled_at: nowIso,
                cancelled_by: 'user',
                updated_at: nowIso,
            })
            .eq('id', subscription.id);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // 이번 달 usage_tracking 을 무료 플랜 한도로 리셋
        await resetUsageToFree(serviceClient, user.id);

        return NextResponse.json({
            success: true,
            mode: subscription.status === 'trialing' ? 'trial' : 'immediate',
            message: subscription.status === 'trialing'
                ? '체험이 중단되었습니다. 무료 플랜으로 전환됩니다.'
                : '구독이 즉시 해지되었습니다. 무료 플랜으로 전환됩니다.',
        });
    }

    // 기본 동작: active 구독은 기간 만료 시 해지 예약
    if (subscription.cancel_at_period_end) {
        return NextResponse.json({
            success: true,
            mode: 'at_period_end',
            alreadyScheduled: true,
            endsAt: subscription.current_period_end,
            message: '이미 해지 예약된 구독입니다.',
        });
    }

    const { error: updateError } = await serviceClient
        .from('subscriptions')
        .update({
            cancel_at_period_end: true,
            cancelled_at: nowIso,
            cancelled_by: 'user',
            updated_at: nowIso,
        })
        .eq('id', subscription.id);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        mode: 'at_period_end',
        endsAt: subscription.current_period_end,
        message: '구독이 해지 예약되었습니다. 남은 기간 동안은 계속 이용하실 수 있습니다.',
    });
}

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

async function resetUsageToFree(svc: ServiceClient, userId: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const periodStart = `${year}-${month}-01`;

    await svc
        .from('usage_tracking')
        .update({ analyses_limit: 5 })
        .eq('user_id', userId)
        .eq('period_start', periodStart);
}
