import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { kakaoPayReady } from '@/lib/kakaopay/client';
import { checkTrialEligibility, isTrialEligiblePlan } from '@/lib/subscription/trial';

// 카카오페이 최소 결제 금액 (정기결제 SID 발급 시 required)
// 체험 모드에서는 이 금액으로 임시 결제 후 approve 직후 즉시 환불.
const TRIAL_MINI_CHARGE_AMOUNT = 100;

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { planSlug, billingCycle, upgradePlanSlug, couponCode, intent } = await request.json();

    if (!planSlug || !billingCycle) {
        return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    // 체험 모드 검증 — 자격 없으면 일반 결제로 다운그레이드
    let useTrial = intent === 'trial';
    if (useTrial) {
        if (!isTrialEligiblePlan(planSlug) || billingCycle !== 'monthly') {
            useTrial = false;
        } else {
            const eligibility = await checkTrialEligibility(supabase, user.id, planSlug);
            if (!eligibility.eligible) useTrial = false;
        }
    }

    if (billingCycle === 'yearly') {
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

    if (amount <= 0 && !useTrial) {
        return NextResponse.json({ error: '결제 금액이 0원입니다. 무료 쿠폰은 결제 없이 적용됩니다.' }, { status: 400 });
    }

    const cycleLabel = billingCycle === 'yearly' ? '연간' : '월간';
    const emailPrefix = (user.email || '').split('@')[0].slice(0, 20);
    const partnerOrderId = `bobi-${emailPrefix}-${planSlug}-${Date.now()}`;

    // 체험 모드: 실제 카카오페이에는 100원만 청구(SID 발급용) — approve 후 즉시 환불.
    // 일반 모드: 계산된 amount 그대로 청구.
    const chargeAmount = useTrial ? TRIAL_MINI_CHARGE_AMOUNT : amount;

    try {
        const readyResponse = await kakaoPayReady({
            partnerOrderId,
            partnerUserId: user.id,
            itemName: useTrial
                ? `보비 ${plan.display_name} 3일 체험 등록 (실제 결제는 3일 후)`
                : `보비 ${plan.display_name} 플랜 (${cycleLabel})`,
            totalAmount: chargeAmount,
        });

        // TID를 세션에 저장 (approve 시 필요)
        // amount에는 "체험 종료 후 자동결제할 원래 금액"을 저장해 approve에서 참고.
        // upsert 에러를 반드시 확인 — 세션 저장 실패 상태로 카카오페이 redirect를 반환하면
        // 결제 후 approve가 세션을 못 찾아 "결제됐는데 플랜 미적용" 사고로 직결됨.
        const { error: sessionUpsertError } = await serviceClient
            .from('kakaopay_sessions')
            .upsert({
                user_id: user.id,
                tid: readyResponse.tid,
                partner_order_id: partnerOrderId,
                plan_slug: planSlug,
                billing_cycle: billingCycle,
                amount, // 정가 — 체험 종료 시 이 금액이 자동결제됨
                upgrade_plan_slug: upgradePlanSlug || null,
                coupon_code: couponCode || null,
                intent: useTrial ? 'trial' : 'subscribe',
                created_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

        if (sessionUpsertError) {
            try {
                const { captureError } = await import('@/lib/monitoring/sentry-helpers');
                captureError(new Error(`kakaopay_sessions upsert failed: ${sessionUpsertError.message}`), {
                    area: 'billing',
                    level: 'error',
                    tags: { provider: 'kakaopay', stage: 'ready_session_upsert' },
                    metadata: {
                        userId: user.id,
                        planSlug,
                        partnerOrderId,
                        intent: useTrial ? 'trial' : 'subscribe',
                        supabaseError: sessionUpsertError.message,
                    },
                });
            } catch { /* sentry 실패는 무시 */ }
            return NextResponse.json(
                { error: '결제 세션 저장에 실패했습니다. 잠시 후 다시 시도해주세요.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            tid: readyResponse.tid,
            redirectUrl: readyResponse.next_redirect_pc_url,
            mobileRedirectUrl: readyResponse.next_redirect_mobile_url,
        });
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 500 }
        );
    }
}
