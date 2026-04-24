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

// payment_method 값을 provider 버킷으로 정규화.
// 여러 코드 경로에서 들어오는 표기를 관리자 대시보드용으로 통일한다.
function normalizeProvider(p: Record<string, any>): string {
    const raw = String(p.payment_method || p.provider || '').toLowerCase();
    if (raw.includes('apple') || raw === 'ios' || raw === 'app_store') return 'apple_iap';
    if (raw.includes('google') || raw === 'android' || raw === 'play_store') return 'google_play';
    if (raw.includes('kakao')) return 'kakaopay';
    if (raw.includes('toss')) return 'tosspayments';
    if (raw.includes('inicis')) return 'inicis';
    if (!raw || raw === 'card') return 'card';
    return raw;
}

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    if (!user.email || !(ADMIN_EMAILS as readonly string[]).includes(user.email)) {
        return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const providerFilter = url.searchParams.get('provider'); // apple_iap | google_play | kakaopay | tosspayments | inicis | card
    const statusFilter = url.searchParams.get('status');     // paid | cancelled | refunded

    try {
        const serviceClient = await createServiceClient();

        // 1. payments + payment_history UNION — KakaoPay 구 레코드처럼 payments에 없는 것도 병합
        const [{ data: paymentsData }, { data: historyData }] = await Promise.all([
            serviceClient
                .from('payments')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500),
            serviceClient
                .from('payment_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500),
        ]);

        // payment_id 기준 중복 제거 (payments 테이블 우선)
        const merged = new Map<string, Record<string, any>>();
        for (const p of paymentsData || []) {
            const key = String(p.payment_id || p.portone_payment_id || p.id);
            merged.set(key, { ...p, _source: 'payments' });
        }
        for (const h of historyData || []) {
            const key = String(h.payment_id || h.id);
            if (!merged.has(key)) {
                merged.set(key, { ...h, _source: 'payment_history' });
            }
        }

        let allPayments = [...merged.values()].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        // 2. 모든 구독 이력 (active + cancelled) — IAP 구독도 여기에서 provider 확인 가능
        const { data: subscriptions } = await serviceClient
            .from('subscriptions')
            .select('*, plan:subscription_plans(slug, display_name)')
            .order('created_at', { ascending: false })
            .limit(200);

        // 3. user_id → email/name 매핑
        const allUserIds = new Set<string>();
        allPayments.forEach(p => { if (p.user_id) allUserIds.add(p.user_id); });
        (subscriptions || []).forEach(s => { if (s.user_id) allUserIds.add(s.user_id); });

        const userIds = [...allUserIds];
        let userMap = new Map<string, { email: string; name: string }>();

        if (userIds.length > 0) {
            const { data: profiles } = await serviceClient
                .from('profiles')
                .select('id, email, name')
                .in('id', userIds);

            if (profiles) {
                userMap = new Map(profiles.map(p => [p.id, { email: p.email || '-', name: p.name || '-' }]));
            }

            const missingIds = userIds.filter(id => !userMap.has(id));
            if (missingIds.length > 0) {
                const { data: authData } = await serviceClient.auth.admin.listUsers({ perPage: 200 });
                if (authData?.users) {
                    for (const u of authData.users) {
                        if (missingIds.includes(u.id)) {
                            const name = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || '-';
                            userMap.set(u.id, { email: u.email || '-', name });
                        }
                    }
                }
            }
        }

        // payments에 method가 비어있으면 같은 user의 subscription.payment_provider에서 유추
        const subProviderByUser = new Map<string, string>();
        for (const s of subscriptions || []) {
            if (s.payment_provider && !subProviderByUser.has(s.user_id)) {
                subProviderByUser.set(s.user_id, s.payment_provider);
            }
        }

        let enrichedPayments = allPayments.map(p => {
            const inferred = p.payment_method || subProviderByUser.get(p.user_id) || 'card';
            return {
                ...p,
                payment_method: inferred,
                provider: normalizeProvider({ payment_method: inferred }),
                user_email: userMap.get(p.user_id)?.email || '-',
                user_name: userMap.get(p.user_id)?.name || '-',
            };
        });

        // 필터 적용
        if (providerFilter && providerFilter !== 'all') {
            enrichedPayments = enrichedPayments.filter(p => p.provider === providerFilter);
        }
        if (statusFilter && statusFilter !== 'all') {
            enrichedPayments = enrichedPayments.filter(p => p.status === statusFilter);
        }

        const enrichedSubs = (subscriptions || []).map(s => ({
            ...s,
            user_email: userMap.get(s.user_id)?.email || '-',
            user_name: userMap.get(s.user_id)?.name || '-',
        }));

        // 4. provider별 집계 (필터 적용 전 전체 기준)
        const allEnrichedForSummary = allPayments.map(p => ({
            ...p,
            payment_method: p.payment_method || subProviderByUser.get(p.user_id) || 'card',
            provider: normalizeProvider({ payment_method: p.payment_method || subProviderByUser.get(p.user_id) || 'card' }),
        }));

        const summary: Record<string, { count: number; paidCount: number; paidAmount: number; refundedAmount: number }> = {};
        for (const p of allEnrichedForSummary) {
            const key = p.provider;
            if (!summary[key]) summary[key] = { count: 0, paidCount: 0, paidAmount: 0, refundedAmount: 0 };
            summary[key].count++;
            const amount = Number(p.amount) || 0;
            if (p.status === 'paid' || p.status === 'success') {
                summary[key].paidCount++;
                summary[key].paidAmount += amount;
            } else if (p.status === 'refunded' || p.status === 'cancelled') {
                summary[key].refundedAmount += amount;
            }
        }

        return NextResponse.json({
            payments: enrichedPayments,
            subscriptions: enrichedSubs,
            summary,
            total: allPayments.length,
            filtered: enrichedPayments.length,
        });
    } catch (error) {
        return NextResponse.json({ payments: [], subscriptions: [], summary: {}, error: (error as Error).message });
    }
}
