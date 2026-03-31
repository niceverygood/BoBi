// lib/utils/discount-codes.ts
// ⛔ 하드코딩 할인코드 — 전체 비활성화
// 모든 쿠폰/할인은 구독 페이지(subscribe)에서 DB 기반으로만 운영

export interface DiscountCode {
    code: string;
    description: string;
    planSlug: 'free' | 'basic' | 'pro' | 'team';
    priceOverride: number; // 월 결제 금액 (0 = 무료)
    maxUses: number; // -1 = 무제한
    active: boolean;
    upgradeToPlan?: string;
}

// 모든 코드 비활성화 — 결제 없이 구독 생성 차단
export const DISCOUNT_CODES: Record<string, DiscountCode> = {
    'WONFIN2026': {
        code: 'WONFIN2026',
        description: '원금융서비스 직원 전용 (비활성)',
        planSlug: 'basic',
        priceOverride: 10000,
        maxUses: -1,
        active: false,
    },
    'JONGIN-FREE': {
        code: 'JONGIN-FREE',
        description: '이종인 팀 (비활성 — 관리자 페이지에서 직접 설정)',
        planSlug: 'pro',
        priceOverride: 0,
        maxUses: -1,
        active: false,
    },
    'BOBI-ALL': {
        code: 'BOBI-ALL',
        description: 'BoBi 종합분석 프로모션 (비활성)',
        planSlug: 'pro',
        priceOverride: 60000,
        maxUses: -1,
        active: false,
    },
    'BOBI-PRO': {
        code: 'BOBI-PRO',
        description: '프로 업그레이드 프로모션 (비활성)',
        planSlug: 'basic',
        priceOverride: 19900,
        maxUses: -1,
        active: false,
        upgradeToPlan: 'pro',
    },
};

// ⛔ 항상 null 반환 — 하드코딩 코드 사용 차단
export function validateDiscountCode(_code: string): DiscountCode | null {
    return null;
}

