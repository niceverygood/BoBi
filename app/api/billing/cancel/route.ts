import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const serviceClient = await createServiceClient();

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
