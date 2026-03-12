// lib/utils/discount-codes.ts

export interface DiscountCode {
    code: string;
    description: string;
    planSlug: 'free' | 'basic' | 'pro' | 'team';
    priceOverride: number; // 월 결제 금액 (0 = 무료)
    maxUses: number; // -1 = 무제한
    active: boolean;
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
};

export function validateDiscountCode(code: string): DiscountCode | null {
    const upper = code.toUpperCase().trim();
    const discount = DISCOUNT_CODES[upper];
    if (!discount || !discount.active) return null;
    return discount;
}
