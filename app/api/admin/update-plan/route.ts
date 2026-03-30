// app/api/admin/update-plan/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

export async function POST(request: Request) {
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
        // Check sub-admin
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

    const { targetEmail, planSlug } = await request.json();

    if (!targetEmail || !planSlug) {
        return NextResponse.json({ error: '이메일과 플랜을 입력해주세요.' }, { status: 400 });
    }

    const validPlans = ['free', 'basic', 'pro', 'team_basic', 'team_pro'];
    if (!validPlans.includes(planSlug)) {
        return NextResponse.json({ error: '유효하지 않은 플랜입니다.' }, { status: 400 });
    }

    try {
        // Service Role client 준비 (RLS 우회 필요)
        const { createClient: createServiceClient } = await import('@supabase/supabase-js');
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey || serviceKey === 'your_service_role_key') {
            return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' }, { status: 500 });
        }
        const adminSupabase = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey,
        );

        // Find user by email
        let targetUserId: string | null = null;

        // Method 1: Look up in profiles table
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('id, email')
            .eq('email', targetEmail)
            .maybeSingle();

        if (profile) {
            targetUserId = profile.id;
        }

        // Method 2: Try auth admin API
        if (!targetUserId) {
            const { data: usersData } = await adminSupabase.auth.admin.listUsers({ perPage: 100 });
            const targetUser = usersData?.users?.find((u) => u.email === targetEmail);
            if (targetUser) {
                targetUserId = targetUser.id;
            }
        }

        // Method 3: Self-test
        if (!targetUserId && user.email === targetEmail) {
            targetUserId = user.id;
        }

        if (!targetUserId) {
            return NextResponse.json({
                error: `사용자를 찾을 수 없습니다: ${targetEmail}`,
            }, { status: 404 });
        }

        // Get the target plan (service role로 조회)
        const { data: plan, error: planError } = await adminSupabase
            .from('subscription_plans')
            .select('*')
            .eq('slug', planSlug)
            .single();

        if (planError || !plan) {
            return NextResponse.json({ error: `플랜을 찾을 수 없습니다: ${planSlug}` }, { status: 404 });
        }

        // Calculate period dates
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const periodStart = `${year}-${month}-01`;
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        const periodEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        // Cancel all existing active subscriptions (service role로 RLS 우회)
        const { error: cancelError } = await adminSupabase
            .from('subscriptions')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('user_id', targetUserId)
            .eq('status', 'active');

        if (cancelError) {
            console.error('Cancel subscription error:', cancelError);
        }

        // Create new subscription (service role로 RLS 우회)
        const { error: insertError } = await adminSupabase
            .from('subscriptions')
            .insert({
                user_id: targetUserId,
                plan_id: plan.id,
                status: 'active',
                billing_cycle: 'monthly',
                current_period_start: periodStart,
                current_period_end: periodEnd,
            });

        if (insertError) {
            console.error('Insert subscription error:', insertError);
            return NextResponse.json({ error: `구독 생성 실패: ${insertError.message}` }, { status: 500 });
        }

        // Update usage_tracking limits (service role로 RLS 우회)
        const analysesLimit = plan.max_analyses === -1 ? 999999 : plan.max_analyses;

        const { data: existingUsage } = await adminSupabase
            .from('usage_tracking')
            .select('id')
            .eq('user_id', targetUserId)
            .eq('period_start', periodStart)
            .maybeSingle();

        if (existingUsage) {
            await adminSupabase
                .from('usage_tracking')
                .update({
                    analyses_limit: analysesLimit,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingUsage.id);
        } else {
            await adminSupabase
                .from('usage_tracking')
                .insert({
                    user_id: targetUserId,
                    period_start: periodStart,
                    period_end: periodEnd,
                    analyses_used: 0,
                    analyses_limit: analysesLimit,
                });
        }

        return NextResponse.json({
            success: true,
            message: `${targetEmail}의 플랜이 ${plan.display_name}(으)로 변경되었습니다.`,
            user: { id: targetUserId, email: targetEmail },
            plan: { slug: planSlug, name: plan.display_name },
        });
    } catch (error) {
        console.error('Admin update-plan error:', error);
        return NextResponse.json({
            error: `플랜 변경 실패: ${(error as Error).message}`,
        }, { status: 500 });
    }
}
