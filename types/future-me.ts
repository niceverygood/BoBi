// types/future-me.ts

/** 병원비/보장을 세분화하는 3대 카테고리 */
export type DiseaseCategory = 'cancer' | 'brain' | 'cardio';

export const DISEASE_CATEGORIES: DiseaseCategory[] = ['cancer', 'brain', 'cardio'];

export const DISEASE_CATEGORY_LABELS: Record<DiseaseCategory, string> = {
    cancer: '암',
    brain: '뇌혈관',
    cardio: '심혈관',
};

/** 카테고리별 금액 (만원 단위 정수) */
export interface CategoryAmount {
    cancer: number;
    brain: number;
    cardio: number;
}

export function sumCategory(a: CategoryAmount): number {
    return (a.cancer || 0) + (a.brain || 0) + (a.cardio || 0);
}

export interface FutureMeRiskSummary {
    category: string;
    percentage: number;
    level: '고위험' | '주의' | '보통';
}

export interface FutureMeScenario {
    type: 'complement' | 'delay' | 'nothing';
    label: string;
    badge: string;
    /** 예상 총 병원비 (합계, 만원) — 하위 호환용 */
    estimatedTotalCost: number;
    /** 예상 총 병원비 카테고리별 (암/뇌혈관/심혈관) */
    estimatedCostByCategory: CategoryAmount;
    /** 보장되는 금액 (합계) — 하위 호환 */
    coverageAmount: number;
    /** 보장되는 금액 카테고리별 */
    coverageByCategory: CategoryAmount;
    /** 자기부담금 (합계) — 하위 호환 */
    selfPayAmount: number;
    /** 자기부담금 카테고리별 */
    selfPayByCategory: CategoryAmount;
    rejectionRisk?: string;
    premiumNote?: string;
    details: string;
}

export interface FutureMeResult {
    generatedAt: string;
    customerName: string;
    customerAge: number;
    gender: string;
    riskSummary: FutureMeRiskSummary[];

    /** 예상 총 병원비 합계 (하위 호환) */
    estimatedTotalCost: number;
    /** 예상 총 병원비 카테고리별 */
    estimatedCostByCategory: CategoryAmount;

    /** 현재 보장 추정액 (합계) — 하위 호환 */
    currentCoverage: number;
    /** 현재 보장 추정액 카테고리별 */
    currentCoverageByCategory: CategoryAmount;

    /** 설계사 입력 — 설계 보험금 (합계) */
    coveredAmount: number;
    /** 설계사 입력 — 설계 보험금 카테고리별 (암/뇌혈관/심혈관) */
    coveredAmountByCategory: CategoryAmount;

    /** 추가 필요 월 보험료 (만원) */
    additionalPremium: number;

    /** 현재 보장 공백 (합계) */
    coverageGap: number;
    /** 현재 보장 공백 카테고리별 */
    coverageGapByCategory: CategoryAmount;

    scenarios: FutureMeScenario[];
    aiSummary: string;
    disclaimer: string;
}
