// types/future-me.ts

export interface FutureMeRiskSummary {
    category: string;
    percentage: number;
    level: '고위험' | '주의' | '보통';
}

export interface FutureMeScenario {
    type: 'complement' | 'delay' | 'nothing';
    label: string;
    badge: string;
    estimatedTotalCost: number;
    coverageAmount: number;
    selfPayAmount: number;
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
    estimatedTotalCost: number;
    currentCoverage: number;
    coveredAmount: number;
    additionalPremium: number;
    coverageGap: number;
    scenarios: FutureMeScenario[];
    aiSummary: string;
    disclaimer: string;
}
