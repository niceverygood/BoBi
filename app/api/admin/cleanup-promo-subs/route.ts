// app/api/admin/cleanup-promo-subs/route.ts
// 프로모 코드로 결제 없이 생성된 부적절한 구독을 일괄 정리하는 관리자 API
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

// GET: 프로모코드로 생성된 구독 목록 조회
export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    if (!user.email || !(ADMIN_EMAILS as readonly string[]).includes(user.email)) {
        return NextResponse.json({ error: '총괄 관리자만 접근 가능합니다.' }, { status: 403 });
    }

    const serviceClient = await createServiceClient();

    // promo_code 또는 discount_code로 생성된 active 구독 조회
    const { data: promoSubs, error } = await serviceClient
        .from('subscriptions')
        .select(`
            id,
            user_id,
            status,
            payment_provider,
            payment_key,
            current_period_start,
            current_period_end,
            created_at,
            plan:subscription_plans(slug, display_name)
        `)
        .in('payment_provider', ['promo_code', 'discount_code'])
        .eq('status', 'active')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 각 구독의 유저 이메일 가져오기
    const userIds = [...new Set((promoSubs || []).map(s => s.user_id))];
    const { data: usersData } = await serviceClient.auth.admin.listUsers({ perPage: 500 });

    const userEmailMap = new Map<string, string>();
    for (const u of usersData?.users || []) {
        userEmailMap.set(u.id, u.email || '');
    }

    const result = (promoSubs || []).map(s => ({
        id: s.id,
        user_id: s.user_id,
        email: userEmailMap.get(s.user_id) || '(unknown)',
        plan: (s.plan as any)?.display_name || '(unknown)',
        plan_slug: (s.plan as any)?.slug || '(unknown)',
        payment_provider: s.payment_provider,
        promo_code: s.payment_key,
        created_at: s.created_at,
        period_end: s.current_period_end,
    }));

    return NextResponse.json({
        count: result.length,
        subscriptions: result,
    });
}

// POST: 프로모코드로 생성된 구독 일괄 취소
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    if (!user.email || !(ADMIN_EMAILS as readonly string[]).includes(user.email)) {
        return NextResponse.json({ error: '총괄 관리자만 접근 가능합니다.' }, { status: 403 });
    }

    const { excludeEmails = [] } = await request.json().catch(() => ({ excludeEmails: [] }));
    
    const serviceClient = await createServiceClient();
    const now = new Date().toISOString();

    // 제외할 유저 ID 조회
    const excludeUserIds = new Set<string>();
    if (excludeEmails.length > 0) {
        const { data: usersData } = await serviceClient.auth.admin.listUsers({ perPage: 500 });
        for (const u of usersData?.users || []) {
            if (u.email && excludeEmails.includes(u.email)) {
                excludeUserIds.add(u.id);
            }
        }
    }

    // promo_code 또는 discount_code로 생성된 active 구독 조회
    const { data: promoSubs } = await serviceClient
        .from('subscriptions')
        .select('id, user_id, payment_key')
        .in('payment_provider', ['promo_code', 'discount_code'])
        .eq('status', 'active');

    if (!promoSubs || promoSubs.length === 0) {
        return NextResponse.json({ message: '정리할 프로모 구독이 없습니다.', cancelled: 0 });
    }

    // 제외 유저를 필터링
    const toCancel = promoSubs.filter(s => !excludeUserIds.has(s.user_id));

    if (toCancel.length === 0) {
        return NextResponse.json({ message: '모든 프로모 구독이 제외 목록에 포함되어 있습니다.', cancelled: 0 });
    }

    // 일괄 취소
    const cancelIds = toCancel.map(s => s.id);
    const { error: cancelError } = await serviceClient
        .from('subscriptions')
        .update({ status: 'cancelled', cancelled_at: now, updated_at: now })
        .in('id', cancelIds);

    if (cancelError) {
        return NextResponse.json({ error: cancelError.message }, { status: 500 });
    }

    // 해당 유저들의 usage_tracking을 무료 기준(5)으로 리셋
    const cancelledUserIds = [...new Set(toCancel.map(s => s.user_id))];
    const currentMonth = new Date();
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const periodStart = `${year}-${month}-01`;

    for (const userId of cancelledUserIds) {
        // 해당 유저에게 다른 active 구독이 있는지 확인
        const { data: otherActiveSub } = await serviceClient
            .from('subscriptions')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'active')
            .not('payment_provider', 'in', '("promo_code","discount_code")')
            .maybeSingle();

        // 다른 유효 구독이 없으면 무료로 리셋
        if (!otherActiveSub) {
            await serviceClient
                .from('usage_tracking')
                .update({ analyses_limit: 5, updated_at: now })
                .eq('user_id', userId)
                .eq('period_start', periodStart);
        }
    }

    return NextResponse.json({
        success: true,
        message: `${toCancel.length}건의 프로모 코드 구독이 취소되었습니다.`,
        cancelled: toCancel.length,
        cancelledDetails: toCancel.map(s => ({
            id: s.id,
            user_id: s.user_id,
            promo_code: s.payment_key,
        })),
    });
}
