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
        // Get all subscriptions with plans
        const { data: subscriptions } = await supabase
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

        // Try service role key for full user list
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceKey && serviceKey !== 'your_service_role_key') {
            const { createClient: createAdminClient } = await import('@supabase/supabase-js');
            const adminSupabase = createAdminClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                serviceKey,
            );
            const { data: usersData } = await adminSupabase.auth.admin.listUsers({ perPage: 500 });
            const users = (usersData?.users || []).map((u) => ({
                id: u.id,
                email: u.email || '',
                name: u.user_metadata?.name || '',
                company: u.user_metadata?.company || '',
                created_at: u.created_at,
                plan_slug: subMap.get(u.id)?.slug || 'free',
                plan_name: subMap.get(u.id)?.name || '무료',
            }));
            return NextResponse.json({ users });
        }

        // Fallback: profiles table
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, name, company, plan, analysis_count, created_at')
            .order('created_at', { ascending: false });

        const users = (profiles || []).map((p) => ({
            id: p.id,
            email: p.email || '',
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
