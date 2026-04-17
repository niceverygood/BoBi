import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { payWithBillingKey } from '@/lib/portone/server';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { billingKey, paymentId, planSlug, billingCycle, paymentMethod, upgradePlanSlug, couponCode } = await request.json();

    if ((!billingKey && !paymentId) || !planSlug || !billingCycle) {
        return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    // 신용카드 빌링키 발급 전까지 카카오페이만 지원
    // if (billingCycle === 'yearly' && paymentMethod === 'kakaopay') { ... }

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

    // 업그레이드 차액 계산: 기존 구독이 있으면 남은 기간 비례 차감
    const { data: existingSub } = await serviceClient
        .from('subscriptions')
        .select('*, plan:subscription_plans(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

    if (existingSub && existingSub.plan) {
        const oldPlan = existingSub.plan as Record<string, any>;
        const oldAmount = billingCycle === 'yearly' ? (oldPlan.price_yearly || 0) : (oldPlan.price_monthly || 0);

        if (oldAmount > 0 && oldAmount < amount) {
            // 남은 기간 비례 계산
            const periodEnd = new Date(existingSub.current_period_end);
            const periodStart = new Date(existingSub.current_period_start);
            const now = new Date();
            const totalDays = Math.max(1, (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
            const remainingDays = Math.max(0, (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const usedRatio = 1 - (remainingDays / totalDays);

            // 기존 결제에서 미사용 금액
            const unusedCredit = Math.round(oldAmount * (1 - usedRatio));
            const upgradeAmount = Math.max(0, amount - unusedCredit);

            console.log(`[Billing] 업그레이드 차액 계산: 신규 ${amount}원 - 미사용 ${unusedCredit}원 = ${upgradeAmount}원`);
            amount = upgradeAmount;

            if (amount <= 0) {
                // 차액이 0 이하면 결제 없이 플랜만 변경
                await serviceClient.from('subscriptions').update({
                    plan_id: plan.id,
                    payment_method: paymentMethod || 'upgrade',
                }).eq('id', existingSub.id);

                return NextResponse.json({
                    success: true,
                    message: '기존 결제 잔여분으로 플랜이 업그레이드되었습니다.',
                    amount: 0,
                });
            }
        }
    }

    // 결제 처리
    let finalPaymentId = paymentId; // requestPayment로 이미 결제된 경우

    if (billingKey) {
        // 빌링키 기반 결제 (기존 방식)
        const emailPrefix = (user.email || '').split('@')[0].slice(0, 20);
        finalPaymentId = `sub-${emailPrefix}-${planSlug}-${Date.now()}`;
        const cycleLabel = billingCycle === 'yearly' ? '연간' : '월간';

        // 이니시스 V2 정기결제 채널키 (카드 결제인 경우)
        const inicisChannelKey = paymentMethod === 'card'
            ? process.env.NEXT_PUBLIC_PORTONE_INICIS_BILLING_CHANNEL_KEY
            : undefined;

        const payResult = await payWithBillingKey({
            billingKey,
            paymentId: finalPaymentId,
            orderName: `보비 ${plan.display_name} 플랜 (${cycleLabel})`,
            amount,
            channelKey: inicisChannelKey,
            customer: {
                id: user.id,
                email: user.email || undefined,
            },
        });

        if (!payResult.success) {
            return NextResponse.json(
                { error: payResult.error || '첫 결제에 실패했습니다. 다시 시도해주세요.' },
                { status: 402 }
            );
        }
    }
    // paymentId로 온 경우: requestPayment로 이미 결제 완료 → 구독만 생성

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
            payment_key: billingKey || finalPaymentId,
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
                billing_key: billingKey || finalPaymentId,
                provider: paymentMethod === 'card' ? 'portone_inicis' : 'portone_kakaopay',
                created_at: now.toISOString(),
            }, { onConflict: 'user_id' });
    } catch {
        // billing_keys table may not exist yet — non-critical
    }

    // Record payment history (both tables)
    try {
        await serviceClient
            .from('payment_history')
            .insert({
                user_id: user.id,
                subscription_id: subscription.id,
                payment_id: finalPaymentId,
                amount,
                status: 'paid',
                billing_cycle: billingCycle,
                plan_slug: planSlug,
            });
    } catch { /* non-critical */ }

    try {
        await serviceClient
            .from('payments')
            .insert({
                user_id: user.id,
                subscription_id: subscription.id,
                payment_id: finalPaymentId,
                portone_payment_id: finalPaymentId,
                amount,
                status: 'paid',
                billing_cycle: billingCycle,
                plan_slug: actualPlan.slug,
                payment_method: paymentMethod || 'card',
            });
    } catch { /* non-critical */ }

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
