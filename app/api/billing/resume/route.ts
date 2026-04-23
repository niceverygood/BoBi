import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// 해지 예약 취소 API
//
// cancel_at_period_end=true 로 해지 예약된 active 구독을 다시 "자동 갱신" 상태로
// 되돌린다. current_period_end 가 아직 지나지 않은 경우에만 동작.
export async function POST() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const serviceClient = await createServiceClient();
    const nowIso = new Date().toISOString();

    const { data: subList, error: fetchError } = await serviceClient
        .from('subscriptions')
        .select('id, status, current_period_end, cancel_at_period_end')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('cancel_at_period_end', true)
        .order('updated_at', { ascending: false })
        .limit(1);

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const subscription = subList?.[0];
    if (!subscription) {
        return NextResponse.json({ error: '해지 예약된 구독이 없습니다.' }, { status: 404 });
    }

    if (new Date(subscription.current_period_end).getTime() <= Date.now()) {
        return NextResponse.json(
            { error: '이미 구독 기간이 만료되어 해지 취소가 불가능합니다. 다시 구독해주세요.' },
            { status: 409 },
        );
    }

    const { error: updateError } = await serviceClient
        .from('subscriptions')
        .update({
            cancel_at_period_end: false,
            cancelled_at: null,
            cancelled_by: null,
            updated_at: nowIso,
        })
        .eq('id', subscription.id);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        message: '해지 예약이 취소되었습니다. 자동 갱신이 재개됩니다.',
        endsAt: subscription.current_period_end,
    });
}
