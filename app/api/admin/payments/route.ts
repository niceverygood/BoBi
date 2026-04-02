import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    if (!user.email || !(ADMIN_EMAILS as readonly string[]).includes(user.email)) {
        return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    try {
        const serviceClient = await createServiceClient();

        // 결제내역 조회 (최근 100건)
        const { data: payments, error: payError } = await serviceClient
            .from('payment_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (payError) {
            return NextResponse.json({ payments: [], error: payError.message });
        }

        // user_id → email 매핑
        const userIds = [...new Set((payments || []).map(p => p.user_id))];
        const { data: profiles } = await serviceClient
            .from('profiles')
            .select('id, email, name')
            .in('id', userIds);

        const userMap = new Map((profiles || []).map(p => [p.id, { email: p.email, name: p.name }]));

        const enriched = (payments || []).map(p => ({
            ...p,
            user_email: userMap.get(p.user_id)?.email || '-',
            user_name: userMap.get(p.user_id)?.name || '-',
        }));

        // 구독 현황도 포함
        const { data: subscriptions } = await serviceClient
            .from('subscriptions')
            .select('*, plan:subscription_plans(slug, display_name)')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        const enrichedSubs = (subscriptions || []).map(s => ({
            ...s,
            user_email: userMap.get(s.user_id)?.email || '-',
            user_name: userMap.get(s.user_id)?.name || '-',
        }));

        return NextResponse.json({ payments: enriched, subscriptions: enrichedSubs });
    } catch (error) {
        return NextResponse.json({ payments: [], error: (error as Error).message });
    }
}
