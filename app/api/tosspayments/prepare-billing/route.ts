// app/api/tosspayments/prepare-billing/route.ts
// 설계사 세션에서 customerKey 생성 + pending 세션 저장 + 클라이언트에 SDK 파라미터 반환

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCustomerKey } from '@/lib/tosspayments/server';
import { checkTrialEligibility, isTrialEligiblePlan } from '@/lib/subscription/trial';
import { getPlanPrice } from '@/lib/utils/pricing';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const body = await request.json();
        const planSlug = String(body.planSlug || '').trim();
        const billingCycle = body.billingCycle === 'yearly' ? 'yearly' : 'monthly';
        const buyerName = String(body.buyerName || '').trim();
        const buyerEmail = String(body.buyerEmail || '').trim();
        const buyerTel = body.buyerTel ? String(body.buyerTel).replace(/\D/g, '') : '';
        const couponCode = body.couponCode ? String(body.couponCode).trim().toUpperCase() : null;
        const upgradePlanSlug = body.upgradePlanSlug ? String(body.upgradePlanSlug).trim() : null;
        const rawIntent = body.intent === 'trial' ? 'trial' : 'normal';

        // 체험 요청이면 서버 사이드 재검증 (클라 우회 방지)
        let intent: 'normal' | 'trial' = rawIntent;
        if (intent === 'trial') {
            if (!isTrialEligiblePlan(planSlug)) {
                return NextResponse.json({ error: '해당 플랜은 무료 체험을 지원하지 않습니다.' }, { status: 400 });
            }
            const eligibility = await checkTrialEligibility(supabase, user.id, planSlug);
            if (!eligibility.eligible) {
                return NextResponse.json(
                    { error: '무료 체험 대상이 아닙니다.', reason: eligibility.reason },
                    { status: 400 },
                );
            }
        }

        if (!planSlug) {
            return NextResponse.json({ error: 'planSlug 누락' }, { status: 400 });
        }
        if (!buyerName || !buyerEmail) {
            return NextResponse.json({ error: '구매자 이름과 이메일이 필요합니다.' }, { status: 400 });
        }

        // 플랜 금액 조회
        const { data: plan } = await supabase
            .from('subscription_plans')
            .select('slug, display_name')
            .eq('slug', planSlug)
            .maybeSingle();
        if (!plan) {
            return NextResponse.json({ error: '플랜을 찾을 수 없습니다.' }, { status: 404 });
        }

        let amount = getPlanPrice(plan.slug, billingCycle);

        // 쿠폰 할인 (display용 — 실제 청구는 billing-success에서 재검증)
        if (couponCode) {
            const { data: coupon } = await supabase
                .from('promo_codes')
                .select('discount_type, discount_value, price_override, expires_at, active')
                .eq('code', couponCode)
                .eq('active', true)
                .maybeSingle();
            if (coupon && (!coupon.expires_at || new Date(coupon.expires_at) >= new Date())) {
                if (coupon.discount_type === 'percent') {
                    amount = Math.max(0, amount - Math.round((amount * Math.min(coupon.discount_value, 100)) / 100));
                } else if (coupon.discount_type === 'fixed') {
                    amount = Math.max(0, amount - coupon.discount_value);
                } else if (coupon.price_override !== null && coupon.price_override !== undefined) {
                    amount = Math.max(0, coupon.price_override);
                }
            }
        }

        // 토스페이먼츠 자동결제는 0원 결제 불가 → 최소 100원
        if (amount <= 0) amount = 100;

        const customerKey = generateCustomerKey(user.id);
        const orderName = `보비 ${plan.display_name} 플랜 (${billingCycle === 'yearly' ? '연간' : '월간'})`;

        // 세션 저장
        try {
            await supabase.from('tosspayments_pending_billing').insert({
                customer_key: customerKey,
                user_id: user.id,
                plan_slug: planSlug,
                billing_cycle: billingCycle,
                coupon_code: couponCode,
                upgrade_plan_slug: upgradePlanSlug,
                buyer_name: buyerName,
                buyer_email: buyerEmail,
                buyer_tel: buyerTel,
                amount,
                intent,
            });
        } catch (err) {
            console.error('[tosspayments/prepare] pending 저장 실패:', err);
            return NextResponse.json({
                error: '결제 준비 중 오류가 발생했습니다. (DB)',
            }, { status: 500 });
        }

        const origin =
            process.env.NEXT_PUBLIC_BASE_URL ||
            request.headers.get('origin') ||
            'https://www.bobi.co.kr';
        const successUrl = `${origin.replace(/\/$/, '')}/api/tosspayments/billing-success`;
        const failUrl = `${origin.replace(/\/$/, '')}/dashboard/subscribe?toss_status=failed&plan=${planSlug}`;

        const clientKey = process.env.NEXT_PUBLIC_TOSSPAYMENTS_CLIENT_KEY;
        if (!clientKey) {
            return NextResponse.json(
                { error: '토스페이먼츠 클라이언트 키가 설정되지 않았습니다. (NEXT_PUBLIC_TOSSPAYMENTS_CLIENT_KEY)' },
                { status: 500 },
            );
        }

        return NextResponse.json({
            customerKey,
            clientKey,
            successUrl,
            failUrl,
            orderName,
            displayAmount: amount,
            buyerName,
            buyerEmail,
        });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message || '결제 준비 실패' },
            { status: 500 },
        );
    }
}
