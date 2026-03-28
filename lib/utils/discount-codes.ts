// lib/utils/discount-codes.ts

export interface DiscountCode {
    code: string;
    description: string;
    planSlug: 'free' | 'basic' | 'pro' | 'team';
    priceOverride: number; // 월 결제 금액 (0 = 무료)
    maxUses: number; // -1 = 무제한
    active: boolean;
    upgradeToPlan?: string; // 업그레이드 대상 플랜 (예: 'pro') — 있으면 해당 플랜으로 구독 생성
}

// 하드코딩된 할인코드 (추후 DB로 이동 가능)
export const DISCOUNT_CODES: Record<string, DiscountCode> = {
    'WONFIN2026': {
        code: 'WONFIN2026',
        description: '원금융서비스 직원 전용 (베이직 월 10,000원)',
        planSlug: 'basic',
        priceOverride: 10000,
        maxUses: -1,
        active: true,
    },
    'JONGIN-FREE': {
        code: 'JONGIN-FREE',
        description: '이종인 팀 무료 사용',
        planSlug: 'pro',
        priceOverride: 0,
        maxUses: -1,
        active: true,
    },
    'BOBI-ALL': {
        code: 'BOBI-ALL',
        description: 'BoBi 종합분석 프로모션 (프로 월 60,000원)',
        planSlug: 'pro',
        priceOverride: 60000,
        maxUses: -1,
        active: true,
    },
    'BOBI-PRO': {
        code: 'BOBI-PRO',
        description: '베이직 가격으로 프로 업그레이드 프로모션',
        planSlug: 'basic',
        priceOverride: 19900,
        maxUses: -1,
        active: true,
        upgradeToPlan: 'pro',
    },
};

export function validateDiscountCode(code: string): DiscountCode | null {
    const upper = code.toUpperCase().trim();
    const discount = DISCOUNT_CODES[upper];
    if (!discount || !discount.active) return null;
    return discount;
}
