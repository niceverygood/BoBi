// lib/billing/coupon-pricing.ts
//
// 정기결제 갱신 시점에 "이 사용자가 사용 중인 쿠폰을 다시 적용해서" 청구할
// 금액을 결정한다. 첫 결제에서만 쿠폰이 적용되고 두 번째 달부터 정가로
// 청구되던 버그(2026-05-04 이종인 이사 보고)를 막기 위해 도입.
//
// 쿠폰 정보의 출처는 subscriptions.coupon_code 컬럼 — 첫 결제를 만든 PG path
// 들이 동일 코드를 스냅샷으로 저장한다. promo_code_redemptions는 부분
// 입력으로 NULL 위반을 일으키는 케이스가 있어 신뢰원으로 쓰지 않는다.
//
// ⚠️ 무기한 쿠폰 금지 (이종인 5/11):
//    duration_months <= 0 또는 -1 은 더 이상 받지 않는다 (DB CHECK 제약으로 차단).
//    각 사용자별로 redemption.starts_at + duration_months 가 진짜 만료일.
//    promo_codes.expires_at 은 쿠폰 발급 기한이고, redemption 시점이 그 이후이면
//    그 사용자는 그 쿠폰을 못 쓰는 게 정상.

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
        /** 갱신 대상 사용자 ID — redemption.starts_at 조회용 (사용자별 만료일 계산) */
        userId?: string;
    },
): Promise<RenewalPriceResult> {
    const fullPrice = getPlanPrice(args.planSlug, args.billingCycle);

    if (!args.couponCode) {
        return { amount: fullPrice, couponApplied: false, couponCode: null, reason: 'no_coupon' };
    }

    const { data: couponData } = await supabase
        .from('promo_codes')
        .select('id, code, plan_slug, price_override, discount_type, discount_value, duration_months, expires_at, active')
        .eq('code', args.couponCode.toUpperCase().trim())
        .eq('active', true)
        .maybeSingle();
    const coupon = couponData as (PromoCodeRow & { id: string }) | null;

    if (!coupon) {
        return { amount: fullPrice, couponApplied: false, couponCode: args.couponCode, reason: 'coupon_not_found' };
    }
    if (!coupon.active) {
        return { amount: fullPrice, couponApplied: false, couponCode: args.couponCode, reason: 'coupon_inactive' };
    }

    // 쿠폰 자체의 발급 만료 (쿠폰을 새로 쓸 수 있는 기한)
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return { amount: fullPrice, couponApplied: false, couponCode: args.couponCode, reason: 'coupon_expired' };
    }

    // ─── 사용자별 만료일 계산 ───────────────────────────────────────────
    // 이종인 5/11 정책: 무기한 쿠폰 금지. duration_months 는 반드시 양수.
    // redemption.starts_at + duration_months 가 진짜 사용자별 만료일.
    // 갱신 시점(periodStart)이 그 만료일을 넘었으면 쿠폰 적용 안 함 → 정상가.
    //
    // redemption 이 없는 케이스 (legacy 결제, NULL 위반 회피)는 fallback 으로
    // promo_codes.expires_at 만 보고 만료 처리한다.
    if (coupon.duration_months && coupon.duration_months > 0 && args.userId) {
        const { data: redemptionData } = await supabase
            .from('promo_code_redemptions')
            .select('starts_at')
            .eq('promo_code_id', coupon.id)
            .eq('user_id', args.userId)
            .maybeSingle();
        const redemption = redemptionData as { starts_at: string } | null;
        if (redemption?.starts_at) {
            const startsAt = new Date(redemption.starts_at);
            const userExpiry = new Date(startsAt);
            userExpiry.setMonth(userExpiry.getMonth() + coupon.duration_months);
            if (args.periodStart >= userExpiry) {
                return { amount: fullPrice, couponApplied: false, couponCode: args.couponCode, reason: 'coupon_expired' };
            }
        }
    }
    // ────────────────────────────────────────────────────────────────────

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
