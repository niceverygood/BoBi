import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { log } from '@/lib/monitoring/system-log';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const immediate = body.immediate === true; // 즉시 해지 여부

    const serviceClient = await createServiceClient();

    if (immediate) {
        // 즉시 해지 — 구독 취소하고 무료 플랜으로 복귀
        await serviceClient
            .from('subscriptions')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancelled_by: 'user',
            })
            .eq('user_id', user.id)
            .eq('status', 'active');

        // usage_tracking을 무료 플랜 한도(5건)로 리셋
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
            metadata: { by: 'user', immediate: true },
        });

        return NextResponse.json({
            success: true,
            message: '구독이 즉시 해지되었습니다. 무료 플랜으로 전환됩니다.',
        });
    }

    // 기간 만료 후 해지
    const { data: subscription, error } = await serviceClient
        .from('subscriptions')
        .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_by: 'user',
        })
        .eq('user_id', user.id)
        .eq('status', 'active')
        .select()
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!subscription) {
        return NextResponse.json({ error: '활성 구독이 없습니다.' }, { status: 404 });
    }

    // usage_tracking도 무료 한도로 리셋
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
        message: '기간 만료 후 해지',
        metadata: { by: 'user', immediate: false, subscriptionId: subscription.id },
    });

    return NextResponse.json({
        success: true,
        message: '구독이 해지되었습니다. 무료 플랜으로 전환됩니다.',
    });
}
