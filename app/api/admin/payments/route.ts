import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

// 관리자: 유저 구독 강제 취소 → 무료 플랜 복귀
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    if (!user.email || !(ADMIN_EMAILS as readonly string[]).includes(user.email)) {
        return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { targetUserId, targetEmail } = await request.json();

    if (!targetUserId && !targetEmail) {
        return NextResponse.json({ error: 'targetUserId 또는 targetEmail이 필요합니다.' }, { status: 400 });
    }

    try {
        const serviceClient = await createServiceClient();
        let userId = targetUserId;

        // email로 user_id 찾기
        if (!userId && targetEmail) {
            const { data: usersData } = await serviceClient.auth.admin.listUsers({ perPage: 100 });
            const found = usersData?.users?.find(u => u.email === targetEmail);
            if (found) userId = found.id;
        }

        if (!userId) {
            return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
        }

        // 모든 active 구독 취소
        const { data: activeSubs } = await serviceClient
            .from('subscriptions')
            .select('id, plan_id')
            .eq('user_id', userId)
            .eq('status', 'active');

        if (!activeSubs || activeSubs.length === 0) {
            return NextResponse.json({ error: '활성 구독이 없습니다.' }, { status: 404 });
        }

        for (const sub of activeSubs) {
            await serviceClient.from('subscriptions').update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancelled_by: 'admin',
            }).eq('id', sub.id);
        }

        // usage_tracking 무료 한도(5건)로 리셋
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const periodStart = `${year}-${month}-01`;

        await serviceClient
            .from('usage_tracking')
            .update({ analyses_limit: 5 })
            .eq('user_id', userId)
            .eq('period_start', periodStart);

        // payments 테이블 취소 표시
        try {
            await serviceClient
                .from('payments')
                .update({
                    status: 'cancelled',
                    cancelled_by: 'admin',
                    cancelled_at: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .eq('status', 'paid');
        } catch { /* ignore if columns don't exist */ }

        return NextResponse.json({
            success: true,
            message: `${activeSubs.length}개 구독이 취소되었습니다. 무료 플랜으로 전환됨.`,
            cancelledCount: activeSubs.length,
        });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

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
