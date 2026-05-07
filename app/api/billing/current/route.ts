// app/api/billing/current/route.ts
//
// 사용자가 현재 결제 상태를 즉시 검증할 수 있는 통합 엔드포인트.
// 대시보드 상단 PlanStatusCard·설정 페이지 플랜 카드에서 사용.
//
// 이도경 5/6 1:1 문의 케이스(결제했는데 처리됐는지 모름) 대응 — 활성 구독 + 다음
// 결제일 + 금액 + 수단 + 최근 결제건을 한 번에 반환해 "본인이 active인지" 즉시
// 확인 가능하게 한다.

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PLAN_LIMITS, type PlanSlug } from '@/lib/utils/constants';
import { getPlanPrice } from '@/lib/utils/pricing';

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    try {
        const svc = await createServiceClient();

        // 활성·체험·past_due 구독 중 가장 최근
        const { data: subList } = await svc
            .from('subscriptions')
            .select('*, plan:subscription_plans(slug, display_name, price_monthly, price_yearly)')
            .eq('user_id', user.id)
            .in('status', ['active', 'trialing', 'past_due'])
            .order('updated_at', { ascending: false })
            .limit(1);
        const sub = (subList || [])[0] || null;

        // 최근 결제 1건
        const { data: lastPayment } = await svc
            .from('payment_history')
            .select('payment_id, amount, status, plan_slug, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // 빌링키 (현재 결제 수단 노출용)
        const { data: billingKey } = await svc
            .from('billing_keys')
            .select('provider, created_at, updated_at')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!sub) {
            return NextResponse.json({
                planSlug: 'free' as PlanSlug,
                planName: PLAN_LIMITS.free.name,
                status: 'free',
                nextChargeAmount: null,
                nextChargeDate: null,
                paymentMethod: null,
                cancelAtPeriodEnd: false,
                lastPayment: null,
                isIap: false,
            });
        }

        const planObj = sub.plan as { slug?: string; display_name?: string } | null;
        const planSlug = (planObj?.slug || 'free') as PlanSlug;
        const planName = planObj?.display_name || PLAN_LIMITS[planSlug]?.name || '플랜';
        const provider = sub.payment_provider as string | null;
        const isIap = provider === 'apple_iap' || provider === 'google_play';

        // 다음 결제 금액 — 쿠폰 적용 후 단가 (cron getRenewalPrice와 동일 로직 — 단순화)
        let nextChargeAmount: number | null = null;
        try {
            const cycle = (sub.billing_cycle as 'monthly' | 'yearly') || 'monthly';
            let price = getPlanPrice(planSlug, cycle);

            if (sub.coupon_code) {
                const { data: coupon } = await svc
                    .from('promo_codes')
                    .select('discount_type, discount_value, price_override, plan_slug, active, expires_at')
                    .eq('code', sub.coupon_code)
                    .eq('active', true)
                    .maybeSingle();
                if (coupon && (!coupon.expires_at || new Date(coupon.expires_at) >= new Date())) {
                    const planMatches = !coupon.plan_slug
                        || coupon.plan_slug === 'all'
                        || coupon.plan_slug.split(',').map((s: string) => s.trim()).includes(planSlug);
                    if (planMatches) {
                        if (coupon.discount_type === 'percent') {
                            const pct = Math.min(coupon.discount_value ?? 0, 100);
                            price = Math.max(0, price - Math.round((price * pct) / 100));
                        } else if (coupon.discount_type === 'fixed') {
                            price = Math.max(0, price - (coupon.discount_value ?? 0));
                        } else if (coupon.discount_type === 'price_override' || coupon.price_override !== null) {
                            price = Math.max(0, coupon.price_override ?? price);
                        }
                    }
                }
            }
            nextChargeAmount = price;
        } catch {
            nextChargeAmount = null;
        }

        return NextResponse.json({
            planSlug,
            planName,
            status: sub.status,
            billingCycle: sub.billing_cycle,
            nextChargeAmount: sub.cancel_at_period_end ? 0 : nextChargeAmount,
            nextChargeDate: sub.current_period_end,
            periodStart: sub.current_period_start,
            paymentMethod: provider,
            paymentMethodLabel: providerLabel(provider),
            couponCode: sub.coupon_code || null,
            cancelAtPeriodEnd: !!sub.cancel_at_period_end,
            isIap,
            billingKeyRegistered: !!billingKey,
            lastPayment: lastPayment ? {
                paymentId: lastPayment.payment_id,
                amount: lastPayment.amount,
                status: lastPayment.status,
                createdAt: lastPayment.created_at,
            } : null,
        });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

function providerLabel(p: string | null): string | null {
    if (!p) return null;
    if (p.includes('kakao')) return '카카오페이';
    if (p.includes('toss')) return '토스페이먼츠';
    if (p.includes('inicis')) return 'KG이니시스';
    if (p === 'apple_iap') return 'App Store 인앱결제';
    if (p === 'google_play') return 'Google Play 인앱결제';
    if (p === 'coupon_free') return '쿠폰';
    return p;
}
