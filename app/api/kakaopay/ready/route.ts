import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { kakaoPayReady } from '@/lib/kakaopay/client';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { planSlug, billingCycle, upgradePlanSlug, couponCode } = await request.json();

    if (!planSlug || !billingCycle) {
        return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
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

    if (amount <= 0) {
        return NextResponse.json({ error: '결제 금액이 0원입니다. 무료 쿠폰은 결제 없이 적용됩니다.' }, { status: 400 });
    }

    const cycleLabel = billingCycle === 'yearly' ? '연간' : '월간';
    const emailPrefix = (user.email || '').split('@')[0].slice(0, 20);
    const partnerOrderId = `bobi-${emailPrefix}-${planSlug}-${Date.now()}`;

    try {
        const readyResponse = await kakaoPayReady({
            partnerOrderId,
            partnerUserId: user.id,
            itemName: `보비 ${plan.display_name} 플랜 (${cycleLabel})`,
            totalAmount: amount,
        });

        // TID를 세션에 저장 (approve 시 필요)
        // Supabase에 임시 저장
        await serviceClient
            .from('kakaopay_sessions')
            .upsert({
                user_id: user.id,
                tid: readyResponse.tid,
                partner_order_id: partnerOrderId,
                plan_slug: planSlug,
                billing_cycle: billingCycle,
                amount,
                upgrade_plan_slug: upgradePlanSlug || null,
                coupon_code: couponCode || null,
                created_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

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
