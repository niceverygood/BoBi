// lib/billing/coupon-pricing.ts
//
// 정기결제 갱신 시점에 "이 사용자가 사용 중인 쿠폰을 다시 적용해서" 청구할
// 금액을 결정한다. 첫 결제에서만 쿠폰이 적용되고 두 번째 달부터 정가로
// 청구되던 버그(2026-05-04 이종인 이사 보고)를 막기 위해 도입.
//
// 쿠폰 정보의 출처는 subscriptions.coupon_code 컬럼 — 첫 결제를 만든 PG path
// 들이 동일 코드를 스냅샷으로 저장한다. promo_code_redemptions는 부분
// 입력으로 NULL 위반을 일으키는 케이스가 있어 신뢰원으로 쓰지 않는다.

import { getPlanPrice, type BillingCycle } from '@/lib/utils/pricing';

interface PromoCodeRow {
    code: string;
    plan_slug: string | null;
    price_override: number | null;
    discount_type: 'percent' | 'fixed' | 'price_override' | null;
    discount_value: number | null;
    duration_months: number | null;
    expires_at: string | null;
    active: boolean;
}

// Supabase client (createClient/createServiceClient 결과). 정밀 타입을 끌어오면
// 호출 측에서 타입 캐스팅이 필요해 단순화해서 받는다.
type SupabaseLike = {
    from: (table: string) => any;
};

export interface RenewalPriceResult {
    amount: number;
    couponApplied: boolean;
    couponCode: string | null;
    reason: 'no_coupon' | 'coupon_not_found' | 'coupon_inactive' | 'coupon_expired' | 'plan_mismatch' | 'applied';
}

/**
 * 갱신 시 청구할 금액을 결정한다.
 *
 * - couponCode가 비어 있으면 정가
 * - 쿠폰을 찾지 못하거나 비활성/만료/플랜 불일치이면 정가 (쿠폰이 사라져도
 *   사용자에게 갑자기 정가가 청구되지는 않도록 비고: 정가 청구는 의도된
 *   fallback이며 쿠폰 만료가 본 동작이다)
 */
export async function getRenewalPrice(
    supabase: SupabaseLike,
    args: {
        planSlug: string;
        billingCycle: BillingCycle;
        couponCode: string | null | undefined;
        periodStart: Date;
    },
): Promise<RenewalPriceResult> {
    const fullPrice = getPlanPrice(args.planSlug, args.billingCycle);

    if (!args.couponCode) {
        return { amount: fullPrice, couponApplied: false, couponCode: null, reason: 'no_coupon' };
    }

    const { data: couponData } = await supabase
        .from('promo_codes')
        .select('code, plan_slug, price_override, discount_type, discount_value, duration_months, expires_at, active')
        .eq('code', args.couponCode.toUpperCase().trim())
        .eq('active', true)
        .maybeSingle();
    const coupon = couponData as PromoCodeRow | null;

    if (!coupon) {
        return { amount: fullPrice, couponApplied: false, couponCode: args.couponCode, reason: 'coupon_not_found' };
    }
    if (!coupon.active) {
        return { amount: fullPrice, couponApplied: false, couponCode: args.couponCode, reason: 'coupon_inactive' };
    }

    // 쿠폰 자체의 만료
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return { amount: fullPrice, couponApplied: false, couponCode: args.couponCode, reason: 'coupon_expired' };
    }

    // duration_months 체크: -1이면 무기한, 그 외엔 첫 적용일로부터 N개월간만 유효.
    // 첫 적용일은 정확히 알기 어렵지만 갱신 cron 입장에선 periodStart가 다음
    // 주기의 시작이므로, "이번 주기가 시작될 때 쿠폰의 사용자별 만료일을 넘겼는가"를
    // 보고 적용 여부를 결정한다. 사용자별 만료일은 redemptions에 저장되지만
    // 누락된 사례가 있어 promo_codes 자체의 expires_at만 본다.
    // 무기한(-1)이면 항상 적용, 양수 N이면 promo_codes.expires_at에 의존.

    if (coupon.plan_slug && coupon.plan_slug !== 'all') {
        const couponPlans = coupon.plan_slug.split(',').map((s) => s.trim());
        if (!couponPlans.includes(args.planSlug) && !couponPlans.includes('all')) {
            return { amount: fullPrice, couponApplied: false, couponCode: args.couponCode, reason: 'plan_mismatch' };
        }
    }

    let amount = fullPrice;
    if (coupon.discount_type === 'percent') {
        const percent = Math.min(coupon.discount_value ?? 0, 100);
        amount = Math.max(0, fullPrice - Math.round((fullPrice * percent) / 100));
    } else if (coupon.discount_type === 'fixed') {
        amount = Math.max(0, fullPrice - (coupon.discount_value ?? 0));
    } else if (coupon.discount_type === 'price_override' || coupon.price_override !== null) {
        amount = Math.max(0, coupon.price_override ?? fullPrice);
    }

    return { amount, couponApplied: true, couponCode: coupon.code, reason: 'applied' };
}
