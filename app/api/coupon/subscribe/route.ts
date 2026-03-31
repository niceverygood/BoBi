// app/api/coupon/subscribe/route.ts
// 무료 쿠폰으로 구독 생성 (결제 금액 0원일 때)
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { couponCode, planSlug, billingCycle } = await request.json();

    if (!couponCode || !planSlug) {
        return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    try {
        const serviceClient = await createServiceClient();

        // 1. 쿠폰 유효성 검증
        const { data: coupon, error: couponError } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', couponCode.toUpperCase().trim())
            .eq('active', true)
            .single();

        if (couponError || !coupon) {
            return NextResponse.json({ error: '유효하지 않은 쿠폰 코드입니다.' }, { status: 400 });
        }

        // 만료 확인
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            return NextResponse.json({ error: '만료된 쿠폰 코드입니다.' }, { status: 400 });
        }

        // 사용 횟수 확인
        if (coupon.max_uses !== -1 && coupon.used_count >= coupon.max_uses) {
            return NextResponse.json({ error: '사용 횟수가 초과된 쿠폰입니다.' }, { status: 400 });
        }

        // 중복 사용 확인
        const { data: existingRedemption } = await supabase
            .from('promo_code_redemptions')
            .select('id')
            .eq('promo_code_id', coupon.id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingRedemption) {
            return NextResponse.json({ error: '이미 사용한 쿠폰 코드입니다.' }, { status: 400 });
        }

        // 2. 무료 쿠폰인지 확인 (price_override === 0 또는 100% 할인)
        const { PLAN_LIMITS } = await import('@/lib/utils/constants');
        const planInfo = PLAN_LIMITS[planSlug as keyof typeof PLAN_LIMITS];
        if (!planInfo) {
            return NextResponse.json({ error: '유효하지 않은 플랜입니다.' }, { status: 400 });
        }

        const originalPrice = billingCycle === 'yearly' ? planInfo.priceYearly : planInfo.priceMonthly;
        let finalPrice = originalPrice;

        if (coupon.discount_type === 'percent') {
            const percent = Math.min(coupon.discount_value, 100);
            finalPrice = Math.max(0, originalPrice - Math.round(originalPrice * percent / 100));
        } else if (coupon.discount_type === 'fixed') {
            finalPrice = Math.max(0, originalPrice - coupon.discount_value);
        } else if (coupon.discount_type === 'price_override' || coupon.price_override !== null) {
            finalPrice = coupon.price_override;
        }

        if (finalPrice > 0) {
            return NextResponse.json({ 
                error: `이 쿠폰은 무료가 아닙니다 (결제 금액: ${finalPrice.toLocaleString()}원). 결제를 진행해주세요.` 
            }, { status: 400 });
        }

        // 3. 플랜 조회
        const resolvedPlanSlug = coupon.upgrade_to_plan || planSlug;
        const { data: plan, error: planError } = await serviceClient
            .from('subscription_plans')
            .select('*')
            .eq('slug', resolvedPlanSlug)
            .single();

        if (planError || !plan) {
            return NextResponse.json({ error: `플랜을 찾을 수 없습니다: ${resolvedPlanSlug}` }, { status: 500 });
        }

        // 4. 기존 구독 취소
        await serviceClient
            .from('subscriptions')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('status', 'active');

        await serviceClient
            .from('subscriptions')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('status', 'past_due');

        // 5. 기간 계산
        const now = new Date();
        const durationMonths = coupon.duration_months || 1;
        const periodEnd = new Date(now);
        
        if (durationMonths === -1) {
            // 무기한
            periodEnd.setFullYear(periodEnd.getFullYear() + 10);
        } else {
            periodEnd.setMonth(periodEnd.getMonth() + durationMonths);
        }

        // 6. 구독 생성
        const { error: insertError } = await serviceClient
            .from('subscriptions')
            .insert({
                user_id: user.id,
                plan_id: plan.id,
                status: 'active',
                billing_cycle: billingCycle || 'monthly',
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                payment_provider: 'coupon_free',
                payment_key: coupon.code,
            });

        if (insertError) {
            console.error('Subscription insert error:', insertError);
            return NextResponse.json({ error: '구독 생성에 실패했습니다.' }, { status: 500 });
        }

        // 7. Usage tracking 업데이트
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const usagePeriodStart = `${year}-${month}-01`;
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        const usagePeriodEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        const analysesLimit = plan.max_analyses === -1 ? 999999 : plan.max_analyses;

        const { data: existingUsage } = await serviceClient
            .from('usage_tracking')
            .select('id')
            .eq('user_id', user.id)
            .eq('period_start', usagePeriodStart)
            .maybeSingle();

        if (existingUsage) {
            await serviceClient
                .from('usage_tracking')
                .update({ analyses_limit: analysesLimit, updated_at: now.toISOString() })
                .eq('id', existingUsage.id);
        } else {
            await serviceClient
                .from('usage_tracking')
                .insert({
                    user_id: user.id,
                    period_start: usagePeriodStart,
                    period_end: usagePeriodEnd,
                    analyses_used: 0,
                    analyses_limit: analysesLimit,
                });
        }

        // 8. 쿠폰 사용 기록
        await serviceClient.from('promo_code_redemptions').insert({
            promo_code_id: coupon.id,
            user_id: user.id,
            code: coupon.code,
            plan_slug: resolvedPlanSlug,
            duration_months: durationMonths,
            starts_at: now.toISOString(),
            expires_at: durationMonths === -1 ? null : periodEnd.toISOString(),
            status: 'active',
        });

        // 9. 사용 횟수 증가
        await serviceClient.from('promo_codes')
            .update({ used_count: (coupon.used_count || 0) + 1, updated_at: now.toISOString() })
            .eq('id', coupon.id);

        const durationText = durationMonths === -1 ? '무기한' : `${durationMonths}개월`;

        return NextResponse.json({
            success: true,
            message: `쿠폰이 적용되었습니다! ${plan.display_name} 플랜 (${durationText})`,
            plan: { slug: resolvedPlanSlug, name: plan.display_name },
        });
    } catch (error) {
        console.error('Coupon subscribe error:', error);
        return NextResponse.json({
            error: `쿠폰 적용 실패: ${(error as Error).message}`,
        }, { status: 500 });
    }
}
