// lib/utils/pricing.ts
//
// 결제 금액의 단일 진실 공급원(Single Source of Truth).
// DB의 subscription_plans.price_monthly / price_yearly 대신 이 함수를 사용.
//
// 배경:
//   DB와 코드 상수가 각각 가격을 보관해 두 출처가 어긋나면 화면 표시값과
//   실제 청구액이 달라지는 사고 발생 (2026-04-23). DB는 git PR 리뷰를 거치지
//   않으므로 가격은 반드시 코드(PLAN_LIMITS)에서만 읽는다.
//
// 사용처: 카카오페이/토스/이니시스/Billing API, 갱신·체험 종료 크론 등
// "실제 청구 금액"을 계산하는 모든 지점.

import { PLAN_LIMITS, type PlanSlug } from './constants';

export type BillingCycle = 'monthly' | 'yearly';

export class UnknownPlanError extends Error {
    constructor(slug: string) {
        super(`Unknown plan slug: ${slug}`);
        this.name = 'UnknownPlanError';
    }
}

/**
 * 플랜 slug와 결제 주기로 정가를 반환. 쿠폰 할인은 호출자가 별도 적용.
 * 모르는 slug면 즉시 throw — 결제 금액 계산은 애매함을 허용하지 않는다.
 */
export function getPlanPrice(slug: string, cycle: BillingCycle): number {
    const info = PLAN_LIMITS[slug as PlanSlug];
    if (!info) throw new UnknownPlanError(slug);
    return cycle === 'yearly' ? info.priceYearly : info.priceMonthly;
}
