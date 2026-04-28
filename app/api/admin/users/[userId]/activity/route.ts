// app/api/admin/users/[userId]/activity/route.ts
//
// 특정 유저의 활동·퍼널 단계 조회 (관리자 전용).
// 분석/업로드/결제/구독/로그를 한 번에 묶어서 반환.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

type FunnelStage =
    | 'signed_up'
    | 'uploaded'
    | 'analyzed'
    | 'limit_reached'
    | 'viewed_subscribe'
    | 'trial_started'
    | 'subscribed'
    | 'churned';

function deriveFunnelStage(input: {
    analysisCount: number;
    uploadCount: number;
    activeSubPlanSlug: string | null;
    activeSubStatus: string | null;
    cancelledSubAt: string | null;
    usageUsed: number;
    usageLimit: number;
}): FunnelStage {
    const {
        analysisCount,
        uploadCount,
        activeSubPlanSlug,
        activeSubStatus,
        cancelledSubAt,
        usageUsed,
        usageLimit,
    } = input;

    if (activeSubStatus === 'active' && activeSubPlanSlug && activeSubPlanSlug !== 'free') {
        return 'subscribed';
    }
    if (activeSubStatus === 'trialing') {
        return 'trial_started';
    }
    if (cancelledSubAt) {
        return 'churned';
    }
    if (usageLimit > 0 && usageUsed >= usageLimit) {
        return 'limit_reached';
    }
    if (analysisCount > 0) {
        return 'analyzed';
    }
    if (uploadCount > 0) {
        return 'uploaded';
    }
    return 'signed_up';
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ userId: string }> },
) {
    const { userId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // Admin or Sub-Admin check
    let hasAccess = false;
    if (user.email && (ADMIN_EMAILS as readonly string[]).includes(user.email)) {
        hasAccess = true;
    } else {
        const { data: subAdmin } = await supabase
            .from('sub_admins')
            .select('id')
            .eq('email', user.email)
            .eq('active', true)
            .maybeSingle();
        if (subAdmin) hasAccess = true;
    }

    if (!hasAccess) {
        return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    try {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey || serviceKey === 'your_service_role_key') {
            return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' }, { status: 500 });
        }

        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey,
        );

        // 1. 유저 프로필
        const { data: targetAuth } = await adminSupabase.auth.admin.getUserById(userId);
        const targetUser = targetAuth?.user;
        if (!targetUser) {
            return NextResponse.json({ error: '유저를 찾을 수 없습니다.' }, { status: 404 });
        }

        // 2. 구독 — active + 가장 최근 cancelled
        const { data: subs } = await adminSupabase
            .from('subscriptions')
            .select('id, status, plan_id, payment_method, payment_provider, started_at, current_period_end, cancelled_at, plan:subscription_plans(slug, display_name)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const activeSub = (subs || []).find((s: any) => s.status === 'active' || s.status === 'trialing');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lastCancelledSub = (subs || []).find((s: any) => s.cancelled_at);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const activePlan = activeSub?.plan as any;

        // 3. 분석 카운트 + 최근 10건
        const [{ count: analysisCount }, { data: recentAnalyses }] = await Promise.all([
            adminSupabase
                .from('analyses')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId),
            adminSupabase
                .from('analyses')
                .select('id, status, created_at, overall_summary, has_medical_history, has_product_eligibility, has_claim_assessment, has_risk_report')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10),
        ]);

        // 4. 업로드 카운트
        const { count: uploadCount } = await adminSupabase
            .from('uploads')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);

        // 5. 결제 — 최근 10건
        let recentPayments: Record<string, unknown>[] = [];
        let paymentCount = 0;
        try {
            const [{ count }, { data: rows }] = await Promise.all([
                adminSupabase
                    .from('payments')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId),
                adminSupabase
                    .from('payments')
                    .select('id, amount, status, payment_method, created_at, cancelled_at')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(10),
            ]);
            paymentCount = count ?? 0;
            recentPayments = (rows || []) as Record<string, unknown>[];
        } catch { /* table may not exist */ }

        // 6. 이번 달 사용량
        const now = new Date();
        const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const { data: usageRow } = await adminSupabase
            .from('usage_tracking')
            .select('analyses_used, analyses_limit')
            .eq('user_id', userId)
            .eq('period_start', periodStart)
            .maybeSingle();
        const usageUsed = usageRow?.analyses_used ?? 0;
        const usageLimit = usageRow?.analyses_limit ?? 0;

        // 7. 시스템 로그 — 유저 이메일로 최근 30건 (있을 때만)
        let recentLogs: Record<string, unknown>[] = [];
        try {
            const { data: logs } = await adminSupabase
                .from('system_logs')
                .select('id, area, level, event, message, created_at, metadata')
                .eq('user_email', targetUser.email || '__none__')
                .order('created_at', { ascending: false })
                .limit(30);
            recentLogs = (logs || []) as Record<string, unknown>[];
        } catch { /* table may not exist */ }

        // 8. 퍼널 단계 도출
        const stage = deriveFunnelStage({
            analysisCount: analysisCount ?? 0,
            uploadCount: uploadCount ?? 0,
            activeSubPlanSlug: activePlan?.slug || null,
            activeSubStatus: activeSub?.status || null,
            cancelledSubAt: lastCancelledSub?.cancelled_at || null,
            usageUsed,
            usageLimit,
        });

        // 9. 마지막 활동 — analyses, payments, logs 중 가장 최근
        const lastDates: number[] = [];
        if (recentAnalyses?.[0]?.created_at) lastDates.push(new Date(recentAnalyses[0].created_at).getTime());
        if (recentPayments[0]?.created_at) lastDates.push(new Date(recentPayments[0].created_at as string).getTime());
        if (recentLogs[0]?.created_at) lastDates.push(new Date(recentLogs[0].created_at as string).getTime());
        const lastActivityAt = lastDates.length > 0
            ? new Date(Math.max(...lastDates)).toISOString()
            : null;

        return NextResponse.json({
            profile: {
                id: targetUser.id,
                email: targetUser.email || '',
                phone: targetUser.phone || targetUser.user_metadata?.phone || '',
                name: targetUser.user_metadata?.name || targetUser.user_metadata?.full_name || '',
                company: targetUser.user_metadata?.company || '',
                suspended: targetUser.user_metadata?.suspended === true,
                suspended_reason: targetUser.user_metadata?.suspended_reason || '',
                created_at: targetUser.created_at,
                last_sign_in_at: targetUser.last_sign_in_at || null,
            },
            subscription: activeSub
                ? {
                    plan_slug: activePlan?.slug || null,
                    plan_name: activePlan?.display_name || null,
                    status: activeSub.status,
                    payment_method: activeSub.payment_method || activeSub.payment_provider || null,
                    started_at: activeSub.started_at,
                    current_period_end: activeSub.current_period_end,
                }
                : null,
            usage: {
                period_start: periodStart,
                analyses_used: usageUsed,
                analyses_limit: usageLimit,
            },
            analyses: {
                total_count: analysisCount ?? 0,
                recent: recentAnalyses || [],
            },
            uploads: {
                total_count: uploadCount ?? 0,
            },
            payments: {
                total_count: paymentCount,
                recent: recentPayments,
            },
            logs: {
                recent: recentLogs,
            },
            funnel: {
                stage,
                last_activity_at: lastActivityAt,
            },
        });
    } catch (error) {
        console.error('Admin user activity error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
