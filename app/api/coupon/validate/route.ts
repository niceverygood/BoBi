// app/api/coupon/validate/route.ts
// 사용자가 쿠폰 코드를 입력했을 때 유효성을 검증하고 할인 정보를 반환
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
        }

        const { code, planSlug, billingCycle } = await request.json();

        if (!code || !planSlug) {
            return NextResponse.json({ error: '쿠폰 코드와 플랜을 입력해주세요.' }, { status: 400 });
        }

        const normalizedCode = code.toUpperCase().trim();

        // 쿠폰 조회
        const { data: coupon, error: couponError } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', normalizedCode)
            .eq('active', true)
            .single();

        if (couponError || !coupon) {
            return NextResponse.json({ error: '유효하지 않은 쿠폰 코드입니다.' }, { status: 400 });
        }

        // 만료일 확인
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            return NextResponse.json({ error: '만료된 쿠폰 코드입니다.' }, { status: 400 });
        }

        // 사용 횟수 확인
        if (coupon.max_uses !== -1 && coupon.used_count >= coupon.max_uses) {
            return NextResponse.json({ error: '사용 횟수가 초과된 쿠폰입니다.' }, { status: 400 });
        }

        // 이미 이 사용자가 사용한 코드인지 확인
        const { data: existingRedemption } = await supabase
            .from('promo_code_redemptions')
            .select('id')
            .eq('promo_code_id', coupon.id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingRedemption) {
            return NextResponse.json({ error: '이미 사용한 쿠폰 코드입니다.' }, { status: 400 });
        }

        // 플랜 호환성 확인 (쿠폰이 특정 플랜 전용인지)
        // upgrade_to_plan이 있는 쿠폰은 plan_slug 기준으로 호환성 체크 (결제 플랜 기준)
        if (coupon.plan_slug && coupon.plan_slug !== 'all') {
            const couponPlans = coupon.plan_slug.split(',').map((s: string) => s.trim());
            if (!couponPlans.includes(planSlug) && !couponPlans.includes('all')) {
                const planNames: Record<string, string> = {
                    basic: '베이직', pro: '프로',
                    team_basic: '팀 베이직', team_pro: '팀 프로',
                };
                return NextResponse.json({
                    error: `이 쿠폰은 ${couponPlans.map((p: string) => planNames[p] || p).join(', ')} 플랜에서만 사용 가능합니다.`,
                }, { status: 400 });
            }
        }

        // 할인 계산
        const { PLAN_LIMITS } = await import('@/lib/utils/constants');
        const planInfo = PLAN_LIMITS[planSlug as keyof typeof PLAN_LIMITS];
        if (!planInfo) {
            return NextResponse.json({ error: '유효하지 않은 플랜입니다.' }, { status: 400 });
        }

        const originalPrice = billingCycle === 'yearly' ? planInfo.priceYearly : planInfo.priceMonthly;

        let discountAmount = 0;
        let discountLabel = '';
        let finalPrice = originalPrice;

        if (coupon.discount_type === 'percent') {
            // 퍼센트 할인
            const percent = Math.min(coupon.discount_value, 100);
            discountAmount = Math.round(originalPrice * percent / 100);
            discountLabel = `${percent}% 할인`;
        } else if (coupon.discount_type === 'fixed') {
            // 고정 금액 할인
            discountAmount = Math.min(coupon.discount_value, originalPrice);
            discountLabel = `${coupon.discount_value.toLocaleString()}원 할인`;
        } else if (coupon.discount_type === 'price_override') {
            // 가격 덮어쓰기 (기존 price_override 방식 호환)
            discountAmount = originalPrice - coupon.price_override;
            discountLabel = coupon.price_override === 0 ? '무료' : `${coupon.price_override.toLocaleString()}원으로 변경`;
            finalPrice = coupon.price_override;
        } else {
            // 기존 방식 (price_override 필드 사용)
            if (coupon.price_override !== null && coupon.price_override !== undefined) {
                discountAmount = originalPrice - coupon.price_override;
                discountLabel = coupon.price_override === 0 ? '무료' : `${coupon.price_override.toLocaleString()}원으로 변경`;
                finalPrice = coupon.price_override;
            }
        }

        if (discountAmount > 0 && coupon.discount_type !== 'price_override') {
            finalPrice = Math.max(0, originalPrice - discountAmount);
        }

        // 업그레이드 플랜 정보 조회
        let upgradePlan = null;
        if (coupon.upgrade_to_plan) {
            const { data: upgradePlanData } = await supabase
                .from('subscription_plans')
                .select('slug, display_name')
                .eq('slug', coupon.upgrade_to_plan)
                .single();
            if (upgradePlanData) {
                upgradePlan = {
                    slug: upgradePlanData.slug,
                    name: upgradePlanData.display_name,
                };
            }
        }

        return NextResponse.json({
            valid: true,
            coupon: {
                id: coupon.id,
                code: coupon.code,
                description: coupon.description,
                discountType: coupon.discount_type || 'price_override',
                discountValue: coupon.discount_value || 0,
                discountAmount,
                discountLabel,
                planSlug: coupon.plan_slug,
                durationMonths: coupon.duration_months,
                upgradeToPlan: coupon.upgrade_to_plan || null,
            },
            pricing: {
                originalPrice,
                discountAmount,
                finalPrice,
                discountLabel,
            },
            upgradePlan,
        });
    } catch (error) {
        console.error('Coupon validation error:', error);
        return NextResponse.json({
            error: '쿠폰 검증 중 오류가 발생했습니다.',
        }, { status: 500 });
    }
}
