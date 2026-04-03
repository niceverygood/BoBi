// app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

export async function GET() {
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
        // Service role로 전체 구독 조회 (RLS 우회 필수 — anon key로는 다른 유저 구독 조회 불가)
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey || serviceKey === 'your_service_role_key') {
            return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' }, { status: 500 });
        }
        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey,
        );

        // Get all active subscriptions with plans (service role로 전체 조회)
        const { data: subscriptions } = await adminSupabase
            .from('subscriptions')
            .select('user_id, plan:subscription_plans(slug, display_name)')
            .eq('status', 'active');

        const subMap = new Map<string, { slug: string; name: string }>();
        for (const sub of subscriptions || []) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const plan = sub.plan as any;
            if (plan) {
                subMap.set(sub.user_id, { slug: plan.slug, name: plan.display_name });
            }
        }

        // adminSupabase는 이미 위에서 생성됨 — 유저 목록 조회
        const { data: usersData } = await adminSupabase.auth.admin.listUsers({ perPage: 500 });
        if (usersData?.users && usersData.users.length > 0) {
            const users = usersData.users.map((u) => ({
                id: u.id,
                email: u.email || '',
                phone: u.phone || u.user_metadata?.phone || '',
                name: u.user_metadata?.name || '',
                company: u.user_metadata?.company || '',
                suspended: u.user_metadata?.suspended === true,
                suspended_reason: u.user_metadata?.suspended_reason || '',
                created_at: u.created_at,
                plan_slug: subMap.get(u.id)?.slug || 'free',
                plan_name: subMap.get(u.id)?.name || '무료',
            }));
            return NextResponse.json({ users });
        }

        // Fallback: profiles table
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, name, company, phone, plan, analysis_count, created_at')
            .order('created_at', { ascending: false });

        const users = (profiles || []).map((p) => ({
            id: p.id,
            email: p.email || '',
            phone: p.phone || '',
            name: p.name || '',
            company: p.company || '',
            created_at: p.created_at,
            plan_slug: subMap.get(p.id)?.slug || p.plan || 'free',
            plan_name: subMap.get(p.id)?.name || '무료',
        }));

        // If profiles empty, return at least the current admin user
        if (users.length === 0) {
            users.push({
                id: user.id,
                email: user.email || '',
                name: user.user_metadata?.name || '',
                company: user.user_metadata?.company || '',
                created_at: user.created_at || new Date().toISOString(),
                plan_slug: subMap.get(user.id)?.slug || 'free',
                plan_name: subMap.get(user.id)?.name || '무료',
            });
        }

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Admin users error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
