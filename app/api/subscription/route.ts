import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // Fetch active subscription with plan details
    const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

    if (subError && subError.code !== 'PGRST116') {
        return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    // Fetch current month usage
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];

    let { data: usage } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('period_start', periodStart)
        .single();

    // If no usage record for this month, create one
    if (!usage) {
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            .toISOString()
            .split('T')[0];

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
