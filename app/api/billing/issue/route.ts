import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { billingKey, planSlug, billingCycle, paymentMethod } = await request.json();

    if (!billingKey || !planSlug || !billingCycle) {
        return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    if (billingCycle === 'yearly' && paymentMethod === 'kakaopay') {
        return NextResponse.json({ error: '연간 결제는 카카오페이를 지원하지 않습니다.' }, { status: 400 });
    }

    const serviceClient = await createServiceClient();

    // Fetch plan
    const { data: plan, error: planError } = await serviceClient
        .from('subscription_plans')
        .select('*')
        .eq('slug', planSlug)
        .single();

    if (planError || !plan) {
        return NextResponse.json({ error: '존재하지 않는 플랜입니다.' }, { status: 400 });
    }

    const amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
    if (amount <= 0) {
        return NextResponse.json({ error: '무료 플랜은 결제가 필요하지 않습니다.' }, { status: 400 });
    }

    // Calculate period
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Cancel any existing active subscription
    await serviceClient
        .from('subscriptions')
        .update({ status: 'cancelled', cancelled_at: now.toISOString() })
        .eq('user_id', user.id)
        .eq('status', 'active');

    // Create new subscription
    const { data: subscription, error: subError } = await serviceClient
        .from('subscriptions')
        .insert({
            user_id: user.id,
            plan_id: plan.id,
            status: 'active',
            billing_cycle: billingCycle,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            payment_provider: paymentMethod === 'card' ? 'portone_inicis' : 'portone_kakaopay',
            payment_key: billingKey,
        })
        .select()
        .single();

    if (subError) {
        return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    // Update usage tracking
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const periodStart = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const periodEndUsage = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    const { data: existingUsage } = await serviceClient
        .from('usage_tracking')
        .select('id')
        .eq('user_id', user.id)
        .eq('period_start', periodStart)
        .maybeSingle();

    const newLimit = plan.max_analyses === -1 ? 999999 : plan.max_analyses;

    if (existingUsage) {
        await serviceClient
            .from('usage_tracking')
            .update({ analyses_limit: newLimit })
            .eq('id', existingUsage.id);
    } else {
        await serviceClient
            .from('usage_tracking')
            .insert({
                user_id: user.id,
                period_start: periodStart,
                period_end: periodEndUsage,
                analyses_used: 0,
                analyses_limit: newLimit,
            });
    }

    // Save billing key for future auto-renewals (ignore if table doesn't exist yet)
    try {
        await serviceClient
            .from('billing_keys')
            .upsert({
                user_id: user.id,
                billing_key: billingKey,
                provider: 'portone_kakaopay',
                created_at: now.toISOString(),
            }, { onConflict: 'user_id' });
    } catch {
        // billing_keys table may not exist yet — non-critical
    }

    return NextResponse.json({
        success: true,
        subscription,
        plan: plan.slug,
        amount,
        billingCycle,
    });
}
