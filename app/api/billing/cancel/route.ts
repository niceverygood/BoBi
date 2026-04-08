import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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
        // 즉시 해지 — 구독 삭제하고 무료 플랜으로 복귀
        const { error } = await serviceClient
            .from('subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('status', 'active');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: '구독이 즉시 해지되었습니다. 무료 플랜으로 전환됩니다.',
        });
    }

    // 기간 만료 후 해지 (기존 방식)
    const { data: subscription, error } = await serviceClient
        .from('subscriptions')
        .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
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

    return NextResponse.json({
        success: true,
        message: '구독이 해지되었습니다. 현재 결제 기간이 끝나면 무료 플랜으로 전환됩니다.',
    });
}
