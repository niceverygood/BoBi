import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { payWithBillingKey } from '@/lib/portone/server';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { billingKey, planSlug, billingCycle, paymentMethod, upgradePlanSlug, couponCode } = await request.json();

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

    let amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

    // 쿠폰 할인 적용 (검증 포함)
    let validatedCouponId: string | null = null;
    if (couponCode) {
        const { data: coupon } = await serviceClient
            .from('promo_codes')
            .select('*')
            .eq('code', couponCode.toUpperCase().trim())
            .eq('active', true)
            .single();

        if (coupon) {
            if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
                return NextResponse.json({ error: '만료된 쿠폰입니다.' }, { status: 400 });
            }
            if (coupon.max_uses !== -1 && coupon.used_count >= coupon.max_uses) {
                return NextResponse.json({ error: '사용 횟수가 초과된 쿠폰입니다.' }, { status: 400 });
            }
            const { data: existingRedemption } = await serviceClient
                .from('promo_code_redemptions')
                .select('id')
                .eq('promo_code_id', coupon.id)
                .eq('user_id', user.id)
                .maybeSingle();
            if (existingRedemption) {
                return NextResponse.json({ error: '이미 사용한 쿠폰입니다.' }, { status: 400 });
            }

            validatedCouponId = coupon.id;
            if (coupon.discount_type === 'percent') {
                const percent = Math.min(coupon.discount_value, 100);
                amount = Math.max(0, amount - Math.round(amount * percent / 100));
            } else if (coupon.discount_type === 'fixed') {
                amount = Math.max(0, amount - coupon.discount_value);
            } else if (coupon.discount_type === 'price_override' || coupon.price_override !== null) {
                amount = Math.max(0, coupon.price_override ?? amount);
            }
        }
    }

    if (amount <= 0) {
        return NextResponse.json({ error: '결제 금액이 0원입니다. 무료 쿠폰은 결제 없이 적용됩니다.' }, { status: 400 });
    }

    // 첫 결제 실행 (빌링키로 실제 결제)
    const emailPrefix = (user.email || '').split('@')[0].slice(0, 20);
    const paymentId = `sub-${emailPrefix}-${planSlug}-${Date.now()}`;
    const cycleLabel = billingCycle === 'yearly' ? '연간' : '월간';

    const payResult = await payWithBillingKey({
        billingKey,
        paymentId,
        orderName: `보비 ${plan.display_name} 플랜 (${cycleLabel})`,
        amount,
    });

    if (!payResult.success) {
        return NextResponse.json(
            { error: payResult.error || '첫 결제에 실패했습니다. 다시 시도해주세요.' },
            { status: 402 }
        );
    }

    // 업그레이드 플랜 처리: 쿠폰코드로 검증 후 실제 구독 플랜 결정
    let actualPlan = plan;
    if (upgradePlanSlug && couponCode) {
        // 쿠폰 재검증 (보안)
        const { data: coupon } = await serviceClient
            .from('promo_codes')
            .select('upgrade_to_plan, active')
            .eq('code', couponCode.toUpperCase().trim())
            .eq('active', true)
            .single();

        if (coupon && coupon.upgrade_to_plan === upgradePlanSlug) {
            const { data: upgradePlan } = await serviceClient
                .from('subscription_plans')
                .select('*')
                .eq('slug', upgradePlanSlug)
                .single();

            if (upgradePlan) {
                actualPlan = upgradePlan;
            }
        }
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

    // Create new subscription (actualPlan = 업그레이드된 플랜 또는 원래 플랜)
    const { data: subscription, error: subError } = await serviceClient
        .from('subscriptions')
        .insert({
            user_id: user.id,
            plan_id: actualPlan.id,
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
        console.error(`[billing/issue] 구독 생성 실패 (결제 paymentId=${paymentId}, amount=${amount}):`, subError);
        return NextResponse.json({
            error: '구독 생성 중 오류가 발생했습니다. 결제는 완료되었으니 고객센터에 문의해주세요.',
            paymentId,
            amount,
        }, { status: 500 });
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

    const newLimit = actualPlan.max_analyses === -1 ? 999999 : actualPlan.max_analyses;

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
                provider: paymentMethod === 'card' ? 'portone_inicis' : 'portone_kakaopay',
                created_at: now.toISOString(),
            }, { onConflict: 'user_id' });
    } catch {
        // billing_keys table may not exist yet — non-critical
    }

    // Record payment history
    try {
        await serviceClient
            .from('payment_history')
            .insert({
                user_id: user.id,
                subscription_id: subscription.id,
                payment_id: paymentId,
                amount,
                status: 'paid',
                billing_cycle: billingCycle,
                plan_slug: planSlug,
            });
    } catch {
        // payment_history table may not exist yet — non-critical
    }

    // 쿠폰 사용 기록
    if (validatedCouponId) {
        try {
            await serviceClient
                .from('promo_code_redemptions')
                .insert({ promo_code_id: validatedCouponId, user_id: user.id });
            const { data: couponData } = await serviceClient
                .from('promo_codes')
                .select('used_count')
                .eq('id', validatedCouponId)
                .single();
            if (couponData) {
                await serviceClient
                    .from('promo_codes')
                    .update({ used_count: (couponData.used_count || 0) + 1 })
                    .eq('id', validatedCouponId);
            }
        } catch {
            // non-critical
        }
    }

    return NextResponse.json({
        success: true,
        subscription,
        plan: actualPlan.slug,
        amount,
        billingCycle,
        upgraded: actualPlan.slug !== planSlug ? actualPlan.slug : undefined,
    });
}
