import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // Fetch active subscription with plan details
    // 같은 user_id로 active 구독이 여러 개 있을 수 있으므로, 최신 1건만 가져옴
    const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1);

    if (subError) {
        return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    const subscription = subscriptions?.[0] || null;

    // Fetch current month usage (use local date to avoid timezone issues)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const periodStart = `${year}-${month}-01`;

    let { data: usage } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('period_start', periodStart)
        .maybeSingle();

    // If no usage record for this month, create one
    if (!usage) {
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const periodEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        const limit = subscription?.plan?.max_analyses ?? 3;

        const { data: newUsage } = await supabase
            .from('usage_tracking')
            .insert({
                user_id: user.id,
                period_start: periodStart,
                period_end: periodEnd,
                analyses_used: 0,
                analyses_limit: limit === -1 ? 999999 : limit,
            })
            .select()
            .single();

        usage = newUsage;
    }

    // Fetch all plans for comparison
    const { data: plans } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order');

    return NextResponse.json({
        subscription,
        usage,
        plans,
    });
}
