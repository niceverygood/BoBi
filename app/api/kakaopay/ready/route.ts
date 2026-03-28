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

    const cycleLabel = billingCycle === 'yearly' ? '연간' : '월간';
    const partnerOrderId = `bobi-${planSlug}-${billingCycle}-${Date.now()}`;

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
